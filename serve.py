#!/usr/bin/env python3
"""Serve WeatherMeter. Standard library only. Binds to loopback unless --expose is set."""
from __future__ import annotations

import argparse
import http.server
import os
import socketserver
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOOPBACK = {"127.0.0.1", "localhost", "::1"}


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path.startswith("/.git") or "/.git/" in path:
            self.send_error(404, "Not found")
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        path = self.path.split("?", 1)[0]
        if path.startswith("/.git") or "/.git/" in path:
            self.send_error(404, "Not found")
            return
        super().do_HEAD()


def main() -> None:
    parser = argparse.ArgumentParser(description="WeatherMeter static server")
    parser.add_argument("--port", "-p", type=int, default=8766)
    parser.add_argument("--bind", "-b", default="127.0.0.1")
    parser.add_argument(
        "--expose",
        action="store_true",
        help="Allow a non-loopback bind. A shared host passes this. A local preview does not.",
    )
    args = parser.parse_args()
    if args.bind not in LOOPBACK and not args.expose:
        parser.error("refusing non-loopback bind %s (pass --expose to override)" % args.bind)
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((args.bind, args.port), Handler) as httpd:
        print("rhuanssauro-WeatherMeter  http://%s:%s/" % (args.bind, args.port))
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
