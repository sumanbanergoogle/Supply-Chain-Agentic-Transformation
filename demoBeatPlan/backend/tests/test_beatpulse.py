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
from app.agent import rbac  # noqa: E402
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
    assert "sbu_line" in eng.outlets.columns
    assert "zero_billing_type" in eng.outlets.columns
    k = eng.kpis("ALL")
    assert 0.0 < k["eco_pct"] <= 100.0
    assert 0.0 < k["strike_rate_pct"] <= 100.0
    assert k["avg_drop_size_inr"] > 0
    # RBAC hierarchy & aliases
    assert rbac.normalize_persona("VP_TMD") == "TMD_HEAD"
    so_caps = rbac.capabilities_for("AREA_EXEC_SO")
    assert "city.compare" not in so_caps["capabilities"]
    assert "asm.dispatch" not in so_caps["capabilities"]
    # Realistic metro GT zero-billing rate (not >25% catastrophic failure)
    zero_billing_pct = 100.0 * (eng.outlets["health_status"] == "critical").mean()
    assert 5.0 <= zero_billing_pct <= 22.0
    # Actively billing store (zero_bill_weeks == 0) must not predict ~100% dormancy churn
    lakshmi = eng._outlet_index["BLR-701"]
    assert lakshmi["zero_bill_weeks"] == 0
    assert lakshmi["churn_prob"] < 0.35


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

    # Step 5: Simulate fixing Beat 4 route (bounded by actual beat outlets and leakage) + ASM Dispatch
    sim = client.post("/api/beats/BLR-B04/simulate").json()
    beat_outlets = [o for o in client.get("/api/outlets?beat=BLR-B04").json()]
    assert 1 <= sim["after"]["reactivated_zero_billing_outlets"] <= len(beat_outlets)
    assert 0 < sim["after"]["projected_monthly_recovery_inr"] <= sim["before"]["monthly_leakage_inr"]

    r5 = client.post("/api/chat", json={"message": "Simulate fixing Beat 4 route and Beat 7 SKU push"})
    assert r5.status_code == 200
    assert "BLR-B04" in r5.json()["response"] and "reactivated" in r5.json()["response"]

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


def test_ws_live_idle_inactivity_transparently_resumes():
    class IdleOnceSession:
        def __init__(self, fail_idle: bool):
            self.fail_idle = fail_idle

        async def send_client_content(self, **_kwargs):
            return None

        async def send_realtime_input(self, **_kwargs):
            return None

        async def send_tool_response(self, **_kwargs):
            return None

        async def receive(self):
            if self.fail_idle:
                raise RuntimeError("1008 None. Session closed due to client inactivity.")
            yield type(
                "Resp",
                (),
                {
                    "session_resumption_update": None,
                    "go_away": None,
                    "tool_call": None,
                    "server_content": type(
                        "SC",
                        (),
                        {
                            "interrupted": False,
                            "input_transcription": None,
                            "output_transcription": type("OT", (), {"text": "Resumed cleanly."})(),
                            "model_turn": None,
                            "turn_complete": True,
                        },
                    )(),
                },
            )()

    attempts = {"n": 0}

    @asynccontextmanager
    async def flaky_idle_factory(_model, _config):
        attempts["n"] += 1
        yield IdleOnceSession(fail_idle=(attempts["n"] == 1))

    old_offline = os.environ.get("BEATPULSE_LIVE_OFFLINE")
    os.environ["BEATPULSE_LIVE_OFFLINE"] = "0"
    app.state.live_connect_factory = flaky_idle_factory
    try:
        client = TestClient(app)
        with client.websocket_connect("/ws/live?city=Bangalore") as ws:
            assert ws.receive_json()["status"] == "connecting"
            assert ws.receive_json()["status"] == "connected"
            m_resumed = ws.receive_json()
            assert m_resumed["status"] == "resumed"
            m_cap = ws.receive_json()
            assert m_cap["type"] == "caption_delta"
            assert m_cap["text"] == "Resumed cleanly."
    finally:
        app.state.live_connect_factory = None
        if old_offline is not None:
            os.environ["BEATPULSE_LIVE_OFFLINE"] = old_offline


def test_ws_live_interrupt_stops_agent_speaking():
    import asyncio

    class StreamingSession:
        async def send_client_content(self, **_kwargs):
            return None

        async def send_realtime_input(self, **_kwargs):
            return None

        async def send_tool_response(self, **_kwargs):
            return None

        async def receive(self):
            yield type(
                "Resp",
                (),
                {
                    "session_resumption_update": None,
                    "go_away": None,
                    "tool_call": None,
                    "server_content": type(
                        "SC",
                        (),
                        {
                            "interrupted": False,
                            "input_transcription": None,
                            "output_transcription": type("OT", (), {"text": "First chunk"})(),
                            "model_turn": None,
                            "turn_complete": False,
                        },
                    )(),
                },
            )()
            await asyncio.sleep(0.25)
            yield type(
                "Resp",
                (),
                {
                    "session_resumption_update": None,
                    "go_away": None,
                    "tool_call": None,
                    "server_content": type(
                        "SC",
                        (),
                        {
                            "interrupted": False,
                            "input_transcription": None,
                            "output_transcription": type("OT", (), {"text": "Suppressed trailing chunk"})(),
                            "model_turn": None,
                            "turn_complete": True,
                        },
                    )(),
                },
            )()

    @asynccontextmanager
    async def streaming_factory(_model, _config):
        yield StreamingSession()

    old_offline = os.environ.get("BEATPULSE_LIVE_OFFLINE")
    os.environ["BEATPULSE_LIVE_OFFLINE"] = "0"
    app.state.live_connect_factory = streaming_factory
    try:
        client = TestClient(app)
        with client.websocket_connect("/ws/live?city=Bangalore") as ws:
            assert ws.receive_json()["status"] == "connecting"
            assert ws.receive_json()["status"] == "connected"
            first = ws.receive_json()
            assert first["type"] == "caption_delta"
            assert first["text"] == "First chunk"
            ws.send_json({"type": "interrupt"})
            seen = []
            for _ in range(5):
                m = ws.receive_json()
                seen.append(m)
                if m.get("type") == "voice_state" and m.get("state") == "idle":
                    break
            assert any(m.get("type") == "interrupted" for m in seen)
            assert not any(m.get("text") == "Suppressed trailing chunk" for m in seen)
    finally:
        app.state.live_connect_factory = None
        if old_offline is not None:
            os.environ["BEATPULSE_LIVE_OFFLINE"] = old_offline
