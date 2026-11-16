"""Etiketten, Logo-Sticker und Grusskarte als saubere Pillow-Texturen.

Schriften: Newsreader (Serif) + Hanken Grotesk (Versalien-Unterzeile), beide OFL,
liegen unter scripts/render/fonts/. Fehlen sie, wird eine System-Serif gesucht.
Alles wird mit 2x Supersampling gezeichnet und herunterskaliert, damit Linien
und Schrift gestochen sauber bleiben.
"""
from __future__ import annotations

import glob
import os
import subprocess
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .config import PALETTE, hex_to_srgb

FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts")
SS = 2  # Supersampling

_FALLBACK_PATTERNS = {
    "serif": ["DejaVuSerif.ttf", "LiberationSerif-Regular.ttf", "NotoSerif-Regular.ttf"],
    "serif_italic": ["DejaVuSerif-Italic.ttf", "LiberationSerif-Italic.ttf", "NotoSerif-Italic.ttf"],
    "sans": ["DejaVuSans.ttf", "LiberationSans-Regular.ttf", "NotoSans-Regular.ttf"],
}
_FONT_FILES = {
    "serif": ["Newsreader-Medium.ttf", "Newsreader-Regular.ttf"],
    "serif_italic": ["Newsreader-MediumItalic.ttf", "Newsreader-Italic.ttf"],
    "sans": ["HankenGrotesk-SemiBold.ttf", "HankenGrotesk-Medium.ttf", "HankenGrotesk-Regular.ttf"],
}


@lru_cache(maxsize=None)
def _font_path(kind: str) -> str | None:
    for name in _FONT_FILES[kind]:
        p = os.path.join(FONT_DIR, name)
        if os.path.isfile(p):
            return p
    # Fallback: Systemschrift
    for pat in _FALLBACK_PATTERNS[kind]:
        hits = glob.glob(f"/usr/share/fonts/**/{pat}", recursive=True)
        if hits:
            return hits[0]
    try:
        out = subprocess.run(["fc-match", "-f", "%{file}", "serif" if "serif" in kind else "sans"],
                             capture_output=True, text=True, timeout=5).stdout.strip()
        if out and os.path.isfile(out):
            return out
    except Exception:
        pass
    return None


@lru_cache(maxsize=256)
def _font(kind: str, size: int):
    p = _font_path(kind)
    if p is None:
        return ImageFont.load_default(size=size)
    return ImageFont.truetype(p, size=size)


def _rgb255(name_or_hex):
    h = PALETTE.get(name_or_hex, name_or_hex)
    return tuple(int(round(v * 255)) for v in hex_to_srgb(h))


def _paper(w, h, color, seed=0, speckle=0.0):
    """Papierflaeche mit ganz leichter Wolkigkeit (kein sichtbares Muster)."""
    rng = np.random.default_rng(seed)
    base = np.ones((h, w, 3), np.float32) * np.array(color, np.float32)
    # Wolkigkeit
    small = rng.normal(0, 1, (max(2, h // 48), max(2, w // 48))).astype(np.float32)
    cloud = np.asarray(Image.fromarray(small).resize((w, h), Image.BICUBIC))
    fine = rng.normal(0, 1, (h, w)).astype(np.float32)
    base += (cloud[..., None] * 1.6 + fine[..., None] * 1.3)
    if speckle > 0:
        n = int(w * h * speckle)
        ys, xs = rng.integers(0, h, n), rng.integers(0, w, n)
        base[ys, xs] += rng.normal(-14, 10, (n, 1)).astype(np.float32)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
    if speckle > 0:
        img = img.filter(ImageFilter.GaussianBlur(0.6))
    return img


def _text_width(font, text, tracking=0.0):
    if not text:
        return 0.0
    if tracking == 0:
        return font.getlength(text)
    return sum(font.getlength(ch) for ch in text) + tracking * (len(text) - 1)


def _draw_text(draw, xy, text, font, fill, tracking=0.0, anchor_mid=True):
    """Zeichnet Text horizontal zentriert um xy[0] auf Grundlinie xy[1]."""
    x, y = xy
    w = _text_width(font, text, tracking)
    if anchor_mid:
        x -= w / 2.0
    if tracking == 0:
        draw.text((x, y), text, font=font, fill=fill, anchor="ls")
        return
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill, anchor="ls")
        x += font.getlength(ch) + tracking


def _fit_lines(kind, text, max_w, size, min_frac=0.72, tracking_em=0.0):
    """Schriftgroesse verkleinern bzw. einmal umbrechen, bis der Text passt."""
    lines = [text]
    s = size
    while True:
        f = _font(kind, int(s))
        w = max(_text_width(f, ln, tracking_em * s) for ln in lines)
        if w <= max_w:
            return lines, int(s)
        if s <= size * min_frac and len(lines) == 1 and (" " in text or "-" in text):
            # am mittleren Leerzeichen/Bindestrich umbrechen
            cands = [i for i, ch in enumerate(text) if ch in " -"]
            mid = min(cands, key=lambda i: abs(i - len(text) / 2))
            a = text[:mid + (1 if text[mid] == "-" else 0)].strip()
            b = text[mid + 1:].strip()
            lines = [a, b]
            s = size * 0.86
            continue
        s -= max(1, size * 0.03)
        if s < size * 0.35:
            return lines, int(max(s, 6))


def label_image(label: str, sub: str = "", paper: str = "creme", w_mm: float = 60,
                h_mm: float = 45, px_per_mm: float = 14, seed: int = 0,
                frame: bool = True, ink: str = "ink") -> Image.Image:
    """Rechteckiges Papieretikett: feine Linie, Serif-Bezeichnung, Versalien-Unterzeile."""
    W, H = int(w_mm * px_per_mm * SS), int(h_mm * px_per_mm * SS)
    img = _paper(W, H, _rgb255(paper), seed)
    d = ImageDraw.Draw(img)
    ink_rgb = _rgb255(ink)
    if paper in ("oliv", "dunkeloliv", "ink", "kakao", "rost", "terrakotta"):
        ink_rgb = _rgb255("creme")
    line_rgb = tuple(int(0.55 * a + 0.45 * b) for a, b in zip(ink_rgb, _rgb255(paper)))
    lw = max(SS, int(round(0.16 * px_per_mm * SS)))        # feine Linie ~0.16 mm
    m = int(min(W, H) * 0.075)
    if frame:
        d.rectangle([m, m, W - m - 1, H - m - 1], outline=line_rgb, width=lw)

    sub = (sub or "").upper()
    inner_w = W - 2 * m - int(min(W, H) * 0.16)
    base_size = min(H * (0.26 if sub else 0.30), W * 0.24)
    lines, size = _fit_lines("serif", label, inner_w, base_size)
    f_main = _font("serif", size)
    sub_size0 = max(min(H * 0.082, W * 0.066), 0.115 * 14 * px_per_mm * SS * 0.5)
    tr = 0.16
    sub_lines, sub_size = _fit_lines("sans", sub, inner_w, sub_size0, min_frac=0.8,
                                     tracking_em=tr) if sub else ([], 0)
    f_sub = _font("sans", sub_size) if sub else None

    asc = size * 0.72            # Versalhoehe-nahe Schaetzung fuer optische Zentrierung
    line_gap = size * 1.04
    main_h = asc + line_gap * (len(lines) - 1)
    rule_gap = size * 0.40 if sub else 0
    sub_h = (sub_size * 0.72 + (len(sub_lines) - 1) * sub_size * 1.5) if sub else 0
    total = main_h + (rule_gap * 2 + sub_h if sub else 0)
    y = (H - total) / 2 + asc
    cx = W / 2
    for ln in lines:
        _draw_text(d, (cx, y), ln, f_main, ink_rgb)
        y += line_gap
    y -= line_gap
    if sub:
        y += rule_gap
        rl = W * 0.11
        d.line([cx - rl, y, cx + rl, y], fill=line_rgb, width=lw)
        y += rule_gap + sub_size * 0.72
        for ln in sub_lines:
            _draw_text(d, (cx, y), ln, f_sub, ink_rgb, tracking=tr * sub_size)
            y += sub_size * 1.5
    return img.resize((W // SS, H // SS), Image.LANCZOS)


def round_label_image(label: str, sub: str = "", paper: str = "creme", d_mm: float = 70,
                      px_per_mm: float = 14, seed: int = 0) -> Image.Image:
    """Rundes Etikett (Dosendeckel): Kreislinie + Text, quadratische Textur."""
    S = int(d_mm * px_per_mm * SS)
    img = _paper(S, S, _rgb255(paper), seed)
    d = ImageDraw.Draw(img)
    ink_rgb = _rgb255("creme") if paper in ("oliv", "dunkeloliv", "ink", "kakao") else _rgb255("ink")
    line_rgb = tuple(int(0.55 * a + 0.45 * b) for a, b in zip(ink_rgb, _rgb255(paper)))
    lw = max(SS, int(round(0.16 * px_per_mm * SS)))
    m = int(S * 0.07)
    d.ellipse([m, m, S - m - 1, S - m - 1], outline=line_rgb, width=lw)
    sub = (sub or "").upper()
    inner = S * 0.66
    lines, size = _fit_lines("serif", label, inner, S * 0.17)
    f_main = _font("serif", size)
    tr = 0.16
    sub_lines, sub_size = _fit_lines("sans", sub, inner * 0.92, S * 0.052, min_frac=0.8,
                                     tracking_em=tr) if sub else ([], 0)
    asc = size * 0.72
    line_gap = size * 1.04
    rule_gap = size * 0.42 if sub else 0
    total = asc + line_gap * (len(lines) - 1) + (rule_gap * 2 + sub_size * 0.72 if sub else 0)
    y = (S - total) / 2 + asc
    cx = S / 2
    for ln in lines:
        _draw_text(d, (cx, y), ln, f_main, ink_rgb)
        y += line_gap
    y -= line_gap
    if sub:
        y += rule_gap
        d.line([cx - S * 0.07, y, cx + S * 0.07, y], fill=line_rgb, width=lw)
        y += rule_gap + sub_size * 0.72
        f_sub = _font("sans", sub_size)
        for ln in sub_lines:
            _draw_text(d, (cx, y), ln, f_sub, ink_rgb, tracking=tr * sub_size)
            y += sub_size * 1.5
    return img.resize((S // SS, S // SS), Image.LANCZOS)


def sticker_image(text: str = "Ihr Logo", d_mm: float = 55, px_per_mm: float = 16,
                  paper: str = "creme", seed: int = 0) -> Image.Image:
    """Runder Logo-Platzhalter: Serif kursiv, feine Kreislinie."""
    S = int(d_mm * px_per_mm * SS)
    img = _paper(S, S, _rgb255(paper), seed)
    d = ImageDraw.Draw(img)
    ink_rgb = _rgb255("ink")
    line_rgb = tuple(int(0.5 * a + 0.5 * b) for a, b in zip(_rgb255("oliv"), _rgb255(paper)))
    lw = max(SS, int(round(0.16 * px_per_mm * SS)))
    m = int(S * 0.075)
    d.ellipse([m, m, S - m - 1, S - m - 1], outline=line_rgb, width=lw)
    lines, size = _fit_lines("serif_italic", text, S * 0.66, S * 0.235)
    f = _font("serif_italic", size)
    asc = size * 0.70
    total = asc + (len(lines) - 1) * size * 1.05
    y = (S - total) / 2 + asc
    for ln in lines:
        _draw_text(d, (S / 2, y), ln, f, ink_rgb)
        y += size * 1.05
    # kleine Zierlinien ober-/unterhalb
    rl = S * 0.06
    d.line([S / 2 - rl, S * 0.27, S / 2 + rl, S * 0.27], fill=line_rgb, width=lw)
    d.line([S / 2 - rl, S * 0.73, S / 2 + rl, S * 0.73], fill=line_rgb, width=lw)
    return img.resize((S // SS, S // SS), Image.LANCZOS)


def card_image(text: str = "Danke", w_mm: float = 105, h_mm: float = 74,
               px_per_mm: float = 12, seed: int = 0, text_x: float = 0.5,
               sub: str = "") -> Image.Image:
    """Grusskarte aus cremefarbenem Naturkarton. text_x verschiebt die Schrift
    (0..1), damit das Band darueber laufen kann."""
    W, H = int(w_mm * px_per_mm * SS), int(h_mm * px_per_mm * SS)
    img = _paper(W, H, _rgb255("#EFEBD9"), seed, speckle=0.0006)
    d = ImageDraw.Draw(img)
    ink_rgb = _rgb255("ink")
    line_rgb = tuple(int(0.5 * a + 0.5 * b) for a, b in zip(_rgb255("oliv"), _rgb255("creme")))
    lw = max(SS, int(round(0.16 * px_per_mm * SS)))
    cx = W * text_x
    avail = 2 * min(cx, W - cx) * 0.80
    lines, size = _fit_lines("serif_italic", text, avail, min(H * 0.30, W * 0.30))
    f = _font("serif_italic", size)
    y = H * 0.5 + size * 0.22 - (len(lines) - 1) * size * 0.52
    for k, ln in enumerate(lines):
        _draw_text(d, (cx, y), ln, f, ink_rgb)
        if k < len(lines) - 1:
            y += size * 1.04
    rl = W * 0.05
    d.line([cx - rl, y + size * 0.42, cx + rl, y + size * 0.42], fill=line_rgb, width=lw)
    if sub:
        ss = int(H * 0.05)
        _draw_text(d, (cx, y + size * 0.42 + ss * 2.3), sub.upper(), _font("sans", ss), ink_rgb,
                   tracking=0.18 * ss)
    return img.resize((W // SS, H // SS), Image.LANCZOS)
