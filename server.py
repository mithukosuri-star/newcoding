#!/usr/bin/env python3
"""PratMusic web server (standard library only, plus Pillow at build time).

Usage:  python3 server.py [port]     # default port 8000

Endpoints
---------
GET  /                     player UI
GET  /static/*             CSS / JS
GET  /api/library          catalogue JSON
GET  /api/artwork/<id>     cover image
GET  /audio/<path>         audio bytes (HTTP Range supported)
POST /api/upload           multipart upload -> audio/byo/<artist>/
POST /api/refresh          rebuild library.json from disk
GET  /api/health           liveness probe
"""

import json
import os
import subprocess
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")
LIB_PATH = os.path.join(ROOT, "library", "library.json")
BYO_ROOT = os.path.join(ROOT, "audio", "byo")

SUPPORTED_EXT = {
    ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
    ".flac": "audio/flac", ".m4a": "audio/mp4", ".aac": "audio/aac",
    ".opus": "audio/ogg", ".webm": "audio/webm",
}


def _load_library():
    if not os.path.exists(LIB_PATH):
        return {"tracks": [], "artists": [], "vibes": {},
                "notice": "Run tools/build_library.py first."}
    with open(LIB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


LIBRARY = _load_library()


def _slugify(s):
    s = (s or "").lower().strip()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in " -_":
            if out and out[-1] != "-":
                out.append("-")
    return "".join(out).strip("-") or "other"


def _safe_rel(path):
    """Resolve a URL path to a file inside ROOT, rejecting traversal."""
    rel = urllib.parse.unquote(path)
    if ".." in rel:
        return None
    full = os.path.normpath(os.path.join(ROOT, rel.lstrip("/")))
    if not full.startswith(ROOT + os.sep):
        return None
    return full if os.path.isfile(full) else None


def _serve_within(subdir, url_path):
    """Resolve a URL path strictly inside ROOT/<subdir>/."""
    rel = urllib.parse.unquote(url_path)
    if ".." in rel:
        return None
    base = os.path.join(ROOT, subdir)
    full = os.path.normpath(os.path.join(base, rel.lstrip("/")))
    if not full.startswith(base + os.sep):
        return None
    return full if os.path.isfile(full) else None


class Handler(BaseHTTPRequestHandler):
    server_version = "PratMusic/2.0"
    protocol_version = "HTTP/1.1"

    # ------------------------------------------------------------ helpers
    def _send(self, status, body=b"", ctype="text/plain; charset=utf-8",
              extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _json(self, obj, status=200):
        self._send(status, json.dumps(obj, indent=2).encode("utf-8"),
                   "application/json")

    def _range_headers(self, size):
        rng = self.headers.get("Range")
        if not rng or not rng.startswith("bytes="):
            return 0, size - 1, None
        try:
            spec = rng.split("=", 1)[1]
            if spec.startswith("-"):
                length = int(spec[1:])
                start = max(0, size - length)
            else:
                start_s, end_s = spec.split("-", 1)
                start = int(start_s)
                end = int(end_s) if end_s else size - 1
            end = min(end, size - 1)
            return start, end, (start, end, size)
        except Exception:
            return 0, size - 1, None

    # ------------------------------------------------------------ routing
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/" or path == "/index.html":
            return self._file(os.path.join(STATIC, "index.html"),
                              "text/html; charset=utf-8")
        if path.startswith("/static/"):
            return self._file(_serve_within("static", path[len("/static/"):]), None)
        if path.startswith("/artwork/"):
            return self._file(_serve_within("artwork", path[len("/artwork/"):]), None)
        if path == "/audio":
            return self._audio(query.get("id", [""])[0])
        if path == "/api/library":
            return self._json(LIBRARY)
        if path == "/api/health":
            return self._json({"ok": True, "app": "PratMusic"})
        if path == "/api/vibes":
            return self._json(LIBRARY.get("vibes", {}))
        self._send(404, b"not found")

    def _file(self, full_path, ctype):
        if not full_path:
            return self._send(404, b"not found")
        if ctype is None:
            ext = os.path.splitext(full_path)[1].lower()
            ctype = {".css": "text/css", ".js": "text/javascript",
                     ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                     ".png": "image/png", ".svg": "image/svg+xml",
                     ".json": "application/json",
                     ".woff2": "font/woff2"}.get(ext,
                                                 "application/octet-stream")
        try:
            with open(full_path, "rb") as f:
                data = f.read()
        except OSError:
            return self._send(404, b"not found")
        self._send(200, data, ctype)

    def _audio(self, track_id):
        track = next((t for t in LIBRARY.get("tracks", [])
                      if t.get("id") == track_id), None)
        if not track:
            return self._send(404, b"track not found")
        full = _safe_rel("/" + track["file"])
        if not full:
            return self._send(404, b"missing file")
        size = os.path.getsize(full)
        start, end, rng = self._range_headers(size)
        length = end - start + 1
        with open(full, "rb") as f:
            f.seek(start)
            chunk = f.read(length)
        ext = os.path.splitext(full)[1].lower()
        ctype = SUPPORTED_EXT.get(ext, "application/octet-stream")
        headers = {"Accept-Ranges": "bytes", "Content-Length": str(length)}
        if rng:
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Range",
                             f"bytes {rng[0]}-{rng[1]}/{rng[2]}")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(length))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(chunk)
        else:
            self._send(200, chunk, ctype, extra=headers)

    # ------------------------------------------------------------ uploads
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/upload":
            return self._upload()
        if parsed.path == "/api/refresh":
            return self._refresh()
        self._send(404, b"not found")

    def _upload(self):
        ctype = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in ctype:
            return self._json({"error": "expected multipart/form-data"},
                              400)
        length = int(self.headers.get("Content-Length", 0))
        if length > 200 * 1024 * 1024:
            return self._json({"error": "file too large (200 MB max)"},
                              413)
        body = self.rfile.read(length)
        fields, files = _parse_multipart(ctype, body)

        uploads = files.get("file", [])
        if not uploads:
            return self._json({"error": "no file field"}, 400)

        artist = (fields.get("artist") or [""])[0].strip() or "Other"
        vibe = (fields.get("vibe") or [""])[0].strip() or "bring-your-own"
        title_override = (fields.get("title") or [""])[0].strip()

        import shutil
        saved = []
        for fname, payload in uploads:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SUPPORTED_EXT:
                continue
            artist_slug = _slugify(artist)
            dest_dir = os.path.join(BYO_ROOT, artist_slug)
            os.makedirs(dest_dir, exist_ok=True)
            safe_name = _slugify(os.path.splitext(fname)[0]) or "track"
            dest = os.path.join(dest_dir, f"{safe_name}{ext}")
            n = 1
            while os.path.exists(dest):
                dest = os.path.join(dest_dir, f"{safe_name}-{n}{ext}")
                n += 1
            with open(dest, "wb") as f:
                f.write(payload)
            # sidecar metadata from the BYO form (title / vibe overrides)
            meta = {}
            if title_override:
                meta["title"] = title_override
            if vibe and vibe != "bring-your-own":
                meta["vibe"] = vibe
            if meta:
                with open(dest + ".meta.json", "w", encoding="utf-8") as mf:
                    json.dump(meta, mf)
            saved.append(os.path.relpath(dest, ROOT).replace(os.sep, "/"))

        if not saved:
            return self._json({"error": "no supported audio files"}, 400)

        # re-scan so uploads appear immediately
        LIBRARY.clear()
        LIBRARY.update(_rebuild_library())
        return self._json({"saved": saved,
                           "total_tracks": len(LIBRARY.get("tracks", []))})

    def _refresh(self):
        LIBRARY.clear()
        LIBRARY.update(_rebuild_library())
        return self._json({"ok": True,
                           "tracks": len(LIBRARY.get("tracks", []))})

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write("[pratmusic] " + fmt % args + "\n")


# ---------------------------------------------------------------------------
# Minimal multipart parser (stdlib only)
# ---------------------------------------------------------------------------
def _parse_multipart(ctype_header, body):
    import email.parser
    msg = email.parser.Parser().parsestr(
        "Content-Type: " + ctype_header + "\n\n" + "")
    boundary = msg.get_boundary()
    if not boundary:
        raise ValueError("no boundary")
    delim = ("--" + boundary).encode()
    fields, files = {}, {}
    parts = body.split(delim)
    for part in parts:
        part = part.strip(b"\r\n")
        if not part or part == b"--":
            continue
        try:
            head, payload = part.split(b"\r\n\r\n", 1)
        except ValueError:
            continue
        head_txt = head.decode("utf-8", "replace")
        name = filename = None
        for line in head_txt.splitlines():
            low = line.lower()
            if low.startswith("content-disposition:"):
                for chunk in line.split(";"):
                    chunk = chunk.strip()
                    if chunk.startswith("name="):
                        name = chunk[5:].strip('"')
                    if chunk.startswith("filename="):
                        filename = chunk[9:].strip('"')
        if not name:
            continue
        if filename:
            files.setdefault(name, []).append((filename, payload))
        else:
            fields.setdefault(name, []).append(
                payload.decode("utf-8", "replace"))
    return fields, files


def _rebuild_library():
    """Re-run the library builder in-process."""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import importlib
    import build_library
    importlib.reload(build_library)
    return build_library.build_library()


def main():
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("usage: python3 server.py [port]", file=sys.stderr)
            sys.exit(2)
    if not os.path.exists(LIB_PATH):
        print("[pratmusic] library not found - building it first ...")
        LIBRARY.clear()
        LIBRARY.update(_rebuild_library())
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"[pratmusic] PratMusic listening on http://0.0.0.0:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[pratmusic] goodbye")


if __name__ == "__main__":
    main()
