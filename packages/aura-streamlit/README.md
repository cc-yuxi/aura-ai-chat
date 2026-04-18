# aura-streamlit

`aura-streamlit` packages Aura AI Chat as a Streamlit custom component so Python
apps can render the Aura browser UI without needing a separate frontend project.

## Install

```bash
pip install aura-streamlit
```

## Usage

```python
import aura_streamlit as aura_st

config = {
    "identity": {
        "appMetadata": {
            "appId": "streamlit-demo",
            "teamId": "aura",
            "userId": "demo-user",
        },
        "aiName": "Aura",
    },
    "appearance": {
        "theme": "professional-light",
        "headerTitle": "Aura In Streamlit",
    },
    "agent": {
        "enableStreaming": True,
        "providers": [
            {
                "type": "built-in",
                "id": "gitHubCopilot",
                "config": {
                    "rememberToken": True,
                },
            }
        ],
    },
}

aura_st.aura_chat(config, key="aura", height=760)
```

## Notes

- The Streamlit wrapper accepts JSON-serializable Aura config only.
- Browser-side Aura features work as expected, including built-in providers and
  MCP server definitions that can be expressed as plain JSON.
- Python callables cannot be passed directly into the browser iframe, so custom
  JavaScript providers, tools, or conversation managers need a browser-side
  bridge if you want to expose them through Streamlit.
