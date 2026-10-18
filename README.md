# PratMusic 🎧

A self-hosted dream-pop / synth-pop / dance-pop library and player —
the renamed successor of **Prism** (see `NEWSESSION.md` for the full
handoff notes).

## Quick start

```bash
pip install pillow numpy
python3 tools/build_library.py
python3 server.py 8000
# open http://localhost:8000
```

`tools/build_library.py` renders the bundled **PratMusic Originals**
(CC0-1.0, synthesized in-house with `tools/synth.py`), generates
cover art with Pillow, and writes `library/library.json`.

## What's bundled

Original compositions released under **CC0-1.0**, written *in the
vibe* of:

| Vibe | Style | Fictional performer |
|---|---|---|
| Lana Del Rey | cinematic dream-pop | Marlowe Vane |
| The Neighbourhood | moody alt-synthwave | Cobalt Youth |
| Dua Lipa | dance-pop / nu-disco | Kira D |
| Rihanna | pop-R&B dance groove | Rhea Nova |
| Lady Gaga | anthemic electropop | Stella Star |

⚠️ **No copyrighted masters, samples, lyrics or artist likenesses are
bundled.** The originals are instrumental syntheses with a formant
"vocal-lead" (synthesized vowels) — they evoke the *feel*, not the
recordings.

## Bring Your Own Files

A first-class panel (top-right **＋ Bring Your Own Files**) lets you
upload your own recordings — e.g. your own copies of Lana Del Rey,
The Neighbourhood, Dua Lipa, Rihanna or Lady Gaga tracks that you
legally own — tag them by artist and vibe, and play them alongside
the originals. Files land in `audio/byo/<artist>/` and are re-scanned
into the library immediately. You can also just drop files there and
hit **POST /api/refresh** (or restart the builder).

## Layout

```
tools/synth.py          deterministic original-track synthesizer
tools/artwork.py        Pillow cover-art generator
tools/vibes.py          vibe + track catalogue
tools/build_library.py  builds audio/ + artwork/ + library/library.json
server.py               stdlib web server (player API + Range audio)
static/                 player UI + Bring Your Own Files panel
audio/generated/        CC0 originals (built)
audio/byo/              your uploaded files
artwork/                generated covers
library/library.json    catalogue
```
