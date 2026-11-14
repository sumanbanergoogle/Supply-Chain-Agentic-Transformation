"""Unit, Storyboard E2E, and WebSocket tests for ITC TM&D BeatPulse AI."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi.testclient import TestClient

os.environ.setdefault("BEATPULSE_AGENT_LLM", "fake")
os.environ.setdefault("BEATPULSE_LIVE_OFFLINE", "1")

from app.main import app  # noqa: E402
from app.analytics.generator import generate_dataset  # noqa: E402
from app.analytics.ml_engine import get_engine  # noqa: E402
from app.agent.ui_control import validate_ui_command  # noqa: E402


def test_dataset_and_cities_integrity():
    generate_dataset()
    get_engine.cache_clear()
    eng = get_engine()
    assert len(eng.outlets) >= 108
    cities = set(eng.outlets["city"].unique())
    assert cities == {"Bangalore", "Hyderabad", "Chennai"}
    assert "BLR-701" in set(eng.outlets["outlet_id"])
    assert {"BLR-B04", "BLR-B07"}.issubset(set(eng.outlets["beat_id"]))


def test_storyboard_5_steps_end_to_end():
    client = TestClient(app)

    # Step 1: Macro Q3 GT Health for Bangalore
    r1 = client.post("/api/chat", json={"message": "Pull up Q3 General Trade health for Bangalore Metro"})
    assert r1.status_code == 200
    assert "Bangalore" in r1.json()["response"] or "Bengaluru" in r1.json()["response"]

    # Step 2: Beat 4 vs Beat 7 Planned vs Actual GPS Reality Check
    r2 = client.post("/api/chat", json={"message": "Zoom into Beat 4 and Beat 7 and compare salesman visits"})
    assert r2.status_code == 200
    assert "BLR-B04" in r2.json()["response"]

    # Step 3: ML/DL Root-Cause on Beat 7 (44% Fill-Rate, 31% Q-Com, 25% Assortment)
    r3 = client.post("/api/chat", json={"message": "Run ML/DL root-cause diagnostic models on Beat 7"})
    assert r3.status_code == 200
    assert "44%" in r3.json()["response"] and "31%" in r3.json()["response"] and "25%" in r3.json()["response"]

    # Step 4: Multimodal Storefront Inspection on Lakshmi Super Mart (BLR-701)
    r4 = client.post("/api/chat", json={"message": "Why is Lakshmi Super Mart only buying 2 categories?"})
    assert r4.status_code == 200
    assert "BLR-701" in r4.json()["response"]
    assert client.get("/api/outlets/BLR-701").status_code == 200

    # Step 5: Simulate fixing Beat 4 route and Beat 7 SKU push + ASM Dispatch
    r5 = client.post("/api/chat", json={"message": "Simulate fixing Beat 4 route and Beat 7 SKU push"})
    assert r5.status_code == 200
    assert "18.5L" in r5.json()["response"] and "32" in r5.json()["response"]

    r5b = client.post("/api/beats/BLR-B04/dispatch", json={"note": "Storyboard Step 5"})
    assert r5b.status_code == 200
    assert r5b.json()["ticket_id"].startswith("ASM-BLR-B04")


def test_ml_attribution_and_nba():
    eng = get_engine()
    attr = eng.attribute_leakage("BLR-701")
    assert abs(sum(f["share_pct"] for f in attr["factors"]) - 100.0) <= 0.6
    nba = eng.recommend_nba("BLR-701", top_k=3)
    assert len(nba["recommendations"]) == 3
    cf = eng.compare_counterfactual("BLR-701")
    assert len(cf["rows"]) >= 5


def test_rest_endpoints():
    client = TestClient(app)
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/cities/compare").status_code == 200
    assert client.get("/api/beats/BLR-B07/diagnose").status_code == 200
    assert client.post("/api/beats/BLR-B04/simulate").status_code == 200
    assert client.get("/api/outlets/BLR-701/report").status_code == 200
    assert len(client.get("/api/tools/declarations").json()["declarations"]) >= 12
    assert client.post("/api/tools/execute", json={"name": "get_distributor_performance", "args": {"city": "Hyderabad"}}).status_code == 200
    assert client.post("/api/tools/execute", json={"name": "get_sku_category_breakdown", "args": {"city": "Chennai"}}).status_code == 200


def test_ui_control_validation():
    res = validate_ui_command("focus_city", "bengaluru")
    assert res["status"] == "OK"
    assert res["command"]["value"] == "Bangalore"
    assert validate_ui_command("drop_database", "now")["status"] == "ERROR"


def test_ws_live_fallback_and_prompt():
    client = TestClient(app)
    with client.websocket_connect("/ws/live?city=Bangalore&language=english") as ws:
        assert ws.receive_json()["type"] == "status"
        assert ws.receive_json()["type"] == "voice_state"
        ws.send_json({"type": "prompt", "text": "Why is Lakshmi Super Mart only buying 2 categories?", "ui_state": {"city": "Bangalore"}})
        seen = []
        for _ in range(10):
            m = ws.receive_json()
            seen.append(m["type"])
            if m["type"] == "voice_state" and m["state"] == "idle":
                break
        assert "fallback_reply" in seen
        assert "turn_complete" in seen


def test_ws_live_mock_vertex_session():
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
            yield FakeResp(ot="Beat 7 SHAP: ", tc_done=False)
            yield FakeResp(ot="44% Fill-Rate Gap.", tc_done=True)

    @asynccontextmanager
    async def fake_factory(_model, _config):
        yield FakeSession()

    old_offline = os.environ.get("BEATPULSE_LIVE_OFFLINE")
    os.environ["BEATPULSE_LIVE_OFFLINE"] = "0"
    app.state.live_connect_factory = fake_factory
    try:
        client = TestClient(app)
        with client.websocket_connect("/ws/live?city=Bangalore") as ws:
            assert ws.receive_json()["status"] == "connecting"
            assert ws.receive_json()["status"] == "connected"
            assert ws.receive_json()["type"] == "caption_delta"
    finally:
        app.state.live_connect_factory = None
        if old_offline is not None:
            os.environ["BEATPULSE_LIVE_OFFLINE"] = old_offline
