"""Offline synthesis toolkit used to render Sonora's built-in catalogue.

Everything here is deterministic: seeds are fixed so re-running the generator
reproduces the same audio. All signals are float64 at 44.1 kHz and peak-safe
once they pass through :meth:`Mix.render`.
"""

from __future__ import annotations

import math

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
NYQUIST = SR / 2

# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #


def secs(seconds: float) -> int:
    """Convert seconds to a whole number of samples."""
    return max(1, int(round(seconds * SR)))


_PITCH_CLASS = {
    'C': 0,
    'C#': 1,
    'Db': 1,
    'D': 2,
    'D#': 3,
    'Eb': 3,
    'E': 4,
    'F': 5,
    'F#': 6,
    'Gb': 6,
    'G': 7,
    'G#': 8,
    'Ab': 8,
    'A': 9,
    'A#': 10,
    'Bb': 10,
    'B': 11,
}


def note(name: str | int) -> int:
    """Convert a note name such as ``C#4`` into a MIDI number."""
    if isinstance(name, (int, np.integer)):
        return int(name)
    flat = 1 if len(name) > 1 and name[1] in '#b' else 0
    pitch, octave = name[: flat + 1], int(name[flat + 1 :])
    return 12 * (octave + 1) + _PITCH_CLASS[pitch]


def chord(*names: str) -> list[int]:
    return [note(name) for name in names]


def hz(value: float | np.ndarray) -> float | np.ndarray:
    """MIDI number(s) to frequency in Hz."""
    return 440.0 * 2.0 ** ((np.asarray(value, dtype=float) - 69.0) / 12.0)


def db(gain_db: float) -> float:
    return 10.0 ** (gain_db / 20.0)


# --------------------------------------------------------------------------- #
# Envelopes
# --------------------------------------------------------------------------- #


def env_adsr(dur: float, a: float = 0.01, d: float = 0.12, s: float = 0.8, r: float = 0.35) -> np.ndarray:
    """A linear ADSR covering exactly ``dur`` seconds plus the release tail.

    Attack and decay are squeezed into the held portion so the returned
    envelope always matches a signal rendered for ``dur + r`` seconds.
    """
    hold = secs(dur)
    total = secs(dur + max(0.0, r))
    na = min(secs(a), hold)
    nd = min(secs(d), max(0, hold - na))
    nh = max(0, hold - na - nd)
    nr = max(0, total - hold)

    attack = np.linspace(0.0, 1.0, na, endpoint=False) ** 0.7 if na else np.empty(0)
    decay = np.linspace(1.0, s, nd, endpoint=False) if nd else np.empty(0)
    sustain = np.full(nh, s)
    release = (np.linspace(1.0, 0.0, nr, endpoint=False) ** 1.6) * s if nr else np.empty(0)

    env = np.concatenate([attack, decay, sustain, release])
    if env.size < total:
        env = np.pad(env, (0, total - env.size))
    return env[:total]


def env_exp(dur: float, decay: float, attack: float = 0.002) -> np.ndarray:
    """Exponential decay envelope with a short click-free attack."""
    n = secs(dur)
    t = np.arange(n) / SR
    env = np.exp(-t * decay)
    na = secs(attack)
    if na > 1:
        env[:na] *= np.linspace(0.0, 1.0, na)
    return env


def env_bell(dur: float, decay: float = 1.4, attack: float = 0.004) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    env = np.exp(-t * decay) * np.minimum(1.0, t / attack)
    return env


# --------------------------------------------------------------------------- #
# Oscillators
# --------------------------------------------------------------------------- #


def _polyblep_saw(phase: np.ndarray, dt: np.ndarray) -> np.ndarray:
    y = 2.0 * phase - 1.0
    narrow = dt < 0.5

    mask = narrow & (phase < dt)
    x = phase[mask] / np.maximum(dt[mask], 1e-9)
    y[mask] -= x + x - x * x - 1.0

    mask = narrow & (phase > 1.0 - dt)
    x = (phase[mask] - 1.0) / np.maximum(dt[mask], 1e-9)
    y[mask] -= x * x + x + x + 1.0
    return y


def osc(kind: str, freq: float | np.ndarray, dur: float, phase: float = 0.0, seed: int = 0) -> np.ndarray:
    """Band-limited oscillator. ``freq`` may be a scalar or a per-sample array."""
    n = secs(dur)
    if np.isscalar(freq):
        f = np.full(n, float(freq))
    else:
        f = np.asarray(freq, dtype=float)
        if f.size == 1:
            f = np.full(n, float(f[0]))
        elif f.size < n:
            f = np.interp(np.arange(n), np.linspace(0, n - 1, f.size), f)
    phase = phase + seed * 0.61803398875 % 1.0
    ph = (np.cumsum(f) / SR + phase) % 1.0

    if kind == 'sine':
        return np.sin(2.0 * np.pi * ph)
    if kind == 'triangle':
        return 2.0 * np.abs(2.0 * ph - 1.0) - 1.0
    if kind == 'saw':
        return _polyblep_saw(ph, np.abs(f) / SR)
    if kind == 'square':
        return _polyblep_saw(ph, np.abs(f) / SR) - _polyblep_saw((ph + 0.5) % 1.0, np.abs(f) / SR)
    if kind == 'pulse':
        width = 0.3
        a = _polyblep_saw(ph, np.abs(f) / SR)
        b = _polyblep_saw((ph + width) % 1.0, np.abs(f) / SR)
        return a - b
    raise ValueError(f'unknown oscillator {kind!r}')


def lfo(rate: float, dur: float, depth: float = 1.0, phase: float = 0.0, shape: str = 'sine') -> np.ndarray:
    return depth * osc(shape, rate, dur, phase=phase)


def supersaw(
    freq: float,
    dur: float,
    voices: int = 5,
    detune_cents: float = 12.0,
    kind: str = 'saw',
    width: float = 1.0,
    seed: int = 1,
) -> np.ndarray:
    """Detuned, stereo-spread oscillator stack."""
    rng = np.random.default_rng(seed)
    n = secs(dur)
    out = np.zeros((2, n))
    offsets = np.linspace(-1.0, 1.0, voices) if voices > 1 else np.array([0.0])
    for offset in offsets:
        cents = offset * detune_cents
        # Each side gets its own slightly detuned oscillator: panning a single
        # mono voice only changes level, which leaves the image nearly mono.
        f_left = float(hz(freq)) * 2.0 ** ((cents - 2.5) / 1200.0)
        f_right = float(hz(freq)) * 2.0 ** ((cents + 2.5) / 1200.0)
        left_sig = osc(kind, f_left, dur, phase=float(rng.random()))
        right_sig = osc(kind, f_right, dur, phase=float(rng.random()))
        pan = offset * 0.7 * width
        left = math.cos((pan + 1.0) * math.pi / 4.0)
        right = math.sin((pan + 1.0) * math.pi / 4.0)
        out[0] += left_sig * left
        out[1] += right_sig * right
    peak = np.max(np.abs(out)) or 1.0
    return out / peak


# --------------------------------------------------------------------------- #
# Filters & effects
# --------------------------------------------------------------------------- #


def lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    cutoff = min(cutoff, NYQUIST * 0.92)
    sos = butter(order, cutoff, btype='low', fs=SR, output='sos')
    return sosfilt(sos, x, axis=-1)


def highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    cutoff = max(cutoff, 20.0)
    sos = butter(order, cutoff, btype='high', fs=SR, output='sos')
    return sosfilt(sos, x, axis=-1)


def bandpass(x: np.ndarray, low: float, high: float, order: int = 2) -> np.ndarray:
    low = max(low, 20.0)
    high = min(high, NYQUIST * 0.92)
    sos = butter(order, [low, high], btype='band', fs=SR, output='sos')
    return sosfilt(sos, x, axis=-1)


def tape_sat(x: np.ndarray, drive: float = 1.6) -> np.ndarray:
    return np.tanh(x * drive) / math.tanh(drive)


def soft_clip(x: np.ndarray, threshold: float = 0.72) -> np.ndarray:
    """Round off peaks above ``threshold`` while leaving the body untouched."""
    magnitude = np.abs(x)
    over = magnitude > threshold
    if not np.any(over):
        return x
    clipped = threshold + (1.0 - threshold) * np.tanh((magnitude - threshold) / (1.0 - threshold))
    return np.where(over, np.sign(x) * clipped, x)


def tape_wobble(x: np.ndarray, depth_ms: float = 0.8, rate: float = 0.3, seed: int = 3) -> np.ndarray:
    """Slow pitch drift, the lo-fi 'wow' on a tape machine."""
    n = x.shape[-1]
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    wobble = (
        depth_ms / 1000.0 * 0.5 * (
            np.sin(2 * np.pi * rate * t + rng.random() * 6.28)
            + 0.6 * np.sin(2 * np.pi * rate * 0.37 * t + rng.random() * 6.28)
        )
    )
    delay = wobble * SR
    idx = np.arange(n) - delay
    idx = np.clip(idx, 0, n - 1)
    return np.interp(idx, np.arange(n), x)


def stereo_delay(
    sig: np.ndarray,
    time: float,
    feedback: float = 0.35,
    mix: float = 0.25,
    taps: int = 5,
    tone: float = 3200.0,
    ping_pong: bool = True,
) -> np.ndarray:
    """Feed-forward multi-tap delay; cheap but musical."""
    mono = sig if sig.ndim == 1 else sig.mean(axis=0)
    n = mono.shape[-1]
    out = np.zeros((2, n))
    dry = 1.0
    out[0] = mono * dry
    out[1] = mono * dry
    d = secs(time)
    for k in range(1, taps + 1):
        shift = d * k
        if shift >= n:
            break
        gain = feedback ** k
        delayed = np.zeros(n)
        delayed[shift:] = mono[: n - shift]
        if ping_pong and k % 2:
            out[1] += delayed * gain
        elif ping_pong:
            out[0] += delayed * gain
        else:
            out[0] += delayed * gain
            out[1] += delayed * gain
    out = lowpass(out, tone)
    return out * mix + (sig if sig.ndim == 2 else np.vstack([sig, sig])) * (1.0 - mix * 0.15)


def reverb_ir(
    seconds: float = 2.4,
    decay: float = 2.6,
    damp: float = 5200.0,
    predelay: float = 0.02,
    seed: int = 11,
) -> np.ndarray:
    """Synthetic stereo plate-style impulse response."""
    rng = np.random.default_rng(seed)
    n = secs(seconds)
    t = np.arange(n) / SR
    env = np.exp(-t * decay)
    ir = np.zeros((2, n))
    for ch in range(2):
        noise = rng.standard_normal(n)
        # Soften the attack of the tail so it blooms rather than clicks.
        attack = np.minimum(1.0, t / 0.012)
        ir[ch] = noise * env * attack
    ir = lowpass(ir, damp)
    pre = secs(predelay)
    if pre > 0:
        ir = np.concatenate([np.zeros((2, pre)), ir], axis=1)
    # Energy-normalise so convolution preserves loudness rather than adding
    # tens of dB of gain. Peak-normalising a dense noise tail is a trap.
    energy = np.sqrt(np.sum(ir**2, axis=1, keepdims=True))
    energy = np.maximum(energy, 1e-9)
    return ir / energy


def apply_reverb(send: np.ndarray, ir: np.ndarray, wet: float = 0.8) -> np.ndarray:
    left = fftconvolve(send[0], ir[0])[: send.shape[1]]
    right = fftconvolve(send[1], ir[1])[: send.shape[1]]
    return np.vstack([left, right]) * wet


def chorus(sig: np.ndarray, rate: float = 0.6, depth_ms: float = 6.0, mix: float = 0.35, seed: int = 5) -> np.ndarray:
    """Simple modulated-delay chorus returning stereo."""
    mono = sig if sig.ndim == 1 else sig.mean(axis=0)
    n = mono.shape[-1]
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        phase = seed + ch * 2.1
        delay = (depth_ms / 1000.0) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + phase)) * SR
        idx = np.clip(np.arange(n) - delay, 0, n - 1)
        mod = np.interp(idx, np.arange(n), mono)
        out[ch] = mod * mix + mono * (1.0 - mix)
    return out


def stutter(sig: np.ndarray, start: float, length: float, slices: int = 8, repeats: int = 2) -> np.ndarray:
    """Beat-repeat style glitch: chop a slice and repeat it."""
    out = sig.copy()
    i = secs(start)
    n = secs(length)
    step = max(1, n // slices)
    for r in range(repeats):
        for s in range(slices):
            src = i + s * step
            dst = i + (s + (r + 1) * slices) * step
            if src + step > out.shape[-1] or dst + step > out.shape[-1]:
                break
            out[..., dst : dst + step] = sig[..., src : src + step]
    return out


def sidechain_duck(sig: np.ndarray, times: list[float], depth: float = 0.55, release: float = 0.22) -> np.ndarray:
    """Carve a pumping dip into a sustained part at every kick time."""
    out = sig.copy()
    n = out.shape[-1]
    length = secs(release * 4)
    shape = 1.0 - depth * np.exp(-np.arange(length) / (release * SR))
    for when in times:
        i = secs(when)
        j = min(n, i + length)
        if i >= n:
            continue
        out[..., i:j] *= shape[: j - i]
    return out


# --------------------------------------------------------------------------- #
# Instruments
# --------------------------------------------------------------------------- #


def pad(
    freq: float,
    dur: float,
    cutoff: float = 1200.0,
    attack: float = 0.9,
    release: float = 1.8,
    detune: float = 14.0,
    level: float = 0.5,
) -> np.ndarray:
    """Lush sustained pad: detuned saws with a slow filter breath."""
    sig = supersaw(freq, dur + release, voices=5, detune_cents=detune, seed=int(freq) % 997 + 1)
    env = env_adsr(dur, a=attack, d=0.4, s=0.85, r=release)
    sig = sig[:, : env.size] * env
    sig = lowpass(sig, cutoff)
    return sig * level


def sub_pad(freq: float, dur: float, cutoff: float = 400.0, attack: float = 1.3, release: float = 2.2) -> np.ndarray:
    n = secs(dur + release)
    env = env_adsr(dur, a=attack, d=0.5, s=0.9, r=release)[:n]
    sig = osc('sine', freq, dur + release)[: env.size] * env
    sig += 0.25 * osc('triangle', freq, dur + release)[: env.size] * env
    return lowpass(sig, cutoff)


def synth_bass(freq: float, dur: float, cutoff: float = 320.0, drive: float = 1.6) -> np.ndarray:
    n = secs(dur)
    env = env_adsr(dur, a=0.006, d=0.18, s=0.72, r=0.06)[:n]
    saw = osc('saw', freq, dur)[:n]
    sub = osc('sine', freq / 2.0, dur)[:n]
    sig = 0.65 * saw + 0.7 * sub
    sig = lowpass(sig, cutoff)
    sig = tape_sat(sig * 2.0, drive)
    return sig * env


def sub_bass_808(freq: float, dur: float, glide_from: float | None = None) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    if glide_from is not None:
        f = float(freq) * (1.0 + (glide_from - 1.0) * np.exp(-t * 28.0))
    else:
        f = np.full(n, float(freq))
    body = osc('sine', f, dur)
    env = env_adsr(dur, a=0.004, d=0.5, s=0.55, r=0.15)[:n]
    sig = tape_sat(body * 1.8, 2.4) * env
    return lowpass(sig, 220.0)


def pluck(freq: float, dur: float = 0.55, cutoff: float = 2600.0, kind: str = 'saw', decay: float = 7.0) -> np.ndarray:
    n = secs(dur)
    env = env_exp(dur, decay, attack=0.003)[:n]
    sig = 0.7 * osc(kind, freq, dur)[:n] + 0.3 * osc('square', freq * 2.0, dur)[:n]
    sig = lowpass(sig, cutoff)
    return sig * env


def epiano(freq: float, dur: float, velocity: float = 1.0, brightness: float = 1.0) -> np.ndarray:
    """FM electric piano with a believable bell-like attack."""
    n = secs(dur)
    t = np.arange(n) / SR
    f = float(freq)
    mod_index = 1.6 * brightness * np.exp(-t * 3.2) + 0.25
    mod = np.sin(2 * np.pi * f * 2.0 * t) * mod_index
    body = np.sin(2 * np.pi * f * t + mod)
    body += 0.18 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 6.0)
    env = env_adsr(dur, a=0.004, d=0.5, s=0.45, r=0.5)[:n]
    trem = 1.0 - 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 4.8 * t + 0.7))
    return lowpass(body * env * trem, 3800.0) * velocity


def bell(freq: float, dur: float = 5.0, decay: float = 0.9, shimmer: float = 0.35) -> np.ndarray:
    """Additive bell with inharmonic partials and a long tail."""
    n = secs(dur)
    t = np.arange(n) / SR
    base = float(freq)
    partials = [
        (1.0, 1.0, 1.0),
        (2.01, 0.55, 1.5),
        (3.02, 0.28, 2.2),
        (4.71, 0.18, 2.9),
        (5.43, 0.12, 3.6),
        (7.13, 0.07, 4.4),
    ]
    sig = np.zeros(n)
    for ratio, gain, damp in partials:
        sig += gain * np.sin(2 * np.pi * base * ratio * t + ratio) * np.exp(-t * decay * damp)
    if shimmer:
        sig += shimmer * np.sin(2 * np.pi * base * 2 * t) * np.exp(-t * decay * 0.6)
    attack = np.minimum(1.0, t / 0.006)
    return sig * attack


def lead(freq: float, dur: float, vibrato: float = 5.2, depth: float = 0.22, kind: str = 'square', cutoff: float = 4200.0) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    mod = 1.0 + depth / 12.0 * np.sin(2 * np.pi * vibrato * t) * np.minimum(1.0, t / 0.25)
    freqs = np.full(n, float(freq)) * mod
    sig = 0.6 * osc(kind, freqs, dur) + 0.4 * osc('saw', freqs * 1.003, dur)
    sig = lowpass(sig, cutoff)
    env = env_adsr(dur, a=0.02, d=0.2, s=0.8, r=0.18)[:n]
    return sig * env


def flute(freq: float, dur: float) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    vib = 1.0 + 0.006 * np.sin(2 * np.pi * 5.0 * t) * np.minimum(1.0, t / 0.4)
    tone = osc('sine', float(freq) * vib, dur)
    tone += 0.2 * osc('triangle', float(freq) * 2.0 * vib, dur)
    breath = bandpass(np.random.default_rng(int(freq)).standard_normal(n), 900, 4200) * 0.05
    env = env_adsr(dur, a=0.06, d=0.25, s=0.8, r=0.3)[:n]
    return (tone + breath) * env


def string_pad(freq: float, dur: float, cutoff: float = 1600.0, attack: float = 0.6, release: float = 2.0) -> np.ndarray:
    return pad(freq, dur, cutoff=cutoff, attack=attack, release=release, detune=8, level=0.55)


# --------------------------------------------------------------------------- #
# Drums
# --------------------------------------------------------------------------- #


def kick(dur: float = 0.55, punch: float = 1.0, tone: float = 48.0) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    f = tone + (150.0 - tone) * np.exp(-t * 42.0)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (6.5 / punch))
    click = np.random.default_rng(2).standard_normal(n) * np.exp(-t * 260.0) * 0.35
    sig = tape_sat((body + click) * 1.7, 2.0)
    return sig * np.exp(-t * 2.0)


def snare(dur: float = 0.4, tone: float = 190.0, noise_level: float = 1.0) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(7)
    noise = bandpass(rng.standard_normal(n), 1400, 9000) * np.exp(-t * 17.0)
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 26.0)
    body += 0.5 * np.sin(2 * np.pi * tone * 1.6 * t) * np.exp(-t * 30.0)
    return tape_sat(noise * noise_level * 0.9 + body * 0.55, 1.4) * 0.8


def clap(dur: float = 0.35) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(21)
    base = bandpass(rng.standard_normal(n), 900, 5200)
    env = np.zeros(n)
    for offset in (0.0, 0.009, 0.019, 0.031):
        i = secs(offset)
        env[i:] += np.exp(-(np.arange(n - i) / SR) * 38.0) * (1.0 - offset)
    env += np.exp(-t * 9.0) * 0.6
    return base * env * 0.55


def hat(dur: float = 0.09, open_hat: bool = False) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(31)
    noise = highpass(rng.standard_normal(n), 6800.0, order=3)
    env = np.exp(-t * (16.0 if open_hat else 85.0))
    return noise * env * 0.34


def shaker(dur: float = 0.16) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(41)
    noise = bandpass(rng.standard_normal(n), 4200, 9000)
    env = np.exp(-t * 26.0) * np.minimum(1.0, t / 0.012)
    return noise * env * 0.35


def rim(dur: float = 0.12) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * 1740 * t) * np.exp(-t * 55.0)
    sig += np.sin(2 * np.pi * 820 * t) * np.exp(-t * 40.0) * 0.6
    return sig * 0.35


def crash(dur: float = 3.0) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(51)
    noise = highpass(rng.standard_normal(n), 3800, order=2)
    env = np.exp(-t * 1.6) * np.minimum(1.0, t / 0.01)
    return noise * env * 0.35


def tom(freq: float = 120.0, dur: float = 0.35) -> np.ndarray:
    n = secs(dur)
    t = np.arange(n) / SR
    f = freq * (1.0 + 0.6 * np.exp(-t * 18.0))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11.0) * 0.7


def riser(dur: float = 2.0, low: float = 400.0, high: float = 9000.0) -> np.ndarray:
    """Noise sweep used to lift into a new section."""
    n = secs(dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(61)
    noise = rng.standard_normal(n)
    # Sweep the band in a handful of steps; cheap and convincing.
    out = np.zeros(n)
    steps = 24
    for i in range(steps):
        a = int(n * i / steps)
        b = int(n * (i + 1) / steps)
        cut = low * (high / low) ** (i / (steps - 1))
        out[a:b] = bandpass(noise, cut * 0.6, min(cut * 1.6, 16000))[a:b]
    env = np.linspace(0.0, 1.0, n) ** 2.2
    return out * env * 0.5


def reverse_cymbal(dur: float = 1.6) -> np.ndarray:
    sig = crash(dur)[::-1]
    return sig * np.linspace(0.0, 1.0, sig.size)


# --------------------------------------------------------------------------- #
# Texture
# --------------------------------------------------------------------------- #


def vinyl_noise(dur: float, level: float = 0.035, seed: int = 71) -> np.ndarray:
    """Hiss plus sparse crackle, the backbone of every lo-fi record."""
    rng = np.random.default_rng(seed)
    n = secs(dur)
    hiss = rng.standard_normal(n) * 0.35
    hiss = bandpass(hiss, 800, 9000)
    crackle = np.zeros(n)
    pops = max(8, int(dur * 7))
    for _ in range(pops):
        i = int(rng.random() * (n - 2000))
        length = int(rng.integers(30, 400))
        amp = rng.random() * 0.9
        crackle[i : i + length] += rng.standard_normal(length) * np.exp(
            -np.arange(length) / (length / 5.0)
        ) * amp
    crackle = highpass(crackle, 1500)
    return (hiss * 0.5 + crackle) * level


def tape_hiss(dur: float, level: float = 0.02, seed: int = 81) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = secs(dur)
    noise = rng.standard_normal(n)
    return lowpass(highpass(noise, 2500), 9000) * level


def wind(dur: float, level: float = 0.08, seed: int = 91) -> np.ndarray:
    """Slow filtered noise used as an ambient bed."""
    rng = np.random.default_rng(seed)
    n = secs(dur)
    noise = rng.standard_normal(n)
    t = np.arange(n) / SR
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t + rng.random() * 6.28)
    return lowpass(noise, 600) * mod * level


# --------------------------------------------------------------------------- #
# Mixer
# --------------------------------------------------------------------------- #


#: Default per-bus loudness targets, in dBFS RMS. These are the "faders" of the
#: mix: every bus is gain-staged to this level so instruments with wildly
#: different peak levels still sit together.
BUS_TARGETS = {
    'drums': -17.0,
    'bass': -18.5,
    'keys': -21.0,
    'pad': -21.5,
    'strings': -22.0,
    'arp': -23.5,
    'lead': -20.0,
    'melody': -21.5,
    'bells': -27.0,
    'shimmer': -30.0,
    'drone': -24.0,
    'pulse': -30.0,
    'fx': -28.0,
    'texture': -34.0,
}


def active_rms(x: np.ndarray, frame: int = 4410) -> float:
    """Typical RMS of the loud frames, ignoring silence between phrases."""
    mono = x.mean(axis=0) if x.ndim == 2 else x
    frames = mono.size // frame
    if frames == 0:
        return float(np.sqrt(np.mean(mono**2)))
    blocks = mono[: frames * frame].reshape(frames, frame)
    levels = np.sqrt(np.mean(blocks**2, axis=1))
    live = levels[levels > 1e-4]
    if live.size == 0:
        return 0.0
    return float(np.median(live))


class Mix:
    """A tiny multitrack mixer with gain staging and one shared reverb send."""

    def __init__(self, duration: float, tail: float = 6.0, seed: int = 0):
        self.seconds = duration
        self.n = secs(duration + tail)
        self.buses: dict[str, np.ndarray] = {}
        self.send_buses: dict[str, np.ndarray] = {}
        self.gains: dict[str, float] = {}
        self.rng = np.random.default_rng(seed)

    def bus(self, name: str, gain: float = 1.0) -> np.ndarray:
        if name not in self.buses:
            self.buses[name] = np.zeros((2, self.n))
            self.gains[name] = gain
        return self.buses[name]

    def add(
        self,
        bus: str,
        sig: np.ndarray,
        at: float = 0.0,
        gain: float = 1.0,
        pan: float = 0.0,
        send: float = 0.0,
    ) -> None:
        target = self.bus(bus)
        start = secs(at)
        if start >= self.n:
            return
        sig = np.asarray(sig, dtype=np.float64)
        if sig.ndim == 1:
            angle = (pan + 1.0) * math.pi / 4.0
            left = sig * math.cos(angle) * gain
            right = sig * math.sin(angle) * gain
            stereo = np.vstack([left, right])
        else:
            stereo = sig * gain
        length = min(stereo.shape[1], self.n - start)
        if length <= 0:
            return
        target[:, start : start + length] += stereo[:, :length]
        if send:
            if bus not in self.send_buses:
                self.send_buses[bus] = np.zeros((2, self.n))
            self.send_buses[bus][:, start : start + length] += stereo[:, :length] * send

    def render(
        self,
        ir: np.ndarray,
        wet: float = 0.5,
        target_rms: float = -14.0,
        peak_ceiling: float = -1.6,
        fade_in: float = 0.05,
        fade_out: float = 4.0,
        drive: float = 1.0,
        stereo_width: float = 0.72,
        bus_targets: dict[str, float] | None = None,
        debug: bool = False,
    ) -> np.ndarray:
        targets = {**BUS_TARGETS, **(bus_targets or {})}
        keep = min(self.n, secs(self.seconds))
        mix = np.zeros((2, keep))
        send = np.zeros((2, keep))

        # Gain-stage each bus so quiet instruments and loud drums coexist.
        for name, bus in self.buses.items():
            level = active_rms(bus)
            if level <= 0:
                continue
            target = db(targets.get(name, -22.0))
            factor = target / level
            trimmed = bus[:, :keep] * factor
            mix += trimmed
            if name in self.send_buses:
                send[:, :] += self.send_buses[name][:, :keep] * factor
            if debug:
                print(
                    f'    bus {name:9s} {20 * math.log10(level):6.1f} → '
                    f'{targets.get(name, -22.0):6.1f} dB  (x{factor:5.2f})'
                )

        if wet > 0:
            mix += apply_reverb(send, ir, wet)

        # Narrow the stereo image a touch; all-synthetic material can end up
        # almost fully decorrelated, which collapses in mono.
        mid = (mix[0] + mix[1]) * 0.5
        side = (mix[0] - mix[1]) * 0.5 * stereo_width
        mix = np.vstack([mid + side, mid - side])

        # Gentle glue and peak rounding first, so the harmonics they add can
        # be cleaned up by the master filter below.
        if drive != 1.0:
            mix = tape_sat(mix * drive, 1.2)
        mix = soft_clip(mix, 0.78)

        # Tame the very top end. Pure synthesis leaves a lot of energy near
        # Nyquist, which both sounds fizzy and wrecks MP3 encoding, so use a
        # steep filter well below the codec's trouble zone. This must run
        # after the saturator or the new harmonics reintroduce the problem.
        for _ in range(2):
            mix = lowpass(mix, 13800, order=4)

        rms = float(np.sqrt(np.mean(mix**2)) + 1e-12)
        mix *= db(target_rms) / rms

        # Soft peak limiting instead of plain gain reduction: keeps the track
        # loud without letting stray transients clip the encoder.
        mix = soft_clip(mix, db(-2.2))
        peak = float(np.max(np.abs(mix)) + 1e-12)
        ceiling = db(peak_ceiling)
        if peak > ceiling:
            mix *= ceiling / peak

        # Declick the start and the real ending.
        n_in = min(secs(fade_in), keep)
        mix[:, :n_in] *= np.linspace(0.0, 1.0, n_in) ** 0.5
        n_out = min(secs(fade_out), keep)
        mix[:, keep - n_out :] *= np.linspace(1.0, 0.0, n_out) ** 1.4

        if debug:
            rms = float(np.sqrt(np.mean(mix**2)) + 1e-12)
            peak = float(np.max(np.abs(mix)) + 1e-12)
            print(f'    master    rms {20 * math.log10(rms):6.1f} dB  peak {20 * math.log10(peak):6.1f} dB')
        return mix
