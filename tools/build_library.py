#!/usr/bin/env python3
"""PratMusic library builder.

Usage:  python3 tools/build_library.py [--regenerate]

1. (Re)generates the bundled CC0 original tracks with tools/synth.py.
2. Scans audio/generated/ and audio/byo/ (user-dropped files).
3. Writes artwork/ covers with Pillow.
4. Emits library/library.json consumed by server.py.

All bundled music is original synthesis released under CC0-1.0 — no
copyrighted masters, samples, lyrics or artist likenesses are included.
"""

import hashlib
import json
import os
import sys
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import synth  # noqa: E402
from vibes import VIBES, TRACKS  # noqa: E402
import artwork  # noqa: E402

AUDIO_GEN = os.path.join(ROOT, "audio", "generated")
AUDIO_BYO = os.path.join(ROOT, "audio", "byo")
ART_DIR = os.path.join(ROOT, "artwork")
LIB_DIR = os.path.join(ROOT, "library")
SUPPORTED = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac", ".opus", ".webm"}
PROG_BY_VIBE = {
    "lana-del-rey": "cinematic",
    "the-neighbourhood": "nocturnal",
    "dua-lipa": "disco",
    "rihanna": "rnb",
    "lady-gaga": "anthem",
}


def slugify(s):
    s = s.lower().strip()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in " -_":
            if out and out[-1] != "-":
                out.append("-")
    return "".join(out).strip("-") or "track"


def wav_duration(path):
    try:
        with wave.open(path, "rb") as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        return None


def generate_tracks(regenerate=False):
    """Render every catalogue track to audio/generated/*.wav."""
    os.makedirs(AUDIO_GEN, exist_ok=True)
    made = []
    for (slug, title, vibe, root, scale, bpm, secs, seed,
         energy, album) in TRACKS:
        out = os.path.join(AUDIO_GEN, f"{slug}.wav")
        if os.path.exists(out) and not regenerate:
            continue
        print(f"[synth] {title}  ({VIBES[vibe]['label']}, {bpm} BPM) ...",
              flush=True)
        samples = synth.render_track(
            bpm=bpm, root_midi=root, scale=scale,
            prog_kind=PROG_BY_VIBE[vibe], seed=seed,
            target_secs=secs, energy=energy,
            vibe="rnb" if vibe == "rihanna" else "default",
        )
        synth.write_wav(out, samples)
        made.append(slug)
    return made


def scan_byo():
    """Index user-dropped files under audio/byo/<artist-slug>/."""
    entries = []
    if not os.path.isdir(AUDIO_BYO):
        return entries
    for artist_slug in sorted(os.listdir(AUDIO_BYO)):
        artist_dir = os.path.join(AUDIO_BYO, artist_slug)
        if not os.path.isdir(artist_dir):
            continue
        for fn in sorted(os.listdir(artist_dir)):
            ext = os.path.splitext(fn)[1].lower()
            if ext not in SUPPORTED:
                continue
            path = os.path.join(artist_dir, fn)
            # optional sidecar written by the BYO upload panel
            meta_path = path + ".meta.json"
            meta = {}
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as mf:
                        meta = json.load(mf)
                except Exception:
                    meta = {}
            title = meta.get("title") or \
                os.path.splitext(fn)[0].replace("_", " ").replace("-", " ")
            artist = artist_slug.replace("-", " ").title()
            vibe_key = meta.get("vibe") if meta.get("vibe") in VIBES else None
            vibe_label = VIBES[vibe_key]["label"] if vibe_key \
                else "Bring Your Own Files"
            entries.append({
                "id": "byo-" + hashlib.sha1(path.encode()).hexdigest()[:10],
                "title": title,
                "artist": artist,
                "album": "My Files",
                "genre": VIBES[vibe_key]["style"] if vibe_key else "User upload",
                "vibe": vibe_key or "bring-your-own",
                "vibe_label": vibe_label,
                "reference": VIBES[vibe_key]["reference"] if vibe_key else None,
                "source": "byo",
                "moods": ["personal"],
                "bpm": None,
                "key": None,
                "file": os.path.relpath(path, ROOT).replace(os.sep, "/"),
                "duration": wav_duration(path) if ext == ".wav" else None,
                "license": "User-provided file (check its license)",
                "explicit": None,
                "artwork": None,
            })
    return entries


def build_library(regenerate=False):
    generate_tracks(regenerate=regenerate)
    tracks = []
    for i, (slug, title, vibe, root, scale, bpm, secs, seed,
            energy, album) in enumerate(TRACKS):
        v = VIBES[vibe]
        path = os.path.join(AUDIO_GEN, f"{slug}.wav")
        if not os.path.exists(path):
            continue
        track_id = f"pm-{slug}"
        art = artwork.cover_for(
            track_id, title, v["artist_alias"], v["palette"],
            ART_DIR, seed=seed,
        )
        dur = wav_duration(path)
        tracks.append({
            "id": track_id,
            "title": title,
            "artist": v["artist_alias"],
            "album": album,
            "genre": v["style"],
            "vibe": vibe,
            "vibe_label": v["label"],
            "reference": v["reference"],
            "source": "generated",
            "moods": v["moods"],
            "bpm": bpm,
            "key": None,
            "file": os.path.relpath(path, ROOT).replace(os.sep, "/"),
            "duration": dur if dur else secs,
            "license": "CC0-1.0 (original synthesis, PratMusic)",
            "explicit": False,
            "artwork": os.path.relpath(art, ROOT).replace(os.sep, "/"),
            "seed": seed,
        })

    byo = scan_byo()
    tracks.extend(byo)

    artists = []
    seen = set()
    for t in tracks:
        key = (t["artist"], t["vibe"])
        if key in seen:
            continue
        seen.add(key)
        artists.append({
            "name": t["artist"],
            "vibe": t["vibe"],
            "vibe_label": t["vibe_label"],
            "reference": t["reference"],
            "artwork": t["artwork"],
        })

    lib = {
        "app": "PratMusic",
        "version": "2.0.0",
        "generated_at": _iso_now(),
        "notice": ("Bundled 'PratMusic Originals' are CC0-1.0 original "
                   "syntheses in the vibe of the listed artists. No "
                   "copyrighted masters, samples or lyrics are bundled. "
                   "Use Bring Your Own Files for your own recordings."),
        "vibes": {k: {kk: vv for kk, vv in v.items()} for k, v in VIBES.items()},
        "artists": artists,
        "tracks": tracks,
    }
    os.makedirs(LIB_DIR, exist_ok=True)
    out = os.path.join(LIB_DIR, "library.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(lib, f, indent=2)
    print(f"[library] {len(tracks)} tracks "
          f"({len(tracks) - len(byo)} originals + {len(byo)} your files)")
    print(f"[library] wrote {os.path.relpath(out, ROOT)}")
    return lib


def _iso_now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


if __name__ == "__main__":
    regen = "--regenerate" in sys.argv
    build_library(regenerate=regen)
