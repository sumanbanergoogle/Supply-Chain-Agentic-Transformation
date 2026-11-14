"""Unit and API tests for ITC TM&D BeatPulse AI backend."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("BEATPULSE_AGENT_LLM", "fake")
os.environ.setdefault("BEATPULSE_LIVE_OFFLINE", "1")

from app.main import app  # noqa: E402
from app.analytics.ml_engine import get_engine  # noqa: E402
from app.agent.ui_control import validate_ui_command  # noqa: E402


def test_dataset_and_cities_integrity():
    eng = get_engine()
    assert len(eng.outlets) == 108
    cities = set(eng.outlets["city"].unique())
    assert cities == {"Bangalore", "Hyderabad", "Chennai"}
    for city in ("Bangalore", "Hyderabad", "Chennai"):
        assert len(eng.outlets[eng.outlets["city"] == city]) == 36


def test_ml_attribution_and_nba():
    eng = get_engine()
    crit = eng.outlets[eng.outlets["health_status"] == "critical"].iloc[0]["outlet_id"]
    attr = eng.attribute_leakage(crit)
    assert attr["outlet_id"] == crit
    assert abs(sum(f["share_pct"] for f in attr["factors"]) - 100.0) <= 0.6
    assert 0.0 <= attr["churn_prob"] <= 1.0
    assert 0.0 <= attr["gnn_spillover_risk"] <= 1.0

    nba = eng.recommend_nba(crit, top_k=3)
    assert len(nba["recommendations"]) == 3
    assert len(nba["similar_analogs"]) >= 1

    cf = eng.compare_counterfactual(crit)
    assert len(cf["rows"]) >= 5


def test_rest_endpoints():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["total_outlets"] == 108

    r_cmp = client.get("/api/cities/compare")
    assert r_cmp.status_code == 200
    assert {c["city"] for c in r_cmp.json()["cities"]} == {"Bangalore", "Hyderabad", "Chennai"}

    r_blr = client.get("/api/outlets?city=Bangalore")
    assert r_blr.status_code == 200
    assert len(r_blr.json()) == 36
    first_id = r_blr.json()[0]["outlet_id"]

    assert client.get(f"/api/outlets/{first_id}").status_code == 200
    assert client.get(f"/api/outlets/{first_id}/history").status_code == 200
    assert client.get(f"/api/outlets/{first_id}/report").status_code == 200

    r_sim = client.post("/api/beats/BLR-B02/simulate")
    assert r_sim.status_code == 200
    sim = r_sim.json()
    assert sim["after"]["distance_km"] < sim["before"]["distance_km"]
    assert sim["after"]["projected_monthly_recovery_inr"] > 0

    r_chat = client.post("/api/chat", json={"message": "Compare Bangalore, Hyderabad and Chennai", "language": "english"})
    assert r_chat.status_code == 200
    assert "Bangalore" in r_chat.json()["response"]


def test_ui_control_validation():
    res = validate_ui_command("focus_city", "bengaluru")
    assert res["status"] == "OK"
    assert res["command"]["value"] == "Bangalore"
    err = validate_ui_command("drop_database", "now")
    assert err["status"] == "ERROR"


def test_ws_live_fallback_and_prompt():
    client = TestClient(app)
    with client.websocket_connect("/ws/live?city=Bangalore&language=english") as ws:
        status_msg = ws.receive_json()
        assert status_msg["type"] == "status"
        voice_state = ws.receive_json()
        assert voice_state["type"] == "voice_state"

        ws.send_json({"type": "prompt", "text": "Diagnose BLR-104", "ui_state": {"city": "Bangalore"}})
        seen_types = []
        for _ in range(10):
            msg = ws.receive_json()
            seen_types.append(msg["type"])
            if msg["type"] == "voice_state" and msg["state"] == "idle":
                break
        assert "fallback_reply" in seen_types
        assert "turn_complete" in seen_types


def test_ws_live_mock_vertex_session():
    class FakePart:
        def __init__(self, text=None, inline=None):
            self.text = text
            self.inline_data = inline

    class FakeResp:
        def __init__(self, ot=None, tc_done=False):
            self.session_resumption_update = None
            self.go_away = None
            self.tool_call = None
            self.server_content = type(
                "SC",
                (),
                {
                    "interrupted": False,
                    "input_transcription": None,
                    "output_transcription": type("OT", (), {"text": ot})() if ot else None,
                    "model_turn": None,
                    "turn_complete": tc_done,
                },
            )()

    class FakeSession:
        async def send_client_content(self, **_kwargs):
            return None

        async def send_realtime_input(self, **_kwargs):
            return None

        async def send_tool_response(self, **_kwargs):
            return None

        async def receive(self):
            yield FakeResp(ot="Bangalore has ", tc_done=False)
            yield FakeResp(ot="zero-billing alerts.", tc_done=True)

    @asynccontextmanager
    async def fake_factory(_model, _config):
        yield FakeSession()

    old_offline = os.environ.get("BEATPULSE_LIVE_OFFLINE")
    os.environ["BEATPULSE_LIVE_OFFLINE"] = "0"
    app.state.live_connect_factory = fake_factory
    try:
        client = TestClient(app)
        with client.websocket_connect("/ws/live?city=Bangalore") as ws:
            connecting = ws.receive_json()
            assert connecting["status"] == "connecting"
            connected = ws.receive_json()
            assert connected["status"] == "connected"
            cap1 = ws.receive_json()
            assert cap1["type"] == "caption_delta"
    finally:
        app.state.live_connect_factory = None
        if old_offline is not None:
            os.environ["BEATPULSE_LIVE_OFFLINE"] = old_offline
