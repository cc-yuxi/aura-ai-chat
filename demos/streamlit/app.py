from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import streamlit as st

REPO_ROOT = Path(__file__).resolve().parents[2]
AURA_STREAMLIT_SRC = REPO_ROOT / "packages" / "aura-streamlit" / "src"

if str(AURA_STREAMLIT_SRC) not in sys.path:
    sys.path.insert(0, str(AURA_STREAMLIT_SRC))

import aura_streamlit as aura_st

st.set_page_config(
    page_title="Aura Streamlit Demo",
    page_icon="AI",
    layout="wide",
    initial_sidebar_state="expanded",
)

PANEL_SNAPSHOTS = [
    {
        "title": "Revenue Growth",
        "metric": "+18.4%",
        "detail": "Enterprise plan upgrades accelerated after the spring launch.",
    },
    {
        "title": "Retention Risk",
        "metric": "4.7%",
        "detail": "Churn pressure is concentrated in self-serve accounts below 10 seats.",
    },
    {
        "title": "Pipeline Coverage",
        "metric": "3.2x",
        "detail": "Coverage is healthy, but late-stage deals are clustered in one region.",
    },
    {
        "title": "Support Backlog",
        "metric": "29 tickets",
        "detail": "Average first response time improved, though API onboarding still lags.",
    },
]

DEFAULT_EVENT_TYPES = [
    "message-sent",
    "message-received",
    "agent-loop-started",
    "agent-loop-completed",
    "error",
]
PROXY_ORIGIN = os.environ.get("AURA_STREAMLIT_PROXY_ORIGIN", "http://127.0.0.1:8765")


def build_system_prompt(app_name: str) -> str:
    dashboard_lines = "\n".join(
        f"- {panel['title']}: {panel['metric']} ({panel['detail']})"
        for panel in PANEL_SNAPSHOTS
    )

    return (
        f"You are Aura, the analytics copilot for the {app_name} Streamlit demo.\n"
        "You are helping users interpret a dashboard snapshot embedded in the host app.\n"
        "Ground your answers in the dashboard details below, and be explicit when making"
        " recommendations.\n"
        "This demo is read-only: explain insights and next steps, but do not claim to edit"
        " the dashboard.\n"
        f"Dashboard snapshot:\n{dashboard_lines}"
    )


def build_config(
    *,
    app_name: str,
    ai_name: str,
    theme: str,
    show_thinking: bool,
) -> dict[str, Any]:
    return {
        "identity": {
            "appMetadata": {
                "appId": "streamlit-host-demo",
                "teamId": "host-demos",
                "tenantId": "local-dev",
                "userId": "demo-user",
            },
            "aiName": ai_name,
        },
        "appearance": {
            "theme": theme,
            "headerTitle": f"{ai_name} Copilot",
            "headerIcon": "insights",
            "welcomeMessageTitle": "Streamlit Host Demo",
            "welcomeMessage": (
                "Ask for a dashboard summary, a recommendation, or an executive recap"
                " based on the current KPI snapshot."
            ),
            "inputPlaceholder": f"Ask {ai_name} about this dashboard...",
            "showCloseButton": False,
            "suggestedPrompts": [
                {
                    "title": "Summarize the dashboard",
                    "promptText": "Summarize the current dashboard in plain English.",
                },
                {
                    "title": "Spot the weak area",
                    "promptText": (
                        "Which metric looks weakest right now, and what follow-up question"
                        " should I ask next?"
                    ),
                },
                {
                    "title": "Executive recap",
                    "promptText": (
                        "Turn this dashboard into a short executive update with one insight"
                        " and one risk."
                    ),
                },
            ],
        },
        "agent": {
            "providers": [
                {
                    "type": "built-in",
                    "id": "gitHubCopilot",
                    "config": {
                        "rememberToken": True,
                        "includedModels": ["gpt", "claude"],
                        "excludedModels": ["gpt-4"],
                        "githubDeviceCodeUrl": f"{PROXY_ORIGIN}/github/login/device/code",
                        "githubAccessTokenUrl": (
                            f"{PROXY_ORIGIN}/github/login/oauth/access_token"
                        ),
                        "copilotTokenUrl": (
                            f"{PROXY_ORIGIN}/github-api/copilot_internal/v2/token"
                        ),
                        "copilotChatUrl": (
                            f"{PROXY_ORIGIN}/github-copilot-api/chat/completions"
                        ),
                        "copilotModelsUrl": f"{PROXY_ORIGIN}/github-copilot-api/models",
                        "copilotIndividualModelsUrl": (
                            f"{PROXY_ORIGIN}/github-copilot-individual-api/models"
                        ),
                    },
                },
            ],
            "appSystemPrompt": build_system_prompt(app_name),
            "additionalSafetyInstructions": (
                "If the user asks you to edit the host app, explain that this Streamlit demo"
                " only supports analysis and recommendations."
            ),
            "enableStreaming": True,
            "maxContextTokens": 4096,
            "maxIterations": 6,
            "showThinkingProcess": show_thinking,
            "toolTimeout": 30000,
            "confirmationTimeoutMs": 65000,
            "enableWebMcp": False,
        },
    }


def append_event(event_result: dict[str, Any] | None) -> None:
    if not event_result:
        return

    sequence = event_result.get("sequence")
    if sequence == st.session_state.get("last_event_sequence"):
        return

    st.session_state["last_event_sequence"] = sequence
    log = st.session_state.setdefault("event_log", [])
    log.append(event_result)
    st.session_state["event_log"] = log[-20:]


if "event_log" not in st.session_state:
    st.session_state["event_log"] = []
if "last_event_sequence" not in st.session_state:
    st.session_state["last_event_sequence"] = None

st.title("Aura AI Chat x Streamlit")
st.caption(
    "This demo shows the `aura-streamlit` wrapper running Aura as a Streamlit"
    " custom component with host-side controls and event capture."
)

with st.sidebar:
    st.header("Host Controls")
    app_name = st.text_input("App Name", value="Revenue Command Center")
    ai_name = st.text_input("AI Name", value="Aura")
    theme = st.selectbox(
        "Theme",
        options=["professional-light", "light", "dark", "auto"],
        index=0,
    )
    show_thinking = st.toggle("Show Thinking Process", value=True)
    capture_events = st.multiselect(
        "Event Types To Capture",
        options=DEFAULT_EVENT_TYPES,
        default=DEFAULT_EVENT_TYPES[:3],
    )
    component_height = st.slider("Chat Height", min_value=560, max_value=920, value=760)

config = build_config(
    app_name=app_name,
    ai_name=ai_name,
    theme=theme,
    show_thinking=show_thinking,
)

left, right = st.columns([1.55, 1], gap="large")

with left:
    event_result = aura_st.aura_chat(
        config,
        key="aura-streamlit-demo",
        height=component_height,
        event_types=capture_events,
    )
    append_event(event_result)

with right:
    st.subheader("Dashboard Snapshot")
    for panel in PANEL_SNAPSHOTS:
        with st.container(border=True):
            st.markdown(f"**{panel['title']}**")
            st.write(panel["metric"])
            st.caption(panel["detail"])

    st.subheader("Aura Event Log")
    if st.session_state["event_log"]:
        for item in reversed(st.session_state["event_log"]):
            event = item.get("event", {})
            event_type = event.get("type", "unknown")
            payload = event.get("payload", {})
            with st.container(border=True):
                st.markdown(f"**{event_type}**")
                if payload:
                    st.code(json.dumps(payload, indent=2), language="json")
                else:
                    st.caption("No payload")
    else:
        st.info("Captured Aura events will appear here.")

with st.expander("Current Aura Config", expanded=False):
    st.code(json.dumps(config, indent=2), language="json")

with st.expander("Wrapper Notes", expanded=False):
    st.markdown(
        "- This Streamlit wrapper supports the JSON-serializable subset of `AuraConfig`.\n"
        "- Browser-side function hooks such as custom tools or conversation managers are not"
        " passed from Python in this demo.\n"
        f"- The demo starts a local GitHub Copilot proxy at `{PROXY_ORIGIN}` so the built-in"
        " provider can use the same routes as the Vite demos.\n"
        "- Start the demo with `pnpm run demo streamlit` or from this folder with"
        " `python run_demo.py`."
    )
