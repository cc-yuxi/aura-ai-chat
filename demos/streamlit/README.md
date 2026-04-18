# Streamlit Demo

This demo shows how to use `aura-streamlit` from a Streamlit app in the monorepo.

## Run

From the repo root:

```bash
pnpm run demo streamlit
```

Or from this folder:

```bash
python -m pip install streamlit
python run_demo.py
```

The demo imports the local `packages/aura-streamlit/src` source directly, so you
do not need to publish the Python package first.

It also starts a small local proxy for the built-in GitHub Copilot provider so
the same `/github*` routes used by the Vite demos keep working in Streamlit.
