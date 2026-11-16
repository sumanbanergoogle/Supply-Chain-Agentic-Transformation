// Live Gemini Enterprise Agent Registry (Demand Sensing Agent test link)
window.SC_LIVE_AGENTS = [
  {
    "id": "demand_sensing_agent",
    "name": "Demand Sensing Agent",
    "geDisplayName": "Demand Sensing Agent",
    "isItcTmd": false,
    "pillar": "Planning & Strategy",
    "persona": "Supply Chain Lead",
    "buildMode": "Google ADK + Agent Engine",
    "model": "gemini-3.1-pro-preview",
    "annualValueCr": 8.5,
    "outcome": "Fuses daily POS sell-through, weather ensembles, and stockout imputation to cut short-horizon WAPE by 20%–35% and reduce safety-stock buffers.",
    "geUrl": "https://vertexaisearch.cloud.google.com/home/cid/47d2d150-f788-4afc-af12-df8dd05ed34a/r/agent/4275760174019143309/session/-?mods=",
    "videoSrc": "assets/media/video/demand_sensing_demo.mp4",
    "starterPrompts": [
      "Compare our baseline plan against constrained options in demand forecasting this week and recommend where to adjust for best margin and service."
    ],
    "samplePrompt": "Compare our baseline plan against constrained options in demand forecasting this week and recommend where to adjust for best margin and service."
  }
];
window.SC_LIVE_AGENT_MAP = { "demand sensing agent": window.SC_LIVE_AGENTS[0] };
