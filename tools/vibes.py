"""Shared vibe / track catalogue for PratMusic.

Every bundled track is an ORIGINAL composition synthesized by tools/synth.py and
released under CC0-1.0. They are written *in the vibe* of the listed artists
(dream-pop / synth-pop / dance-pop) but contain no samples, melodies, lyrics or
masters from any copyrighted recording.
"""

# ---------------------------------------------------------------------------
# Vibe definitions. Each vibe maps to one reference artist whose *feel* we
# emulate with original material.
# ---------------------------------------------------------------------------
VIBES = {
    "lana-del-rey": {
        "label": "Lana Del Rey vibe",
        "style": "cinematic dream-pop",
        "reference": "Lana Del Rey",
        "artist_alias": "Marlowe Vane",
        "palette": ["#2b1b3d", "#b56b8c", "#e8b4d0"],
        "bpm_range": (70, 80),
        "moods": ["dreamy", "cinematic", "melancholy", "nostalgic"],
    },
    "the-neighbourhood": {
        "label": "The Neighbourhood vibe",
        "style": "moody alt-synthwave",
        "reference": "The Neighbourhood",
        "artist_alias": "Cobalt Youth",
        "palette": ["#101c2e", "#3f6d9e", "#9fd3ff"],
        "bpm_range": (92, 100),
        "moods": ["moody", "nocturnal", "hazy", "cool"],
    },
    "dua-lipa": {
        "label": "Dua Lipa vibe",
        "style": "dance-pop / nu-disco",
        "reference": "Dua Lipa",
        "artist_alias": "Kira D",
        "palette": ["#3d1430", "#c74b8a", "#ffd166"],
        "bpm_range": (118, 124),
        "moods": ["groovy", "bright", "disco", "confident"],
    },
    "rihanna": {
        "label": "Rihanna vibe",
        "style": "pop-R&B dance groove",
        "reference": "Rihanna",
        "artist_alias": "Rhea Nova",
        "palette": ["#241233", "#7a3ea1", "#ff7ab8"],
        "bpm_range": (94, 100),
        "moods": ["smooth", "sensual", "club", "soulful"],
    },
    "lady-gaga": {
        "label": "Lady Gaga vibe",
        "style": "anthemic electropop",
        "reference": "Lady Gaga",
        "artist_alias": "Stella Star",
        "palette": ["#1c1030", "#8a2be2", "#39d0ff"],
        "bpm_range": (120, 126),
        "moods": ["anthemic", "theatrical", "driving", "glam"],
    },
}

# ---------------------------------------------------------------------------
# Track catalogue: (slug, title, vibe, key_root_midi, scale, bpm, target_secs,
#                   seed, energy 0..1, album)
# ---------------------------------------------------------------------------
TRACKS = [
    # --- Lana Del Rey vibe: cinematic dream-pop -----------------------------
    ("velvet-hour",      "Velvet Hour",       "lana-del-rey",  57, "minor", 74, 138, 101, 0.45, "Cinematic Dreams"),
    ("canyon-of-dreams", "Canyon of Dreams",  "lana-del-rey",  48, "minor", 78, 132, 202, 0.40, "Cinematic Dreams"),
    ("old-neon",         "Old Neon",          "lana-del-rey",  53, "minor", 72, 145, 303, 0.38, "Sunset Boulevard Songs"),

    # --- The Neighbourhood vibe: moody alt-synthwave ------------------------
    ("cool-blue-neon",   "Cool Blue Neon",    "the-neighbourhood", 54, "minor", 96, 118, 404, 0.55, "Sweater Mist"),
    ("sweater-mist",     "Sweater Mist",      "the-neighbourhood", 57, "minor", 100, 112, 505, 0.58, "Sweater Mist"),
    ("midnight-suburbs", "Midnight Suburbs",  "the-neighbourhood", 49, "minor", 92, 124, 606, 0.50, "Sweater Mist"),

    # --- Dua Lipa vibe: dance-pop / nu-disco --------------------------------
    ("neon-groove",      "Neon Groove",       "dua-lipa",      61, "minor", 122, 112, 707, 0.85, "Club Static"),
    ("physical-static",  "Physical Static",   "dua-lipa",      62, "minor", 124, 118, 808, 0.88, "Club Static"),
    ("dancefloor-ghost", "Dancefloor Ghost",  "dua-lipa",      57, "minor", 118, 110, 909, 0.82, "Club Static"),

    # --- Rihanna vibe: pop-R&B dance groove ---------------------------------
    ("diamond-static",   "Diamond Static",    "rihanna",       62, "minor", 98, 124, 1010, 0.70, "Diamond Static"),
    ("umbrella-sky",     "Umbrella Sky",      "rihanna",       54, "minor", 96, 130, 1111, 0.66, "Diamond Static"),
    ("slow-heat",        "Slow Heat",         "rihanna",       55, "minor", 100, 122, 1212, 0.62, "Slow Heat"),

    # --- Lady Gaga vibe: anthemic electropop --------------------------------
    ("glitter-anthem",   "Glitter Anthem",    "lady-gaga",     64, "minor", 124, 118, 1313, 0.90, "Chrome Crown"),
    ("chrome-crown",     "Chrome Crown",      "lady-gaga",     59, "minor", 126, 116, 1414, 0.92, "Chrome Crown"),
    ("strobe-heart",     "Strobe Heart",      "lady-gaga",     60, "minor", 122, 120, 1515, 0.86, "Chrome Crown"),
]

BYO_ARTISTS = [v["reference"] for v in VIBES.values()]
