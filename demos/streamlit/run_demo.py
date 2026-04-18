from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path

from copilot_proxy import start_proxy_server

REPO_ROOT = Path(__file__).resolve().parents[2]
AURA_STREAMLIT_DIR = REPO_ROOT / "packages" / "aura-streamlit"
AURA_STREAMLIT_FRONTEND_DIR = AURA_STREAMLIT_DIR / "src" / "aura_streamlit" / "frontend"


def ensure_frontend_assets() -> int:
    index_file = AURA_STREAMLIT_FRONTEND_DIR / "index.html"
    if index_file.exists():
        return 0

    pnpm = shutil.which("pnpm")
    if pnpm is None:
        print(
            "Aura Streamlit frontend assets are missing and `pnpm` was not found on PATH.\n"
            "Run `pnpm --filter aura-streamlit run build` from the repo root first.",
            file=sys.stderr,
        )
        return 1

    print("Building aura-streamlit frontend assets for the Streamlit demo...")
    result = subprocess.run(
        [pnpm, "--filter", "aura-streamlit", "run", "build"],
        cwd=REPO_ROOT,
        check=False,
    )
    return result.returncode


def main() -> int:
    if importlib.util.find_spec("streamlit") is None:
        print(
            "Streamlit is not installed. Install it with "
            "`python -m pip install streamlit` and run the demo again.",
            file=sys.stderr,
        )
        return 1

    build_status = ensure_frontend_assets()
    if build_status != 0:
        return build_status

    proxy_host = os.environ.get("AURA_STREAMLIT_PROXY_HOST", "127.0.0.1")
    proxy_port = int(os.environ.get("AURA_STREAMLIT_PROXY_PORT", "8765"))
    proxy_server = start_proxy_server(proxy_host, proxy_port)
    os.environ.setdefault(
        "AURA_STREAMLIT_PROXY_ORIGIN",
        f"http://{proxy_host}:{proxy_port}",
    )

    from streamlit.web import cli as stcli

    app_path = Path(__file__).with_name("app.py")
    default_args = [
        "streamlit",
        "run",
        str(app_path),
        "--server.headless=true",
        "--server.runOnSave=true",
        "--server.port=8501",
    ]
    sys.argv = [*default_args, *sys.argv[1:]]
    try:
        return stcli.main()
    finally:
        proxy_server.shutdown()
        proxy_server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
