"""Render Sonora's built-in catalogue to MP3.

Each track is arranged by hand: chord progressions, basslines, drum patterns,
lead melodies, and mix settings all live in this file. Run:

    python tools/render_tracks.py                # everything
    python tools/render_tracks.py neon-drift     # one track
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import lameenc
import numpy as np
import soundfile as sf

import synth as S

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / 'public' / 'audio'
DATA_FILE = ROOT / 'src' / 'data' / 'tracks.generated.json'

RNG = np.random.default_rng(2024)


# --------------------------------------------------------------------------- #
# Metadata (the app reads the generated JSON, including real durations)
# --------------------------------------------------------------------------- #

CATALOG = [
    {
        'id': 'neon-drift',
        'title': 'Neon Drift',
        'artist': 'Lumen Arc',
        'album': 'Midnight Circuit',
        'genre': 'Synthwave',
        'moods': ['night drive', 'energy'],
        'bpm': 104,
        'key': 'A minor',
        'cover': '/covers/neon-drift.jpg',
        'accent': '#8b5cf6',
    },
    {
        'id': 'golden-hour',
        'title': 'Golden Hour',
        'artist': 'Kaya Mellow',
        'album': 'Slow Light',
        'genre': 'Lo-fi',
        'moods': ['chill', 'focus'],
        'bpm': 82,
        'key': 'B minor',
        'cover': '/covers/golden-hour.jpg',
        'accent': '#f59e0b',
    },
    {
        'id': 'tidal-bloom',
        'title': 'Tidal Bloom',
        'artist': 'Aether Field',
        'album': 'Undercurrent',
        'genre': 'Ambient',
        'moods': ['focus', 'wind down'],
        'bpm': 60,
        'key': 'F# major',
        'cover': '/covers/tidal-bloom.jpg',
        'accent': '#14b8a6',
    },
    {
        'id': 'static-bloom',
        'title': 'Static Bloom',
        'artist': 'Vela Gray',
        'album': 'Analog Ghosts',
        'genre': 'Downtempo',
        'moods': ['late night', 'focus'],
        'bpm': 90,
        'key': 'C minor',
        'cover': '/covers/static-bloom.jpg',
        'accent': '#e11d48',
    },
    {
        'id': 'paper-planes',
        'title': 'Paper Planes',
        'artist': 'Kaya Mellow',
        'album': 'Slow Light',
        'genre': 'Lo-fi',
        'moods': ['chill', 'focus'],
        'bpm': 76,
        'key': 'F major',
        'cover': '/covers/golden-hour.jpg',
        'accent': '#f59e0b',
    },
    {
        'id': 'afterglow',
        'title': 'Afterglow',
        'artist': 'Lumen Arc',
        'album': 'Midnight Circuit',
        'genre': 'Synthwave',
        'moods': ['wind down', 'late night'],
        'bpm': 92,
        'key': 'D minor',
        'cover': '/covers/neon-drift.jpg',
        'accent': '#8b5cf6',
    },
]


class Grid:
    """Bar / beat / sixteenth-note maths for one tempo."""

    def __init__(self, bpm: float):
        self.bpm = bpm
        self.beat = 60.0 / bpm
        self.bar = self.beat * 4.0
        self.step = self.beat / 4.0

    def t(self, bar: float, beat: float = 0.0) -> float:
        return bar * self.bar + beat * self.beat

    def s(self, bar: float, step: float) -> float:
        return bar * self.bar + step * self.step


def hz(names):
    if isinstance(names, (list, tuple)):
        return [float(S.hz(n)) for n in names]
    return float(S.hz(names))


def humanize(amount: float = 0.008) -> float:
    return float(RNG.normal(0.0, amount))


# --------------------------------------------------------------------------- #
# Neon Drift — synthwave, A minor, 104 BPM
# --------------------------------------------------------------------------- #


def render_neon_drift() -> np.ndarray:
    bpm = 104
    bars = 64
    g = Grid(bpm)
    mix = S.Mix(bars * g.bar, tail=6.0, seed=1)

    progression = [
        ([45, 52, 57, 60, 64], 45),  # Am
        ([41, 48, 53, 57, 60], 41),  # F
        ([48, 55, 60, 64, 67], 48),  # C
        ([43, 50, 55, 59, 62], 43),  # G
    ]
    arp_pattern = [0, 2, 4, 3, 1, 3, 4, 2]

    kick_times: list[float] = []

    def add_pad(bar: int, energy: float = 1.0) -> None:
        voicing, _ = progression[bar % 4]
        for i, m in enumerate(voicing):
            sig = S.pad(
                hz(m),
                g.bar * 1.05,
                cutoff=900 + 500 * energy,
                attack=0.45,
                release=0.6,
                detune=16,
                level=0.35,
            )
            mix.add('pad', sig, at=g.t(bar) + i * 0.01, gain=0.55, pan=(i - 2) * 0.18, send=0.35)
        # Airy octave shimmer on top.
        top = S.pad(hz(voicing[-1] + 12), g.bar, cutoff=2600, attack=1.1, release=1.2, detune=8, level=0.14)
        mix.add('pad', top, at=g.t(bar), gain=0.5, send=0.6)

    def add_arp(bar: int, cutoff: float = 2400.0, gain: float = 0.5) -> None:
        voicing, _ = progression[bar % 4]
        tones = [voicing[0] + 12, voicing[2] + 12, voicing[4] + 12, voicing[2] + 24, voicing[4] + 24]
        for step in range(16):
            m = tones[arp_pattern[step % len(arp_pattern)] % len(tones)]
            accent = 1.0 if step % 4 == 0 else 0.72 if step % 2 == 0 else 0.5
            sig = S.pluck(hz(m), dur=g.step * 0.9, cutoff=cutoff, kind='saw', decay=16.0)
            mix.add('arp', sig, at=g.s(bar, step) + humanize(0.003), gain=gain * accent, pan=0.15, send=0.55)

    def add_bass(bar: int, gain: float = 0.9) -> None:
        _, root = progression[bar % 4]
        pattern = [0, 0, 12, 0, 0, 12, 0, 12]
        for i, semis in enumerate(pattern):
            t = g.s(bar, i * 2)
            sig = S.synth_bass(hz(root + semis), g.beat * 0.52, cutoff=420, drive=1.8)
            mix.add('bass', sig, at=t, gain=gain * (1.0 if i % 2 == 0 else 0.75), send=0.06)

    def add_drums(bar: int, energy: float = 1.0, fill: bool = False) -> None:
        for beat in (0, 1, 2, 3):
            t = g.t(bar, beat)
            mix.add('drums', S.kick(dur=0.5, punch=1.05), at=t, gain=0.95, send=0.05)
            kick_times.append(t)
        for beat in (1, 3):
            mix.add('drums', S.snare(dur=0.42), at=g.t(bar, beat) + humanize(), gain=0.62, send=0.28)
        for i in range(8):
            t = g.s(bar, i * 2)
            open_hat = i == 7
            mix.add(
                'drums',
                S.hat(dur=0.18 if open_hat else 0.08, open_hat=open_hat),
                at=t,
                gain=0.26 if open_hat else 0.19,
                pan=0.25,
                send=0.05,
            )
        if energy > 0.9:
            for i in (3, 11):
                mix.add('drums', S.hat(dur=0.06), at=g.s(bar, i), gain=0.1, pan=-0.3)
        if fill:
            for i, m in enumerate((110, 140, 175)):
                mix.add('drums', S.tom(m, 0.28), at=g.s(bar, 12 + i), gain=0.5, pan=-0.2 + i * 0.2)

    def add_crash(bar: int) -> None:
        mix.add('fx', S.crash(3.2), at=g.t(bar), gain=0.32, send=0.4)

    melody = [
        # (bar offset, beat, note, length in beats)
        (0, 0.0, 'A4', 1.5), (0, 1.5, 'C5', 0.5), (0, 2.0, 'E5', 1.5), (0, 3.5, 'D5', 0.5),
        (1, 0.0, 'C5', 1.0), (1, 1.0, 'A4', 1.0), (1, 2.0, 'G4', 2.0),
        (2, 0.0, 'F4', 1.0), (2, 1.0, 'A4', 1.0), (2, 2.0, 'C5', 1.5), (2, 3.5, 'D5', 0.5),
        (3, 0.0, 'E5', 2.0), (3, 2.0, 'C5', 2.0),
        (4, 0.0, 'D5', 1.0), (4, 1.0, 'E5', 1.0), (4, 2.0, 'G5', 1.5), (4, 3.5, 'E5', 0.5),
        (5, 0.0, 'D5', 1.0), (5, 1.0, 'C5', 1.0), (5, 2.0, 'A4', 2.0),
        (6, 0.0, 'G4', 1.0), (6, 1.0, 'A4', 1.0), (6, 2.0, 'C5', 1.0), (6, 3.0, 'D5', 1.0),
        (7, 0.0, 'E5', 3.0),
    ]

    def add_lead(start_bar: int, gain: float = 0.5) -> None:
        for offset, beat, name, length in melody:
            t = g.t(start_bar + offset, beat)
            sig = S.lead(hz(S.note(name)), length * g.beat * 0.95, vibrato=5.4, depth=0.16, kind='square', cutoff=3600)
            sig = S.stereo_delay(sig, g.beat * 0.75, feedback=0.28, mix=0.2, taps=3, tone=3000)
            mix.add('lead', sig, at=t, gain=gain, pan=0.05, send=0.55)

    # ----- arrangement -----
    for bar in range(0, 8):  # intro
        add_pad(bar, 0.5)
        add_arp(bar, cutoff=1400 + bar * 120, gain=0.34)
    mix.add('fx', S.reverse_cymbal(1.8), at=g.t(6), gain=0.4)
    mix.add('fx', S.riser(2 * g.bar, 300, 9000), at=g.t(6, 2), gain=0.5, send=0.5)

    for bar in range(8, 16):  # build
        add_pad(bar, 0.8)
        add_arp(bar, cutoff=2200, gain=0.46)
        add_bass(bar, gain=0.8)
        add_drums(bar, energy=0.7)
    add_crash(8)

    for bar in range(16, 24):  # main
        add_pad(bar, 1.0)
        add_arp(bar, cutoff=2600, gain=0.5)
        add_bass(bar, gain=0.9)
        add_drums(bar, fill=bar % 8 == 7)
        if bar == 16:
            add_crash(bar)

    for bar in range(24, 32):  # main + lead
        add_pad(bar, 1.0)
        add_arp(bar, cutoff=2600, gain=0.5)
        add_bass(bar, gain=0.9)
        add_drums(bar, fill=bar % 8 == 7)
    add_lead(24, gain=0.48)

    for bar in range(32, 40):  # breakdown
        add_pad(bar, 0.75)
        add_arp(bar, cutoff=1800, gain=0.4)
        add_bass(bar, gain=0.35)
    add_lead(32, gain=0.52)
    mix.add('fx', S.riser(2 * g.bar, 300, 10000), at=g.t(38, 2), gain=0.5, send=0.5)

    for bar in range(40, 56):  # finale
        add_pad(bar, 1.0)
        add_arp(bar, cutoff=2900, gain=0.5)
        add_bass(bar, gain=0.92)
        add_drums(bar, fill=bar % 8 == 7)
        if bar in (40, 48):
            add_crash(bar)
    add_lead(40, gain=0.5)
    add_lead(48, gain=0.46)

    for bar in range(56, 64):  # outro
        add_pad(bar, 0.7)
        add_arp(bar, cutoff=2000 - (bar - 56) * 140, gain=0.4 - (bar - 56) * 0.035)
        if bar < 60:
            add_bass(bar, gain=0.5)
            add_drums(bar, energy=0.5)
    add_crash(56)

    mix.buses['pad'] = S.sidechain_duck(mix.buses['pad'], kick_times, depth=0.4, release=0.16)
    mix.buses['bass'] = S.sidechain_duck(mix.buses['bass'], kick_times, depth=0.5, release=0.14)

    ir = S.reverb_ir(seconds=2.6, decay=2.4, damp=5200, seed=3)
    return mix.render(ir, wet=0.45, target_rms=-13.5, fade_out=3.5, drive=1.03,
                      bus_targets={'lead': -18.5, 'arp': -22.5, 'pad': -20.5, 'drums': -17.5, 'bass': -19.0},
                      stereo_width=1.05)


# --------------------------------------------------------------------------- #
# Golden Hour — lo-fi, B minor, 82 BPM
# --------------------------------------------------------------------------- #


def render_golden_hour() -> np.ndarray:
    bpm = 82
    bars = 56
    g = Grid(bpm)
    mix = S.Mix(bars * g.bar, tail=5.0, seed=2)

    chords = [
        ([47, 54, 57, 61, 62], 35),  # Bm9
        ([43, 50, 54, 59, 62], 31),  # Gmaj7
        ([50, 57, 61, 64, 66], 38),  # Dmaj9
        ([45, 52, 55, 59, 61], 33),  # A6/9
    ]

    def add_keys(bar: int, gain: float = 0.55) -> None:
        voicing, _ = chords[bar % 4]
        for i, m in enumerate(voicing):
            t = g.t(bar, 0.0) + i * 0.018 + humanize(0.006)
            sig = S.epiano(hz(m), g.bar * 0.95, velocity=0.8 + RNG.random() * 0.2, brightness=0.9 - i * 0.06)
            mix.add('keys', sig, at=t, gain=gain * (0.9 if i > 0 else 1.0), pan=(i - 2) * 0.14, send=0.3)
        # A soft stab on the and-of-two.
        for i in (1, 3):
            m = voicing[i]
            sig = S.epiano(hz(m + 12), g.beat * 1.2, velocity=0.45, brightness=0.7)
            mix.add('keys', sig, at=g.t(bar, 2.5) + humanize(), gain=gain * 0.35, pan=0.3, send=0.5)

    def add_pad(bar: int) -> None:
        voicing, _ = chords[bar % 4]
        for i, m in enumerate(voicing[1:4]):
            sig = S.pad(hz(m), g.bar, cutoff=1100, attack=1.2, release=1.8, detune=7, level=0.18)
            mix.add('pad', sig, at=g.t(bar), gain=0.4, pan=(i - 1) * 0.35, send=0.6)

    def add_bass(bar: int) -> None:
        _, root = chords[bar % 4]
        for beat, semis, length in ((0.0, 0, 1.6), (2.0, 0, 1.0), (3.5, 7, 0.5)):
            sig = S.synth_bass(hz(root + semis), length * g.beat, cutoff=260, drive=1.3)
            mix.add('bass', sig, at=g.t(bar, beat), gain=0.85, send=0.04)

    def add_drums(bar: int, full: bool = True) -> None:
        # Laid-back kick: on the one plus a late push before beat three.
        for beat, gain in ((0.0, 0.95), (2.75, 0.6)):
            mix.add('drums', S.kick(dur=0.5, punch=0.9, tone=52), at=g.t(bar, beat) + humanize(0.006), gain=gain, send=0.05)
        if full:
            for beat in (1, 3):
                mix.add('drums', S.snare(dur=0.38, tone=175), at=g.t(bar, beat) + humanize(0.01), gain=0.42, send=0.35)
        # Swung eighth-note hats.
        for i in range(8):
            swing = 0.06 if i % 2 else 0.0
            t = g.t(bar, i * 0.5 + swing) + humanize(0.005)
            mix.add('drums', S.hat(dur=0.07), at=t, gain=0.14 + (0.06 if i % 2 == 0 else 0.0), pan=0.3, send=0.05)
        for i in range(16):
            if i % 4 == 2:
                mix.add('drums', S.shaker(0.14), at=g.s(bar, i) + humanize(0.004), gain=0.22, pan=-0.35)
        if bar % 4 == 3:
            mix.add('drums', S.rim(0.1), at=g.t(bar, 3.5) + humanize(), gain=0.5, pan=-0.2, send=0.25)

    melody = [
        (0, 0.5, 'F#4', 1.0), (0, 1.5, 'A4', 0.5), (0, 2.0, 'B4', 1.5),
        (1, 0.0, 'D5', 1.0), (1, 1.0, 'B4', 0.5), (1, 1.5, 'A4', 1.5),
        (2, 0.0, 'F#4', 1.0), (2, 1.0, 'E4', 1.0), (2, 2.0, 'D4', 2.0),
        (3, 0.0, 'E4', 2.0), (3, 2.0, 'F#4', 2.0),
        (4, 0.0, 'A4', 1.0), (4, 1.0, 'B4', 1.0), (4, 2.0, 'D5', 1.5),
        (5, 0.0, 'E5', 1.0), (5, 1.0, 'D5', 0.5), (5, 1.5, 'B4', 1.5),
        (6, 0.0, 'A4', 1.0), (6, 1.0, 'F#4', 1.0), (6, 2.0, 'E4', 2.0),
        (7, 0.0, 'D4', 3.0),
    ]

    def add_melody(start_bar: int, gain: float = 0.4, instrument: str = 'flute') -> None:
        for offset, beat, name, length in melody:
            t = g.t(start_bar + offset, beat) + humanize(0.01)
            if instrument == 'flute':
                sig = S.flute(hz(S.note(name)), length * g.beat * 1.05)
            else:
                sig = S.lead(hz(S.note(name)), length * g.beat, vibrato=4.2, depth=0.1, kind='triangle', cutoff=2400)
            mix.add('melody', sig, at=t, gain=gain, pan=0.1, send=0.55)

    # ----- arrangement -----
    for bar in range(0, 8):  # intro
        add_keys(bar, 0.45)
        add_pad(bar)
    add_melody(4, 0.26)

    for bar in range(8, 24):  # groove
        add_keys(bar, 0.55)
        add_pad(bar)
        add_bass(bar)
        add_drums(bar)

    for bar in range(24, 40):  # melody section
        add_keys(bar, 0.5)
        add_pad(bar)
        add_bass(bar)
        add_drums(bar)
    add_melody(24, 0.4)
    add_melody(32, 0.34)

    for bar in range(40, 48):  # final chorus of sorts
        add_keys(bar, 0.6)
        add_pad(bar)
        add_bass(bar)
        add_drums(bar)
    add_melody(40, 0.4)

    for bar in range(48, 56):  # outro
        add_keys(bar, 0.45)
        add_pad(bar)
        if bar < 52:
            add_bass(bar)
            add_drums(bar, full=False)
    add_melody(48, 0.28)

    # Tape character on the harmonic material.
    for name in ('keys', 'pad', 'melody'):
        for ch in range(2):
            mix.buses[name][ch] = S.tape_wobble(mix.buses[name][ch], depth_ms=0.9, rate=0.23, seed=4 + ch)

    hiss = S.vinyl_noise(bars * g.bar, level=0.035)
    mix.add('texture', hiss, at=0, gain=0.7)
    mix.add('texture', S.tape_hiss(bars * g.bar, level=0.02), at=0, gain=0.5)

    ir = S.reverb_ir(seconds=2.2, decay=2.8, damp=4200, seed=8)
    return mix.render(ir, wet=0.4, target_rms=-14.5, fade_out=4.0, drive=1.05,
                      bus_targets={'keys': -19.5, 'melody': -21.0, 'texture': -30.0})


# --------------------------------------------------------------------------- #
# Tidal Bloom — ambient, F# major, 60 BPM feel
# --------------------------------------------------------------------------- #


def render_tidal_bloom() -> np.ndarray:
    duration = 176.0
    mix = S.Mix(duration, tail=8.0, seed=4)
    phrase = 16.0  # four slow bars

    chords = [
        [42, 49, 56, 58, 61],  # F#maj9
        [51, 58, 61, 66, 70],  # D#m9
        [47, 54, 58, 61, 63],  # Bmaj9
        [49, 56, 60, 63, 65],  # C#maj9
    ]

    # Deep drone bed.
    mix.add('drone', S.sub_pad(hz(30), duration, cutoff=140, attack=8.0, release=8.0), at=0, gain=0.55, send=0.2)
    mix.add('drone', S.sub_pad(hz(42), duration, cutoff=260, attack=6.0, release=8.0), at=0, gain=0.32, send=0.3)
    mix.add('drone', S.pad(hz(49), duration, cutoff=420, attack=10.0, release=8.0, detune=4, level=0.2), at=0, gain=0.3, send=0.5)

    # Evolving chord pads, one per phrase, with a slow breathing filter.
    for i in range(int(duration // phrase)):
        start = i * phrase
        voicing = chords[i % len(chords)]
        open_up = 1.0 + 0.9 * math.exp(-((start - 96.0) ** 2) / (2 * 28.0**2))
        for j, m in enumerate(voicing):
            cutoff = (900 + j * 120) * open_up
            sig = S.pad(
                hz(m),
                phrase * 0.92,
                cutoff=cutoff,
                attack=3.2,
                release=4.5,
                detune=9,
                level=0.3,
            )
            mix.add('pad', sig, at=start + j * 0.05, gain=0.4, pan=(j - 2) * 0.28, send=0.75)
        # Sub harmonic that follows the chord root.
        mix.add('pad', S.sub_pad(hz(voicing[0] - 12), phrase * 0.9, cutoff=110, attack=4.0, release=5.0), at=start, gain=0.4, send=0.15)

    # Bell constellation: sparse early, denser as the track opens up.
    rng = np.random.default_rng(12)
    scale = [66, 68, 70, 73, 75, 78, 80, 82]
    t = 12.0
    while t < duration - 10:
        progress = t / duration
        density = 0.35 + 0.75 * math.sin(math.pi * min(1.0, progress * 1.15))
        if rng.random() < density:
            n_bells = 3 if rng.random() < 0.25 else 1
            for _ in range(n_bells):
                midi = int(rng.choice(scale))
                dur = float(rng.uniform(7.0, 12.0))
                sig = S.bell(hz(midi), dur=dur, decay=float(rng.uniform(0.45, 0.8)), shimmer=0.3)
                mix.add(
                    'bells',
                    sig,
                    at=t + float(rng.uniform(-0.3, 0.3)),
                    gain=float(rng.uniform(0.08, 0.17)),
                    pan=float(rng.uniform(-0.65, 0.65)),
                    send=0.95,
                )
        t += float(rng.uniform(1.6, 4.2)) / max(0.4, density)

    # Shimmer: high sustained tones that drift in and out.
    for start in (48.0, 84.0, 112.0, 140.0):
        for offset, midi in enumerate((78, 85, 80, 87)):
            tone = S.osc('sine', hz(midi), 26.0)
            env = np.sin(np.linspace(0, np.pi, S.secs(26.0))) ** 2
            tone = tone * env * 0.05
            mix.add('shimmer', S.chorus(tone, rate=0.09, depth_ms=9.0, mix=0.5, seed=offset), at=start + offset * 1.5, gain=0.9, pan=(-0.5 + offset * 0.3), send=0.9)

    # Air / wind bed.
    mix.add('texture', S.wind(duration, level=0.16, seed=33), at=0, gain=0.9)
    mix.add('texture', S.tape_hiss(duration, level=0.012), at=0, gain=0.6)

    # A very slow pulse so the piece has a heartbeat without drums.
    for bar in range(0, int(duration // 4)):
        at = bar * 4.0
        pulse = S.synth_bass(hz(30), 3.4, cutoff=120, drive=1.0)
        mix.add('pulse', pulse, at=at, gain=0.16, send=0.4)

    ir = S.reverb_ir(seconds=7.0, decay=1.05, damp=3600, seed=17)
    return mix.render(ir, wet=1.0, target_rms=-18.0, fade_out=10.0, fade_in=2.0,
                      bus_targets={'bells': -25.0, 'pad': -20.5, 'drone': -23.0, 'shimmer': -28.0})


# --------------------------------------------------------------------------- #
# Static Bloom — downtempo, C minor, 90 BPM
# --------------------------------------------------------------------------- #


def render_static_bloom() -> np.ndarray:
    bpm = 90
    bars = 56
    g = Grid(bpm)
    mix = S.Mix(bars * g.bar, tail=6.0, seed=5)

    chords = [
        ([48, 51, 55, 58, 62], 36),  # Cm9
        ([44, 51, 55, 60, 62], 32),  # Abmaj7
        ([51, 58, 62, 67, 70], 39),  # Ebmaj9
        ([46, 53, 58, 60, 62], 34),  # Bb6/9
    ]

    kick_times: list[float] = []

    def add_strings(bar: int, gain: float = 0.4, cutoff: float = 950.0) -> None:
        voicing, _ = chords[bar % 4]
        for i, m in enumerate(voicing[1:]):
            sig = S.string_pad(hz(m), g.bar * 1.05, cutoff=cutoff + i * 90, attack=0.7, release=1.2)
            mix.add('strings', sig, at=g.t(bar) + i * 0.02, gain=gain * 0.55, pan=(i - 2) * 0.3, send=0.7)
        mix.add('strings', S.sub_pad(hz(voicing[0] - 12), g.bar, cutoff=120, attack=0.5, release=1.0), at=g.t(bar), gain=gain * 0.5, send=0.1)

    def add_keys(bar: int, gain: float = 0.5) -> None:
        voicing, _ = chords[bar % 4]
        for beat, dur, vel in ((0.0, 1.6, 1.0), (2.5, 1.2, 0.7)):
            for i, m in enumerate(voicing[1:4]):
                t = g.t(bar, beat) + i * 0.03 + humanize(0.01)
                sig = S.epiano(hz(m), dur * g.beat, velocity=vel * (0.85 + RNG.random() * 0.15), brightness=0.75)
                mix.add('keys', sig, at=t, gain=gain * 0.5, pan=(i - 1) * 0.25, send=0.45)

    def add_bass(bar: int, gain: float = 0.85) -> None:
        _, root = chords[bar % 4]
        mix.add('bass', S.sub_bass_808(hz(root), g.beat * 2.4, glide_from=1.0), at=g.t(bar), gain=gain, send=0.03)
        mix.add('bass', S.sub_bass_808(hz(root - 12), g.beat * 1.3), at=g.t(bar, 2.5), gain=gain * 0.55, send=0.03)
        if bar % 4 == 3:
            mix.add('bass', S.sub_bass_808(hz(root + 7), g.beat * 0.9), at=g.t(bar, 3.5), gain=gain * 0.5, send=0.03)

    def add_drums(bar: int, full: bool = True) -> None:
        for step, gain in ((0, 1.0), (10, 0.75)):
            t = g.s(bar, step)
            mix.add('drums', S.kick(dur=0.6, punch=1.1, tone=45), at=t, gain=gain * 0.9, send=0.08)
            kick_times.append(t)
        if full:
            mix.add('drums', S.snare(dur=0.5, tone=165), at=g.s(bar, 8) + humanize(), gain=0.65, send=0.4)
            if bar % 4 == 3:
                mix.add('drums', S.snare(dur=0.32, tone=200), at=g.s(bar, 14) + humanize(), gain=0.3, send=0.5)
        for step in range(16):
            swing = 0.5 if step % 2 else 0.0
            t = g.s(bar, step + swing * 0.12)
            gain = 0.15 if step % 4 == 0 else 0.09
            mix.add('drums', S.hat(dur=0.05), at=t, gain=gain, pan=0.35, send=0.1)
        if full:
            for step in (3, 11):
                mix.add('drums', S.shaker(0.12), at=g.s(bar, step), gain=0.18, pan=-0.3)

    def add_bells(start_bar: int, gain: float = 0.2) -> None:
        phrase = [(0, 1.0, 'C5'), (0, 2.5, 'G4'), (1, 0.0, 'Eb5'), (1, 2.0, 'Bb4'),
                  (2, 1.5, 'C5'), (2, 3.0, 'D5'), (3, 0.5, 'Eb5'), (3, 2.5, 'G4')]
        for offset, beat, name in phrase:
            sig = S.bell(hz(S.note(name)), dur=5.0, decay=1.1, shimmer=0.25)
            mix.add('bells', sig, at=g.t(start_bar + offset, beat), gain=gain, pan=0.2, send=0.9)

    # ----- arrangement -----
    for bar in range(0, 8):  # intro
        add_strings(bar, gain=0.45, cutoff=700 + bar * 60)
        if bar >= 4:
            add_bells(bar, 0.12)
    add_bells(0, 0.1)

    for bar in range(8, 24):  # beat enters
        add_strings(bar, gain=0.36)
        add_keys(bar, 0.5)
        add_bass(bar)
        add_drums(bar, full=bar >= 12)

    for bar in range(24, 32):  # bridge
        add_strings(bar, gain=0.4, cutoff=1500)
        add_keys(bar, 0.35)
    add_bells(24, 0.24)
    # Glitch the harmonic bus on the run-up to the drop.
    for name in ('strings', 'keys'):
        mix.buses[name] = S.stutter(mix.buses[name], g.t(30), g.bar * 1.2, slices=8, repeats=2)

    for bar in range(32, 48):  # full
        add_strings(bar, gain=0.4, cutoff=1200)
        add_keys(bar, 0.55)
        add_bass(bar)
        add_drums(bar)
    add_bells(32, 0.22)
    add_bells(40, 0.18)
    mix.buses['strings'] = S.stutter(mix.buses['strings'], g.t(46), g.bar, slices=6, repeats=1)

    for bar in range(48, 56):  # outro
        add_strings(bar, gain=0.4 - (bar - 48) * 0.03, cutoff=900)
        add_keys(bar, 0.35)
        if bar < 52:
            add_bass(bar, gain=0.5)
            add_drums(bar, full=False)
    add_bells(48, 0.2)

    mix.buses['strings'] = S.sidechain_duck(mix.buses['strings'], kick_times, depth=0.25, release=0.2)
    mix.buses['bass'] = S.sidechain_duck(mix.buses['bass'], kick_times, depth=0.4, release=0.25)

    for name in ('keys', 'strings'):
        for ch in range(2):
            mix.buses[name][ch] = S.tape_wobble(mix.buses[name][ch], depth_ms=0.7, rate=0.2, seed=9 + ch)

    mix.add('texture', S.vinyl_noise(bars * g.bar, level=0.035), at=0, gain=0.8)

    ir = S.reverb_ir(seconds=3.4, decay=2.0, damp=4000, seed=23)
    return mix.render(ir, wet=0.55, target_rms=-14.0, fade_out=4.5, drive=1.06,
                      bus_targets={'strings': -20.5, 'keys': -22.0, 'bells': -25.0})


# --------------------------------------------------------------------------- #
# Paper Planes — lo-fi, F major, 76 BPM
# --------------------------------------------------------------------------- #


def render_paper_planes() -> np.ndarray:
    bpm = 76
    bars = 48
    g = Grid(bpm)
    mix = S.Mix(bars * g.bar, tail=5.0, seed=6)

    chords = [
        ([41, 48, 52, 57, 60], 29),  # Fmaj7
        ([45, 52, 55, 60, 64], 33),  # Am7
        ([50, 57, 60, 65, 69], 38),  # Dm7
        ([46, 53, 57, 62, 65], 34),  # Bbmaj7
    ]

    def add_keys(bar: int, gain: float = 0.5) -> None:
        voicing, _ = chords[bar % 4]
        for i, m in enumerate(voicing):
            t = g.t(bar, 0.0) + i * 0.025 + humanize(0.008)
            sig = S.epiano(hz(m), g.bar * 0.9, velocity=0.75 + RNG.random() * 0.2, brightness=0.8)
            mix.add('keys', sig, at=t, gain=gain * (0.7 if i == 0 else 0.5), pan=(i - 2) * 0.16, send=0.35)
        for beat in (2.5, 3.5):
            if RNG.random() < 0.55:
                m = voicing[int(RNG.integers(2, 5))] + 12
                sig = S.epiano(hz(m), g.beat, velocity=0.35, brightness=0.6)
                mix.add('keys', sig, at=g.t(bar, beat) + humanize(0.012), gain=gain * 0.25, pan=0.3, send=0.55)

    def add_bass(bar: int) -> None:
        _, root = chords[bar % 4]
        for beat, semis, length in ((0.0, 0, 1.8), (2.5, 0, 0.9), (3.5, 4, 0.5)):
            sig = S.synth_bass(hz(root + semis), length * g.beat, cutoff=240, drive=1.2)
            mix.add('bass', sig, at=g.t(bar, beat), gain=0.8, send=0.03)

    def add_drums(bar: int, full: bool = True) -> None:
        for beat, gain in ((0.0, 0.9), (2.75, 0.55)):
            mix.add('drums', S.kick(dur=0.45, punch=0.8, tone=54), at=g.t(bar, beat) + humanize(0.006), gain=gain, send=0.04)
        if full:
            for beat in (1, 3):
                mix.add('drums', S.snare(dur=0.3, tone=185, noise_level=0.7), at=g.t(bar, beat) + humanize(0.01), gain=0.32, send=0.3)
        for i in range(8):
            swing = 0.055 if i % 2 else 0.0
            mix.add('drums', S.hat(dur=0.06), at=g.t(bar, i * 0.5 + swing), gain=0.12, pan=0.3)
        for i in range(0, 16, 2):
            if i % 4 == 2:
                mix.add('drums', S.shaker(0.13), at=g.s(bar, i), gain=0.14, pan=-0.3)
        if bar % 4 == 3:
            mix.add('drums', S.rim(0.09), at=g.t(bar, 3.5), gain=0.4, pan=-0.25, send=0.3)

    melody = [
        (0, 0.0, 'A4', 1.0), (0, 1.0, 'C5', 1.0), (0, 2.0, 'F5', 2.0),
        (1, 0.0, 'E5', 1.0), (1, 1.0, 'C5', 1.0), (1, 2.0, 'A4', 2.0),
        (2, 0.0, 'D5', 1.5), (2, 1.5, 'F5', 0.5), (2, 2.0, 'E5', 2.0),
        (3, 0.0, 'C5', 1.0), (3, 1.0, 'D5', 1.0), (3, 2.0, 'C5', 2.0),
        (4, 0.0, 'A4', 1.0), (4, 1.0, 'C5', 0.5), (4, 1.5, 'D5', 0.5), (4, 2.0, 'F5', 2.0),
        (5, 0.0, 'G5', 1.0), (5, 1.0, 'F5', 1.0), (5, 2.0, 'E5', 2.0),
        (6, 0.0, 'D5', 1.0), (6, 1.0, 'C5', 1.0), (6, 2.0, 'A4', 2.0),
        (7, 0.0, 'C5', 3.0),
    ]

    def add_melody(start_bar: int, gain: float = 0.35) -> None:
        for offset, beat, name, length in melody:
            sig = S.flute(hz(S.note(name)), length * g.beat * 1.1)
            mix.add('melody', sig, at=g.t(start_bar + offset, beat) + humanize(0.012), gain=gain, pan=0.15, send=0.5)

    for bar in range(0, 8):
        add_keys(bar, 0.45)
    add_melody(2, 0.22)

    for bar in range(8, 16):
        add_keys(bar)
        add_bass(bar)
        add_drums(bar)

    for bar in range(16, 32):
        add_keys(bar, 0.52)
        add_bass(bar)
        add_drums(bar)
    add_melody(16, 0.34)
    add_melody(24, 0.3)

    for bar in range(32, 40):
        add_keys(bar, 0.55)
        add_bass(bar)
        add_drums(bar)
    add_melody(32, 0.32)

    for bar in range(40, 48):
        add_keys(bar, 0.4)
        if bar < 44:
            add_bass(bar)
            add_drums(bar, full=False)

    for name in ('keys', 'melody'):
        for ch in range(2):
            mix.buses[name][ch] = S.tape_wobble(mix.buses[name][ch], depth_ms=1.0, rate=0.2, seed=13 + ch)
    mix.add('texture', S.vinyl_noise(bars * g.bar, level=0.04), at=0, gain=0.7)
    mix.add('texture', S.tape_hiss(bars * g.bar, level=0.018), at=0, gain=0.5)

    ir = S.reverb_ir(seconds=2.0, decay=3.0, damp=4200, seed=29)
    return mix.render(ir, wet=0.36, target_rms=-15.0, fade_out=4.0, drive=1.05,
                      bus_targets={'keys': -19.5, 'melody': -21.0, 'texture': -30.0})


# --------------------------------------------------------------------------- #
# Afterglow — synthwave ballad, D minor, 92 BPM
# --------------------------------------------------------------------------- #


def render_afterglow() -> np.ndarray:
    bpm = 92
    bars = 48
    g = Grid(bpm)
    mix = S.Mix(bars * g.bar, tail=6.0, seed=7)

    chords = [
        ([50, 57, 62, 65, 69], 38),  # Dm
        ([46, 53, 58, 62, 65], 34),  # Bb
        ([41, 48, 53, 57, 60], 29),  # F
        ([48, 55, 60, 64, 67], 36),  # C
    ]

    def add_pad(bar: int, gain: float = 0.5, cutoff: float = 1300.0) -> None:
        voicing, _ = chords[bar % 4]
        for i, m in enumerate(voicing):
            sig = S.pad(hz(m), g.bar, cutoff=cutoff, attack=0.6, release=0.9, detune=13, level=0.3)
            mix.add('pad', sig, at=g.t(bar) + i * 0.015, gain=gain, pan=(i - 2) * 0.22, send=0.5)
        mix.add('pad', S.sub_pad(hz(voicing[0] - 12), g.bar, cutoff=140, attack=0.4, release=0.8), at=g.t(bar), gain=gain * 0.6, send=0.1)

    def add_arp(bar: int, gain: float = 0.3) -> None:
        voicing, _ = chords[bar % 4]
        pattern = [0, 2, 4, 2, 1, 3, 4, 3]
        for i in range(8):
            m = voicing[pattern[i] % len(voicing)] + 12
            sig = S.pluck(hz(m), g.beat * 0.55, cutoff=2200, kind='triangle', decay=9.0)
            mix.add('arp', sig, at=g.t(bar, i * 0.5), gain=gain * (0.9 if i % 2 == 0 else 0.6), pan=-0.25, send=0.6)

    def add_bass(bar: int, gain: float = 0.7) -> None:
        _, root = chords[bar % 4]
        for beat, length in ((0.0, 1.5), (2.0, 0.9), (3.0, 0.9)):
            sig = S.synth_bass(hz(root), length * g.beat, cutoff=300, drive=1.4)
            mix.add('bass', sig, at=g.t(bar, beat), gain=gain, send=0.04)

    def add_drums(bar: int, full: bool = True) -> None:
        for beat in (0, 2):
            mix.add('drums', S.kick(dur=0.55, punch=0.9, tone=46), at=g.t(bar, beat), gain=0.8, send=0.06)
        if full:
            for beat in (1, 3):
                mix.add('drums', S.snare(dur=0.45, tone=180), at=g.t(bar, beat) + humanize(), gain=0.5, send=0.35)
        for i in range(8):
            mix.add('drums', S.hat(dur=0.07), at=g.t(bar, i * 0.5), gain=0.12 if i % 2 else 0.16, pan=0.3)

    melody = [
        (0, 0.0, 'D5', 2.0), (0, 2.0, 'F5', 2.0),
        (1, 0.0, 'E5', 1.0), (1, 1.0, 'D5', 1.0), (1, 2.0, 'C5', 2.0),
        (2, 0.0, 'A4', 1.5), (2, 1.5, 'C5', 0.5), (2, 2.0, 'D5', 2.0),
        (3, 0.0, 'E5', 2.0), (3, 2.0, 'G5', 2.0),
        (4, 0.0, 'F5', 1.5), (4, 1.5, 'E5', 0.5), (4, 2.0, 'D5', 2.0),
        (5, 0.0, 'C5', 1.0), (5, 1.0, 'D5', 1.0), (5, 2.0, 'F5', 2.0),
        (6, 0.0, 'A5', 2.0), (6, 2.0, 'G5', 1.0), (6, 3.0, 'F5', 1.0),
        (7, 0.0, 'D5', 3.0),
    ]

    def add_lead(start_bar: int, gain: float = 0.42) -> None:
        for offset, beat, name, length in melody:
            sig = S.lead(hz(S.note(name)), length * g.beat * 0.98, vibrato=4.8, depth=0.2, kind='saw', cutoff=3200)
            sig = S.stereo_delay(sig, g.beat * 0.75, feedback=0.25, mix=0.18, taps=3, tone=2800)
            mix.add('lead', sig, at=g.t(start_bar + offset, beat), gain=gain, send=0.55)

    # ----- arrangement -----
    for bar in range(0, 8):
        add_pad(bar, 0.45, 900)
        add_arp(bar, 0.18)
    for bar in range(8, 16):
        add_pad(bar, 0.5, 1200)
        add_arp(bar, 0.26)
        add_bass(bar, 0.4)
        add_drums(bar, full=False)
    for bar in range(16, 32):
        add_pad(bar, 0.52)
        add_arp(bar, 0.28)
        add_bass(bar, 0.7)
        add_drums(bar)
    add_lead(16, 0.4)
    add_lead(24, 0.34)

    for bar in range(32, 40):  # stripped back break
        add_pad(bar, 0.55, 1600)
        add_arp(bar, 0.22)
    add_lead(32, 0.44)

    for bar in range(40, 48):
        add_pad(bar, 0.5 - (bar - 40) * 0.02)
        add_arp(bar, 0.25 - (bar - 40) * 0.015)
        if bar < 44:
            add_bass(bar, 0.5)
            add_drums(bar, full=False)
    add_lead(40, 0.36)

    kicks = [g.t(bar, beat) for bar in range(48) for beat in (0, 2)]
    for name in ('pad', 'arp'):
        mix.buses[name] = S.sidechain_duck(mix.buses[name], kicks, depth=0.25, release=0.2)

    ir = S.reverb_ir(seconds=3.0, decay=2.2, damp=4800, seed=31)
    return mix.render(ir, wet=0.5, target_rms=-14.0, fade_out=5.0, drive=1.03,
                      bus_targets={'lead': -18.5, 'arp': -23.0, 'pad': -20.5},
                      stereo_width=1.0)


RENDERERS = {
    'neon-drift': render_neon_drift,
    'golden-hour': render_golden_hour,
    'tidal-bloom': render_tidal_bloom,
    'static-bloom': render_static_bloom,
    'paper-planes': render_paper_planes,
    'afterglow': render_afterglow,
}


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #


def write_mp3(path: Path, audio: np.ndarray, bitrate: int = 160) -> None:
    """Encode float stereo audio to MP3 with LAME.

    soundfile's MP3 writer is handy but was producing large decode overshoots
    on this material, so encode through lameenc and clip to int16 ourselves.
    """
    pcm = (np.clip(audio.T, -1.0, 1.0) * 32767.0).astype(np.int16)
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bitrate)
    encoder.set_in_sample_rate(S.SR)
    encoder.set_channels(2)
    encoder.set_quality(2)
    data = encoder.encode(pcm.tobytes()) + encoder.flush()
    path.write_bytes(data)


def main() -> None:
    import sys

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    wanted = sys.argv[1:] or [spec['id'] for spec in CATALOG]
    existing: dict[str, dict] = {}
    if DATA_FILE.exists():
        for entry in json.loads(DATA_FILE.read_text()):
            existing[entry['id']] = entry

    for spec in CATALOG:
        if spec['id'] not in wanted:
            continue
        print(f"→ {spec['title']} ({spec['genre']}, {spec['bpm']} BPM)", flush=True)
        audio = RENDERERS[spec['id']]()
        path = AUDIO_DIR / f"{spec['id']}.mp3"
        write_mp3(path, audio)
        seconds = audio.shape[1] / S.SR
        existing[spec['id']] = {
            **spec,
            'audio': f'/audio/{spec["id"]}.mp3',
            'duration': round(seconds, 2),
            'bytes': path.stat().st_size,
        }
        print(f"   {seconds:0.1f}s  {path.stat().st_size / 1e6:0.2f} MB  → {path}", flush=True)

    ordered = [existing[spec['id']] for spec in CATALOG if spec['id'] in existing]
    DATA_FILE.write_text(json.dumps(ordered, indent=2) + '\n')
    print(f'\nCatalog written to {DATA_FILE}')


if __name__ == '__main__':
    main()
