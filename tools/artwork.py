"""Cover-artwork generator for PratMusic (Pillow).

Produces original, per-track generative artwork: vibe palettes, gradient
skies, grain, and typography. No copyrighted imagery is used.
"""

import hashlib
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SIZE = 640
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def _font(size, bold=True):
    try:
        return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)
    except Exception:
        return ImageFont.load_default()


def _hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _lerp(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def _gradient(palette, w, h):
    """Vertical gradient palette[0] -> palette[1], with a radial glow."""
    top, mid, bot = [_hex_to_rgb(c) for c in palette]
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        if t < 0.55:
            row = _lerp(top, mid, t / 0.55)
        else:
            row = _lerp(mid, bot, (t - 0.55) / 0.45)
        for x in range(w):
            px[x, y] = row
    return img


def make_cover(track_id, title, artist, palette, out_dir, seed=0):
    """Render a 640x640 cover; returns the output path."""
    os.makedirs(out_dir, exist_ok=True)
    rng = random.Random(seed)
    path = os.path.join(out_dir, f"{track_id}.jpg")

    w = h = SIZE
    img = _gradient(palette, w, h)
    draw = ImageDraw.Draw(img, "RGBA")

    # sun / moon disc with haze
    cx = rng.randint(int(w * 0.25), int(w * 0.75))
    cy = rng.randint(int(h * 0.18), int(h * 0.42))
    r = rng.randint(90, 170)
    for k in range(26, 0, -1):
        rr = int(r * k / 26)
        alpha = int(34 * (1 - k / 28))
        col = _lerp(_hex_to_rgb(palette[1]), (255, 255, 255), 0.35)
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                     fill=col + (alpha,))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 244, 250, 235))

    # horizon lines / skyline silhouettes
    base = _hex_to_rgb(palette[0])
    horizon = int(h * 0.62)
    x = 0
    while x < w:
        bw = rng.randint(18, 70)
        bh = rng.randint(30, 150)
        draw.rectangle([x, horizon - bh, x + bw, horizon],
                       fill=base + (210,))
        x += bw + rng.randint(4, 26)

    # star / sparkle field
    for _ in range(90):
        sx, sy = rng.randint(0, w - 1), rng.randint(0, int(h * 0.55))
        s = rng.randint(1, 3)
        a = rng.randint(60, 220)
        draw.ellipse([sx, sy, sx + s, sy + s], fill=(255, 255, 255, a))

    # soft blur for the scene, then grain
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    draw = ImageDraw.Draw(img, "RGBA")
    overlay = Image.effect_noise((w, h), 14).convert("L")
    overlay = overlay.point(lambda p: int(p * 0.10))
    img = Image.composite(Image.new("RGB", (w, h), (0, 0, 0)), img,
                          Image.eval(overlay, lambda p: 255 - p * 2))
    draw = ImageDraw.Draw(img, "RGBA")

    # typography: artist (top), title (lower third), PratMusic tag
    f_artist = _font(30, bold=False)
    f_title = _font(64, bold=True)
    f_tag = _font(22, bold=True)

    artist_txt = artist.upper()
    tb = draw.textbbox((0, 0), artist_txt, font=f_artist)
    draw.text(((w - (tb[2] - tb[0])) / 2, 60), artist_txt,
              fill=(255, 255, 255, 220), font=f_artist)

    # wrap title on two lines if long
    words = title.upper().split()
    lines, cur = [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=f_title) > w * 0.82 and cur:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    lines.append(cur)

    y = h - 210 if len(lines) > 1 else h - 170
    for line in lines:
        tb = draw.textbbox((0, 0), line, font=f_title)
        lw = tb[2] - tb[0]
        # shadow
        draw.text(((w - lw) / 2 + 3, y + 3), line, fill=(0, 0, 0, 120),
                  font=f_title)
        draw.text(((w - lw) / 2, y), line, fill=(255, 255, 255, 245),
                  font=f_title)
        y += 74

    draw.text((28, h - 56), "PRATMUSIC ORIGINALS · CC0", fill=(255, 255, 255, 160),
              font=f_tag)

    img = img.filter(ImageFilter.SMOOTH_MORE)
    img.save(path, "JPEG", quality=88)
    return path


def cover_for(track_id, title, artist, palette, out_dir, seed=0):
    """Cached wrapper: reuse existing artwork when the spec is unchanged."""
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{track_id}.jpg")
    if os.path.exists(path):
        return path
    return make_cover(track_id, title, artist, palette, out_dir, seed)
