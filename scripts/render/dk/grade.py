"""Optionale Nachbearbeitung (--grade): leichte Vignette + feine Filmkoernung.

Bewusst ausserhalb von Blender (Pillow/numpy): der Compositor aendert sich zwischen
Blender-Versionen staendig, und dieselben Schritte lassen sich 1:1 in sharp nachbauen.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from .config import GRADE


def apply(path, out_path=None, vignette=None, grain=None, warmth=None, seed=0):
    vignette = GRADE["vignette"] if vignette is None else vignette
    grain = GRADE["grain"] if grain is None else grain
    warmth = GRADE["warmth"] if warmth is None else warmth
    img = Image.open(path).convert("RGB")
    a = np.asarray(img, np.float32) / 255.0
    h, w, _ = a.shape
    if vignette > 0:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2)) / np.sqrt(2.0)
        t = np.clip((r - 0.45) / 0.55, 0, 1)
        t = t * t * (3 - 2 * t)
        a *= (1.0 - vignette * t)[..., None]
    if warmth:
        a[..., 0] *= 1.0 + 0.04 * warmth
        a[..., 2] *= 1.0 - 0.04 * warmth
    if grain > 0:
        rng = np.random.default_rng(seed)
        n = rng.normal(0, 1, (h, w)).astype(np.float32)
        # ganz leicht weichzeichnen (3x3-Binomial), damit das Korn nicht digital wirkt
        n = (n * 4 + np.roll(n, 1, 0) + np.roll(n, -1, 0) + np.roll(n, 1, 1) + np.roll(n, -1, 1)) / 8.0
        n = n / (n.std() + 1e-6)
        lum = a.mean(axis=2)
        strength = grain * (0.55 + 0.9 * (1.0 - np.abs(lum - 0.5) * 2.0).clip(0, 1))
        a += (n * strength)[..., None]
    out = Image.fromarray((np.clip(a, 0, 1) * 255.0 + 0.5).astype(np.uint8), "RGB")
    out.save(out_path or path, compress_level=6)
    return out_path or path
