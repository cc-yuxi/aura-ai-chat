from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

PROXY_ROUTES = [
    ("/github-copilot-individual-api", "https://api.individual.githubcopilot.com"),
    ("/github-copilot-api", "https://api.githubcopilot.com"),
    ("/github-api", "https://api.github.com"),
    ("/github", "https://github.com"),
]

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
}


def _resolve_target_url(path: str) -> str | None:
    for prefix, target in PROXY_ROUTES:
        if path == prefix or path.startswith(f"{prefix}/"):
            remainder = path[len(prefix):]
            if not remainder:
                remainder = "/"
            return f"{target}{remainder}"
    return None


class CopilotProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._write_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        self._proxy()

    def do_POST(self) -> None:  # noqa: N802
        self._proxy()

    def do_HEAD(self) -> None:  # noqa: N802
        self._proxy()

    def log_message(self, format: str, *args: object) -> None:
        return

    def _proxy(self) -> None:
        parsed = urlsplit(self.path)
        upstream_base = _resolve_target_url(parsed.path)
        if upstream_base is None:
            self.send_error(404, "Unsupported proxy route")
            return

        upstream_parts = urlsplit(upstream_base)

        upstream_url = urlunsplit(
            (
                upstream_parts.scheme,
                upstream_parts.netloc,
                upstream_parts.path,
                parsed.query,
                "",
            )
        )

        body = self._read_body()
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS
        }
        headers.setdefault("Origin", f"{upstream_parts.scheme}://{upstream_parts.netloc}")

        request = Request(
            upstream_url,
            data=body,
            headers=headers,
            method=self.command,
        )

        try:
            with urlopen(request, timeout=300) as upstream:
                self.send_response(upstream.status)
                self._copy_response_headers(upstream.headers.items())
                self.end_headers()
                self._stream_response(upstream)
        except HTTPError as error:
            self.send_response(error.code)
            self._copy_response_headers(error.headers.items())
            self.end_headers()
            self._stream_response(error)
        except URLError as error:
            payload = f"Proxy request failed: {error.reason}\n".encode("utf-8")
            self.send_response(502)
            self._write_cors_headers()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            self.wfile.flush()

    def _read_body(self) -> bytes | None:
        content_length = self.headers.get("Content-Length")
        if not content_length:
            return None
        return self.rfile.read(int(content_length))

    def _copy_response_headers(self, header_items: Iterable[tuple[str, str]]) -> None:
        for key, value in header_items:
            if key.lower() in HOP_BY_HOP_HEADERS:
                continue
            self.send_header(key, value)
        self._write_cors_headers()

    def _write_cors_headers(self) -> None:
        allow_headers = self.headers.get(
            "Access-Control-Request-Headers",
            "Authorization, Content-Type, Editor-Version, Accept",
        )
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", allow_headers)
        self.send_header("Access-Control-Expose-Headers", "*")

    def _stream_response(self, upstream) -> None:
        while True:
            chunk = upstream.read(64 * 1024)
            if not chunk:
                break
            self.wfile.write(chunk)
            self.wfile.flush()


def start_proxy_server(host: str = "127.0.0.1", port: int = 8765) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), CopilotProxyHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server
