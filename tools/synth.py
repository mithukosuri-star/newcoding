"""PratMusic original-track synthesizer.

Renders original dream-pop / synth-pop / dance-pop compositions (CC0) that sit
*in the vibe* of famous pop artists without copying any of their actual
recordings. Melodies are generated from seeded RNG walks over chord scales, so
every track is deterministic, original and freely licensed.

A formant "vocal-lead" voice (sawtooth shaped by vowel formant envelopes, with
vibrato and portamento) gives the tracks a human-vocal register feel. These are
synthesized voices, not samples of any real singer.
"""

import math
import os

import numpy as np

SR = 22050  # sample rate (synth demos; keeps files small)

# ---------------------------------------------------------------------------
# Music theory helpers
# ---------------------------------------------------------------------------
SCALES = {
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "major": [0, 2, 4, 5, 7, 9, 11],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
}
CHORDS = {  # semitone offsets from root
    "maj": [0, 4, 7], "min": [0, 3, 7], "maj7": [0, 4, 7, 11],
    "min7": [0, 3, 7, 10], "sus2": [0, 2, 7], "add9": [0, 4, 7, 14],
    "dim": [0, 3, 6],
}

def midi_to_freq(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))

def build_chord(root_midi, scale, degree):
    """Chord on scale degree `degree` (0-based) using scale notes stacked in 3rds."""
    scale = SCALES[scale]
    idx = degree % len(scale)
    octave = (degree // len(scale)) * 12
    tones = [root_midi + octave + scale[(idx + 2 * k) % len(scale)] +
             12 * ((idx + 2 * k) // len(scale)) for k in range(3)]
    return tones

def progression_degrees(kind):
    """Return scale-degree lists for common progressions (minor-key friendly)."""
    return {
        "cinematic": [0, 5, 2, 6],        # i - VI - III - VII
        "nocturnal": [0, 3, 6, 4],        # i - iv - VII - v
        "disco": [0, 5, 6, 3],            # i - VI - VII - iv
        "rnb": [0, 5, 1, 4],              # i - VI - ii - V
        "anthem": [0, 5, 6, 4],           # i - VI - VII - v
    }[kind]

# ---------------------------------------------------------------------------
# Core oscillators / envelopes
# ---------------------------------------------------------------------------
def adsr(n, a, d, s, r, sr=SR):
    """Attack/decay/sustain/release envelope of length n samples."""
    a_n, d_n, r_n = int(a * sr), int(d * sr), int(r * sr)
    s_n = max(0, n - a_n - d_n - r_n)
    env = np.zeros(n)
    i = 0
    if a_n > 0:
        env[:a_n] = np.linspace(0.0, 1.0, a_n); i = a_n
    if d_n > 0:
        env[i:i + d_n] = np.linspace(1.0, s, d_n); i += d_n
    if s_n > 0:
        env[i:i + s_n] = s; i += s_n
    if r_n > 0 and i < n:
        start = env[i - 1] if i > 0 else s
        env[i:] = np.linspace(start, 0.0, n - i)
    return env

def saw(phase):  # phase in cycles (0..1 per cycle), vectorized
    return 2.0 * (phase - np.floor(phase + 0.5))

def square(phase, duty=0.5):
    return np.where((phase % 1.0) < duty, 1.0, -1.0)

def tri(phase):
    return 2.0 * np.abs(2.0 * (phase - np.floor(phase + 0.5))) - 1.0

def sine(phase):
    return np.sin(2.0 * np.pi * phase)

def freq_phase(f0, n, sr=SR, vib_rate=0.0, vib_depth=0.0, seed=0):
    """Phase (in cycles) with optional vibrato; returns (phase, t)."""
    t = np.arange(n) / sr
    inst = f0 * (1.0 + vib_depth * np.sin(2 * math.pi * vib_rate * t))
    phase = np.cumsum(inst) / sr
    return phase, t

def lowpass_spectral(x, fc, sr=SR, order=2):
    """Zero-phase-ish spectral lowpass (smooth rolloff)."""
    n = len(x)
    sp = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / sr)
    sp *= 1.0 / (1.0 + (f / max(fc, 1.0)) ** order)
    return np.fft.irfft(sp, n)

def highpass_spectral(x, fc, sr=SR, order=2):
    n = len(x)
    sp = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / sr)
    sp *= 1.0 / (1.0 + (fc / np.maximum(f, 20.0)) ** order)
    return np.fft.irfft(sp, n)

# ---------------------------------------------------------------------------
# Formant "vocal" voice  (vowel-shaped synthesized lead — no human samples)
# ---------------------------------------------------------------------------
VOWELS = {  # (F1, F2, F3) in Hz, amplitudes
    "a": [(730, 1.00), (1090, 0.55), (2440, 0.28)],
    "e": [(530, 1.00), (1840, 0.45), (2480, 0.22)],
    "i": [(270, 0.95), (2290, 0.50), (3010, 0.20)],
    "o": [(570, 1.00), (840, 0.60), (2410, 0.20)],
    "u": [(300, 0.95), (870, 0.55), (2240, 0.25)],
}

def voice_note(f0, dur, vowel="a", sr=SR, vib_rate=5.2, vib_depth=0.012,
               breath=0.05, glide_from=None):
    n = int(dur * sr)
    if glide_from:
        f0_arr = np.linspace(glide_from, f0, n)
        phase = np.cumsum(f0_arr) / sr
    else:
        phase, _ = freq_phase(f0, n, sr, vib_rate, vib_depth)
    src = saw(phase)
    # Shape the harmonic series with vowel formants (spectral domain).
    sp = np.fft.rfft(src)
    freqs = np.fft.rfftfreq(n, 1.0 / sr)
    env = np.zeros_like(freqs)
    for fc, amp in VOWELS[vowel]:
        env += amp * np.exp(-0.5 * ((freqs - fc) / (fc * 0.10)) ** 2)
    env += 0.12 * np.exp(-0.5 * ((freqs - 3100) / 1400.0) ** 2)  # air
    tilt = np.maximum(freqs + 250.0, 1.0) ** -0.35               # natural rolloff
    out = np.fft.irfft(sp * env * tilt, n)
    # breath noise
    rng = np.random.default_rng(int(f0 * 100) % 2**31)
    out += breath * rng.standard_normal(n) * np.linspace(0.4, 1.0, n)
    env_a = adsr(n, min(0.09, dur * 0.3), 0.10, 0.85, min(0.14, dur * 0.4))
    return out * env_a

# ---------------------------------------------------------------------------
# Instruments
# ---------------------------------------------------------------------------
def kick(dur=0.32, sr=SR):
    n = int(dur * sr); t = np.arange(n) / sr
    f = 45.0 + 105.0 * np.exp(-t / 0.035)
    ph = np.cumsum(f) / sr
    body = sine(ph) * np.exp(-t / 0.11)
    click = highpass_spectral(np.sin(2 * np.pi * 1200 * t) * np.exp(-t / 0.008), 900)
    return (body + 0.25 * click) * 0.95

def snare(dur=0.22, sr=SR):
    n = int(dur * sr); t = np.arange(n) / sr
    rng = np.random.default_rng(7)
    noise = highpass_spectral(rng.standard_normal(n), 1400, order=1) * np.exp(-t / 0.06)
    tone = sine(2 * np.pi * 190 * t) * np.exp(-t / 0.09)
    return 0.7 * noise + 0.5 * tone

def clap(dur=0.25, sr=SR):
    n = int(dur * sr); t = np.arange(n) / sr
    rng = np.random.default_rng(11)
    noise = rng.standard_normal(n)
    env = np.zeros(n)
    for off_ms in (0, 11, 23, 38):
        o = int(off_ms / 1000 * sr)
        if o < n:
            env[o:] += np.exp(-(t[:n - o] - 0) / 0.012)
    env = np.clip(env, 0, 1.2) * np.exp(-t / 0.09)
    return highpass_spectral(noise * env, 900, order=1) * 0.8

def hat(dur=0.06, open_=False, sr=SR):
    n = int(dur * sr); t = np.arange(n) / sr
    rng = np.random.default_rng(23)
    noise = rng.standard_normal(n)
    env = np.exp(-t / (0.03 if not open_ else 0.14))
    return highpass_spectral(noise * env, 6800, order=1) * 0.5

def bass_note(f0, dur, sr=SR, sub=True):
    n = int(dur * sr)
    phase, _ = freq_phase(f0, n, sr)
    o = saw(phase) * 0.6 + (sine(phase) if sub else 0.0) * 0.7
    o = lowpass_spectral(o, 320, order=2)
    return o * adsr(n, 0.008, 0.08, 0.75, min(0.12, dur * 0.4)) * 0.9

def pluck(f0, dur, sr=SR, bright=1.0):
    n = int(dur * sr)
    phase, _ = freq_phase(f0, n, sr)
    o = 0.55 * tri(phase) + 0.35 * square(phase, 0.35)
    o = lowpass_spectral(o, 1200 * bright + 600, order=2)
    return o * adsr(n, 0.004, 0.16, 0.25, 0.10) * 0.6

def pad_chord(freqs, dur, sr=SR, detune=0.006):
    n = int(dur * sr)
    out = np.zeros(n)
    for f0 in freqs:
        for dt in (-detune, 0.0, detune):
            phase, _ = freq_phase(f0 * (1 + dt), n, sr)
            out += saw(phase)
    out /= (len(freqs) * 3)
    out = lowpass_spectral(out, 1500, order=2)
    a = min(1.2, dur * 0.4)
    return out * adsr(n, a, 0.4, 0.85, min(1.2, dur * 0.45)) * 0.5

def stab_chord(freqs, dur, sr=SR):
    n = int(dur * sr)
    out = np.zeros(n)
    for f0 in freqs:
        for dt in (-0.008, 0.004):
            phase, _ = freq_phase(f0 * (1 + dt), n, sr)
            out += saw(phase)
    out /= (len(freqs) * 2)
    out = lowpass_spectral(out, 3200, order=2)
    return out * adsr(n, 0.005, 0.12, 0.35, min(0.25, dur * 0.5)) * 0.7

# ---------------------------------------------------------------------------
# Effects
# ---------------------------------------------------------------------------
def make_ir(dur=1.5, decay=5.5, sr=SR, seed=0):
    n = int(dur * sr); t = np.arange(n) / sr
    rng = np.random.default_rng(seed)
    ir = rng.standard_normal(n) * np.exp(-decay * t)
    ir = lowpass_spectral(ir, 5200, order=1)
    return ir / (np.max(np.abs(ir)) + 1e-9)

def reverb(x, ir, mix=0.35):
    n = len(x) + len(ir) - 1
    size = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
    peak = np.max(np.abs(y)) + 1e-9
    return x * (1 - mix) + (y / peak) * mix * np.max(np.abs(x))

def echo(x, dt=0.34, fb=0.32, taps=4, mix=0.22, sr=SR):
    d = int(dt * sr)
    out = x.copy()
    for i in range(1, taps + 1):
        off = i * d
        if off < len(x):
            out[off:] += (fb ** (i - 1)) * mix * x[:len(x) - off]
    return out

# ---------------------------------------------------------------------------
# Sequencing / composition
# ---------------------------------------------------------------------------
def melody_events(bpm, bars, root, scale, prog_degrees, seed, density=0.62,
                  octave=12, phrase_bars=2):
    """Random-walk melody over the chord scale; returns (bar, beat, midi, dur_beats)."""
    rng = np.random.default_rng(seed)
    scale = SCALES[scale]
    events = []
    pos = 0  # in 8th-note units
    total_eighths = bars * 8
    deg = 3  # start on scale degree 3
    while pos < total_eighths:
        bar = pos // 8
        chord_deg = prog_degrees[(bar // 2) % len(prog_degrees)]
        # bias walk toward chord tones
        options = []
        for step in (-2, -1, -1, 0, 0, 1, 1, 2, 3, -3):
            cand = deg + step
            if 0 <= cand < len(scale) * 2:
                tone = scale[cand % 7] + 12 * (cand // 7)
                chord_tones = [build_chord(root, scale_name_of(scale), chord_deg)[k] % 12
                               for k in range(3)]
                if (root + tone) % 12 in chord_tones:
                    options.extend([cand] * 3)
                else:
                    options.append(cand)
        deg = options[rng.integers(0, len(options))]
        dur = 2 if rng.random() < 0.35 else 1
        if rng.random() < density:
            events.append((bar, (pos % 8) / 2.0, root + octave + scale[deg % 7]
                           + 12 * (deg // 7), dur / 2.0))
        pos += dur
    return events

def scale_name_of(scale_list):
    for name, s in SCALES.items():
        if s == scale_list:
            return name
    return "minor"

def render_track(bpm, root_midi, scale, prog_kind, seed, target_secs,
                 energy=0.5, vibe="default"):
    """Render one track to a float32 mono numpy array."""
    beat = 60.0 / bpm
    bars = max(16, int(round(target_secs / (beat * 4))))
    prog = progression_degrees(prog_kind)
    rng = np.random.default_rng(seed + 999)

    total = int(bars * 4 * beat * SR) + SR
    master = np.zeros(total, dtype=np.float64)

    def add(buf, t_sec, gain=1.0):
        i = int(t_sec * SR)
        j = min(len(buf), total - i)
        if j > 0:
            master[i:i + j] += buf[:j] * gain

    # Section layout: intro / verse / chorus / verse / chorus / bridge / chorus / outro
    sections = [("intro", 2), ("verse", 8), ("chorus", 8), ("verse", 8),
                ("chorus", 8), ("bridge", 4), ("chorus", 8), ("outro", 2)]
    sections = [s for s in sections if sum(b for _, b in sections) >= bars]
    # Trim to exact bar count
    plan, used = [], 0
    for name, b in sections:
        if used + b > bars:
            b = bars - used
        if b <= 0:
            break
        plan.append((name, b))
        used += b

    # Section lookup per bar
    def plan_bar_section(bar):
        acc = 0
        for name, b in plan:
            if bar < acc + b:
                return name
            acc += b
        return "outro"

    # --- PAD bus -----------------------------------------------------------
    for bar in range(bars):
        sec = plan_bar_section(bar)
        if sec in ("intro", "outro", "bridge") and rng.random() < 0.25:
            continue
        deg = prog[(bar // 2) % len(prog)]
        tones = build_chord(root_midi, scale, deg)
        freqs = [midi_to_freq(m + 12) for m in tones]
        if sec == "chorus":
            freqs = [midi_to_freq(m + 12) for m in build_chord(root_midi, scale, deg) + [tones[0] + 24]]
        pad = pad_chord(freqs, beat * 4)
        add(pad, bar * 4 * beat, gain={"intro": 0.5, "outro": 0.45,
                                       "bridge": 0.6, "verse": 0.7, "chorus": 0.85}[sec])

    # --- BASS bus ----------------------------------------------------------
    for bar in range(bars):
        sec = plan_bar_section(bar)
        if sec == "intro":
            continue
        deg = prog[(bar // 2) % len(prog)]
        root_tone = build_chord(root_midi, scale, deg)[0] - 12
        pattern = [0, 1.5, 2, 3, 3.5] if energy > 0.7 else [0, 1.5, 2.5, 3.5]
        if sec == "verse":
            pattern = pattern[:3]
        for beatpos in pattern:
            f0 = midi_to_freq(root_tone)
            add(bass_note(f0, beat * (0.9 if beatpos % 1 else 0.45)),
                (bar * 4 + beatpos) * beat, gain=0.9)

    # --- DRUM bus ----------------------------------------------------------
    for bar in range(bars):
        sec = plan_bar_section(bar)
        if sec == "intro" and bar < 2:
            continue
        base = bar * 4 * beat
        if sec in ("chorus", "bridge") or energy > 0.6:
            for bt in (0, 1, 2, 3):  # four on the floor
                add(kick(), base + bt * beat, gain=0.95)
        else:  # laid-back
            add(kick(), base, gain=0.8)
            add(kick(), base + 2.5 * beat, gain=0.7)
        if sec != "intro":
            add(snare(), base + beat, gain=0.7)
            add(snare(), base + 3 * beat, gain=0.7)
        for k in range(8):  # hats
            open_ = (k == 7)
            add(hat(open_=open_), base + k * beat / 2, gain=0.5 if sec == "chorus" else 0.32)
        if sec == "chorus" and bar % 4 == 3:
            add(clap(), base + 3 * beat, gain=0.55)

    # --- ARP / STAB bus ----------------------------------------------------
    if energy > 0.55:
        for bar in range(bars):
            sec = plan_bar_section(bar)
            if sec == "intro":
                continue
            deg = prog[(bar // 2) % len(prog)]
            tones = build_chord(root_midi, scale, deg)
            if sec == "chorus":
                for k in range(8):  # arpeggio
                    m = tones[k % len(tones)] + 24
                    add(pluck(midi_to_freq(m), beat * 0.5, bright=1.2),
                        (bar * 4 + k * 0.5) * beat, gain=0.5)
            elif sec in ("verse", "bridge"):
                for bt in (1.5, 3.5):  # stabs
                    freqs = [midi_to_freq(m + 12) for m in tones]
                    add(stab_chord(freqs, beat * 0.5), (bar * 4 + bt) * beat, gain=0.4)

    # --- VOCAL-LEAD bus (formant voice) ------------------------------------
    mel = melody_events(bpm, bars, root_midi, scale, prog, seed,
                        density=0.5 + 0.25 * energy, octave=12)
    phrase = ["a", "e", "o", "i", "u", "o", "e", "a"] if vibe != "rnb" else \
             ["a", "i", "e", "o", "u", "a", "o", "i"]
    for i, (bar, beatpos, midi, dur_beats) in enumerate(mel):
        sec = plan_bar_section(bar)
        if sec == "intro" and bar < 1:
            continue
        if sec == "outro" and rng.random() < 0.5:
            continue
        vowel = phrase[(bar + i) % len(phrase)]
        dur = min(dur_beats * beat * 0.95, 1.4)
        f0 = midi_to_freq(midi)
        glide = None
        if i > 0 and rng.random() < 0.3:  # occasional portamento
            prev = mel[i - 1][2]
            glide = midi_to_freq(prev)
        v = voice_note(f0, dur, vowel=vowel, glide_from=glide)
        gain = {"verse": 0.85, "chorus": 1.0, "bridge": 0.9,
                "intro": 0.6, "outro": 0.55}[sec]
        add(v, (bar * 4 + beatpos) * beat, gain=gain)

    # "ooh" backing voice on choruses (dream-pop texture)
    for bar in range(bars):
        if plan_bar_section(bar) != "chorus" or bar % 2:
            continue
        deg = prog[(bar // 2) % len(prog)]
        for m in build_chord(root_midi, scale, deg)[:2]:
            add(voice_note(midi_to_freq(m + 12), beat * 3.6, vowel="u",
                           vib_rate=4.6, breath=0.02) * 0.28,
                bar * 4 * beat, gain=0.5)

    # --- FX: echo + reverb + master ----------------------------------------
    ir = make_ir(1.6, decay=4.5, seed=seed)
    master = echo(master, dt=beat * 0.75, fb=0.30, taps=3, mix=0.16)
    master = reverb(master, ir, mix=0.30)

    # fade in/out
    fade = int(2.0 * SR)
    master[:fade] *= np.linspace(0, 1, fade)
    master[-fade:] *= np.linspace(1, 0, fade)

    # normalize + soft clip
    master = np.tanh(master * 1.1)
    peak = np.max(np.abs(master)) + 1e-9
    master = master / peak * 0.89
    return master.astype(np.float32)

# ---------------------------------------------------------------------------
# WAV writer
# ---------------------------------------------------------------------------
def write_wav(path, samples, sr=SR):
    import wave
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.clip(samples, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    return os.path.getsize(path)
