"""Streamlit component entrypoint for Aura AI Chat."""

from __future__ import annotations

import os
from pathlib import Path
from textwrap import dedent
from typing import Any, Mapping, Sequence

import streamlit.components.v1 as components

_COMPONENT_NAME = "aura_streamlit"
_FRONTEND_DIR = Path(__file__).resolve().parent / "frontend"
_DEV_SERVER_URL = os.environ.get("AURA_STREAMLIT_DEV_SERVER_URL")
_component: Any | None = None


def _get_component() -> Any:
    global _component

    if _component is None:
        index_file = _FRONTEND_DIR / "index.html"
        if not _DEV_SERVER_URL and not index_file.exists():
            raise FileNotFoundError(
                dedent(
                    f"""
                    aura-streamlit frontend assets were not found at:
                    {index_file}

                    Build the frontend before using the component:
                      pnpm --filter aura-streamlit run build

                    If you are developing the frontend separately, set
                    AURA_STREAMLIT_DEV_SERVER_URL to the local dev server URL.
                    """
                ).strip()
            )

        _component = (
            components.declare_component(_COMPONENT_NAME, url=_DEV_SERVER_URL)
            if _DEV_SERVER_URL
            else components.declare_component(_COMPONENT_NAME, path=str(_FRONTEND_DIR))
        )

    return _component


def aura_chat(
    config: Mapping[str, Any],
    *,
    key: str | None = None,
    height: int = 720,
    event_types: Sequence[str] | None = None,
) -> dict[str, Any] | None:
    """Render Aura AI Chat inside a Streamlit app.

    Parameters
    ----------
    config:
        JSON-serializable Aura config passed into the underlying ``<aura-chat>``
        element. Function-valued fields are not supported because Streamlit
        serializes values across the iframe boundary.
    key:
        Optional Streamlit component key.
    height:
        Initial iframe height in pixels.
    event_types:
        Optional Aura event types to send back to Python. Passing event types
        causes a Streamlit rerun whenever one of those events fires.
    """

    return _get_component()(
        config=dict(config),
        eventTypes=list(event_types or []),
        minHeight=height,
        default=None,
        key=key,
        height=height,
    )
