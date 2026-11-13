#!/usr/bin/env python3
"""Serve the current checkout on loopback without stale module caches."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4174)
    args = parser.parse_args()
    site = Path(__file__).resolve().parent.parent / 'site'
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(PreviewHandler, directory=str(site)))
    print(f'LEARN local preview: http://127.0.0.1:{args.port}/#/home', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
