# NEWSESSION — PratMusic session handoff

## Status of the pending work (all completed this session)

- [x] **Rename Prism → PratMusic.** All code, UI, server header
      (`server_version = "PratMusic/2.0"`), artwork and docs now use
      PratMusic. No "Prism" strings remain.
- [x] **Openly-licensed vocal-vibe tracks.** 15 original
      dream-pop / synth-pop / dance-pop compositions
      (`audio/generated/`, **CC0-1.0**), synthesized by
      `tools/synth.py` with a formant "vocal-lead" voice
      (vowel-shaped synthesized voice — *not* samples of any real
      singer). Grouped by vibe:
        - Lana Del Rey vibe — cinematic dream-pop (Marlowe Vane)
        - The Neighbourhood vibe — moody alt-synthwave (Cobalt Youth)
        - Dua Lipa vibe — dance-pop / nu-disco (Kira D)
        - Rihanna vibe — pop-R&B dance groove (Rhea Nova)
        - Lady Gaga vibe — anthemic electropop (Stella Star)
      Their **actual masters are NOT bundled** (copyrighted); the
      tracks only emulate the *vibe*, and the UI says so.
- [x] **First-class "Bring Your Own Files" panel.** Sidebar + modal:
      drag & drop / browse upload, artist chips for the five
      artists (plus custom), vibe tagging, rename, progress bar.
      Files persist under `audio/byo/<artist>/`, stream via
      `/audio?id=…` (HTTP Range), and are indexed by
      `tools/build_library.py` / `POST /api/refresh`.

## Note on this handoff

The original `pratmusic-handoff.zip` was **not present** in the
workspace or on the GitHub remote (the repo contained only a stub
README), so the project was reconstructed from the handoff
description: `server.py` (stdlib web server, port from argv),
`tools/build_library.py` (Pillow artwork + catalogue), and the
player UI. If the original zip surfaces later, diff the
`tools/` + `server.py` structure against it and re-apply any
customizations.

## Run

```bash
pip install pillow numpy
python3 tools/build_library.py     # renders tracks + covers + library.json
python3 server.py 8000             # → http://localhost:8000
```

`tools/build_library.py` accepts `--regenerate` to re-render the
originals. Uploaded BYO files are re-indexed automatically by the
server after upload; dropping files straight into `audio/byo/`
just needs a `POST /api/refresh` or a rebuild.

- [x] Keyboard shortcuts (space play/pause, ←/→ seek, ↑/↓ volume,
      n/p next/prev, s shuffle, r repeat, / search) and
      ♥ favourites persisted in localStorage.

## Known limitations / next steps

- Bundled tracks are mono 22.05 kHz WAV (keeps the build dependency
  free — no ffmpeg). Re-encode to OGG for smaller files if desired.
- The "vocal" lead is synthesized formant voice; real vocal stems
  belong in the BYO panel (legal: your own copies only).
- BYO MP3/OGG durations are read client-side (no taglib dependency).
- Possible next: playlists, gapless crossfade, opus encoding.
