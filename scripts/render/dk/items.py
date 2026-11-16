"""Parametrische Artikelbibliothek.

Jeder Artikel wird in einem kanonischen "Display"-Koordinatensystem gebaut:
Ursprung = Mitte der Standflaeche, +z = oben, Etikett/Front zeigt nach -y.
Masse (w, d, h) = Breite x, Tiefe y, Hoehe z in Metern.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from . import geom, labels, materials
from .config import CM, LABEL_PAPER_FOR_TONE, PALETTE
from .geom import R, T

# Standardmasse [B, T, H] in cm, Packklasse, Standardton, darf w/h tauschen
DEFAULTS = {
    "coffee_bag":    dict(dims=(8.5, 6.0, 20.0), cls="stand", tone="kraft", swap=False),
    "tea_box":       dict(dims=(8.0, 6.5, 12.5), cls="stand", tone="salbei", swap=True),
    "chocolate_bar": dict(dims=(8.0, 1.1, 16.5), cls="flat", tone="kakao", swap=True),
    "praline_box":   dict(dims=(14.0, 3.2, 14.0), cls="flat", tone="dunkeloliv", swap=False),
    "cookie_pack":   dict(dims=(7.0, 5.0, 18.0), cls="stand", tone="natur", swap=True),
    "tin":           dict(dims=(10.0, 4.5, 10.0), cls="flat", tone="salbei", swap=False),
    "jar":           dict(dims=(7.2, 7.2, 9.2), cls="cyl", tone="dunkeloliv", swap=False),
    "bottle":        dict(dims=(7.6, 7.6, 30.0), cls="lying", tone="creme", swap=False),
    "bottle_small":  dict(dims=(5.6, 5.6, 20.0), cls="lying", tone="creme", swap=False),
    "pouch":         dict(dims=(12.0, 5.0, 18.5), cls="stand", tone="kraft", swap=False),
    "pasta_bag":     dict(dims=(9.5, 5.5, 24.0), cls="stand", tone="natur", swap=False),
    "marzipan_loaf": dict(dims=(12.5, 3.2, 4.6), cls="flat", tone="rost", swap=True),
    "stick_pack":    dict(dims=(5.0, 3.5, 25.0), cls="stand", tone="sand", swap=True),
    "notebook":      dict(dims=(14.8, 1.5, 21.0), cls="flat", tone="oliv", swap=False),
    "candle":        dict(dims=(7.6, 7.6, 8.6), cls="cyl", tone="creme", swap=False),
    "card":          dict(dims=(10.5, 0.4, 14.8), cls="flat", tone="creme", swap=True),
}


@dataclass
class ItemSpec:
    type: str
    label: str = ""
    sub: str = ""
    tone: str = "creme"
    contents: str = ""
    variant: str = ""
    shape: str = ""
    w: float = 0.08
    d: float = 0.06
    h: float = 0.12
    cls: str = "stand"
    swap: bool = False
    seed: int = 0
    index: int = 0
    raw: dict = field(default_factory=dict)

    @property
    def is_round(self):
        return self.type in ("jar", "candle", "bottle", "bottle_small")


def make_spec(raw: dict, index: int = 0, seed: int = 0) -> ItemSpec:
    typ = str(raw.get("type", "tea_box")).lower()
    if typ not in DEFAULTS:
        print(f"[dk] Warnung: unbekannter Artikeltyp '{typ}' - wird als Faltschachtel gerendert.")
        base = DEFAULTS["tea_box"]
        typ_build = "tea_box"
    else:
        base = DEFAULTS[typ]
        typ_build = typ
    variant = str(raw.get("variant", "") or "").lower()
    shape = str(raw.get("shape", "") or "").lower()
    dims = list(base["dims"])
    if typ_build == "tin" and (shape.startswith("eck") or variant.startswith("eck")):
        dims = [9.0, 4.2, 12.0]
        shape = "eckig"
    if typ_build == "bottle" and variant == "sekt":
        dims = [8.2, 8.2, 30.0]
    if typ_build == "candle" and variant.startswith("stumpen"):
        dims = [6.5, 6.5, 10.0]
    rd = raw.get("dims")
    if isinstance(rd, (list, tuple)) and len(rd) == 3:
        try:
            dims = [max(0.3, float(v)) for v in rd]
        except (TypeError, ValueError):
            pass
    tone = raw.get("tone") or base["tone"]
    tone = str(tone).lower()
    if tone not in PALETTE and not tone.startswith("#"):
        tone = base["tone"]
    w, d, h = (v * CM for v in dims)
    if typ_build in ("jar", "candle", "bottle", "bottle_small") or (typ_build == "tin" and shape != "eckig"):
        if typ_build == "tin":
            h = w
        else:
            d = w
    return ItemSpec(type=typ_build, label=str(raw.get("label", "") or ""),
                    sub=str(raw.get("sub", "") or ""), tone=tone,
                    contents=str(raw.get("contents", "") or "").lower(), variant=variant,
                    shape=shape, w=w, d=d, h=h, cls=base["cls"], swap=base["swap"],
                    seed=seed * 131 + index * 17 + 3, index=index, raw=raw)


# ---------------------------------------------------------------------------
# Helfer
# ---------------------------------------------------------------------------
def _label_paper_name(spec, explicit=None):
    return explicit or LABEL_PAPER_FOR_TONE.get(spec.tone, "creme")


def _rect_label_mat(spec, w, h, paper=None, frame=True):
    img = labels.label_image(spec.label, spec.sub, _label_paper_name(spec, paper), w * 1000,
                             h * 1000, seed=spec.seed, frame=frame)
    return materials.label_paper(materials.image_from_pil(img, spec.type))


def _face_label_size(w, h):
    """Etikettgroesse passend zur Frontflaeche (hoch- oder querformatig)."""
    if h >= w:
        lw = 0.78 * w
        lh = min(0.56 * h, lw * 1.25)
    else:
        lh = 0.72 * h
        lw = min(0.62 * w, lh * 1.7)
    return lw, lh


def _front_label(root, spec, w_face, h_face, y_front, zc, size=None, paper=None, wrap_target=None,
                 offset=0.00025):
    lw, lh = size or _face_label_size(w_face, h_face)
    mat = _rect_label_mat(spec, lw, lh, paper)
    if wrap_target is not None:
        dec = geom.plane_decal("etikett", lw, lh, mat, nx=14, nz=14)
        geom.parent(dec, root, T(0, y_front - 0.004, zc))
        geom.shrinkwrap(dec, wrap_target, offset)
    else:
        dec = geom.plane_decal("etikett", lw, lh, mat)
        geom.parent(dec, root, T(0, y_front - offset, zc))
    return dec


def _smooth(t):
    return t * t * (3 - 2 * t)


def _rings_from_keys(keys, w, d, h, n=64, sub=5):
    """keys: (z-Anteil, w-Anteil, d-Anteil, d_min in m, Exponent p)."""
    rings = []
    for (z0, w0, d0, m0, p0), (z1, w1, d1, m1, p1) in zip(keys[:-1], keys[1:]):
        for s in range(sub):
            t = s / sub
            ts = _smooth(t)
            zz = z0 + (z1 - z0) * t
            ww = (w0 + (w1 - w0) * ts) * w
            dd = max((d0 + (d1 - d0) * ts) * d, m0 + (m1 - m0) * ts)
            pp = p0 + (p1 - p0) * ts
            rings.append(geom.ring(ww, dd, zz * h, pp, n))
    z1, w1, d1, m1, p1 = keys[-1]
    rings.append(geom.ring(w1 * w, max(d1 * d, m1), z1 * h, p1, n))
    return rings


# ---------------------------------------------------------------------------
# Beutel
# ---------------------------------------------------------------------------
def _coffee_bag(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("coffee_bag")
    keys = [(0.0, 0.95, 0.92, 0, 7), (0.012, 1.0, 1.0, 0, 10), (0.64, 1.0, 1.0, 0, 10),
            (0.77, 1.01, 0.74, 0, 7), (0.86, 1.03, 0.30, 0.009, 4), (0.90, 1.035, 0.0, 0.009, 3),
            (1.0, 1.035, 0.0, 0.008, 3)]
    body = geom.loft("beutel", _rings_from_keys(keys, w, d, h), [materials.crinkle_paper(spec.tone)],
                     sharp_angle=60)
    geom.parent(body, root)
    # umgeschlagener Kopf + Verschlussclip
    fold = geom.rbox("falz", w * 1.035, 0.012, h * 0.085, 0.002, materials.crinkle_paper(spec.tone))
    geom.parent(fold, root, T(0, -0.001, h * 0.905))
    clip_tone = "creme" if spec.tone not in ("creme", "natur", "weiss") else "dunkeloliv"
    clip = geom.rbox("clip", w * 1.10, 0.0135, 0.0065, 0.0008, materials.paper(clip_tone, 0.6))
    geom.parent(clip, root, T(0, -0.001, h * 0.938))
    _front_label(root, spec, w, h, -d / 2, h * 0.45, size=(0.74 * w, min(0.36 * h, 0.95 * w)),
                 wrap_target=body)
    return root


def _pouch(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("pouch")
    keys = [(0.0, 0.90, 0.82, 0, 2.6), (0.03, 0.98, 1.0, 0, 2.6), (0.30, 1.0, 0.93, 0, 2.2),
            (0.62, 1.0, 0.56, 0, 1.9), (0.84, 1.0, 0.10, 0.004, 1.8), (0.885, 1.0, 0.0, 0.003, 2.0),
            (1.0, 1.0, 0.0, 0.003, 2.0)]
    body = geom.loft("standbeutel", _rings_from_keys(keys, w, d, h),
                     [materials.crinkle_paper(spec.tone, strength=0.8)], sharp_angle=60)
    geom.parent(body, root)
    zipl = geom.rbox("zip", w * 0.97, 0.0052, 0.0022, 0.0006, materials.paper(spec.tone, 0.6))
    geom.parent(zipl, root, T(0, 0, h * 0.905))
    _front_label(root, spec, w, h, -d / 2, h * 0.50, size=(0.62 * w, 0.32 * h), wrap_target=body)
    return root


def _pasta_bag(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("pasta_bag")
    keys = [(0.0, 1.0, 0.0, 0.004, 2.0), (0.03, 1.0, 0.0, 0.004, 2.0), (0.08, 0.98, 0.55, 0, 2.1),
            (0.18, 0.96, 0.97, 0, 2.4), (0.50, 0.95, 1.0, 0, 2.5), (0.78, 0.96, 0.92, 0, 2.4),
            (0.91, 0.99, 0.42, 0, 2.1), (0.955, 1.0, 0.0, 0.004, 2.0), (1.0, 1.0, 0.0, 0.004, 2.0)]
    body = geom.loft("kissenbeutel", _rings_from_keys(keys, w, d, h),
                     [materials.crinkle_paper(spec.tone, strength=1.0)], sharp_angle=60)
    geom.parent(body, root)
    _front_label(root, spec, w, h, -d / 2, h * 0.54, size=(0.66 * w, 0.26 * h), wrap_target=body)
    return root


def _marzipan_loaf(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("marzipan_loaf")
    landscape = w > h
    lw_, lh_ = (h, w) if landscape else (w, h)      # Querschnittsbreite, Laenge
    keys = [(0.0, 0.5, 0.5, 0, 2.6), (0.03, 0.84, 0.84, 0, 2.8), (0.09, 1.0, 1.0, 0, 3.2),
            (0.91, 1.0, 1.0, 0, 3.2), (0.97, 0.84, 0.84, 0, 2.8), (1.0, 0.5, 0.5, 0, 2.6)]
    wrap = materials.paper(spec.tone, 0.45, texture=0.6)
    body = geom.loft("brot", _rings_from_keys(keys, lw_, d, lh_, n=48), [wrap], sharp_angle=60)
    bk = [(0.27, 1.03, 1.05, 0, 3.2), (0.73, 1.03, 1.05, 0, 3.2)]
    band = geom.loft("banderole", _rings_from_keys(bk, lw_, d, lh_, n=48, sub=1),
                     [materials.paper(_label_paper_name(spec), 0.7)], cap_bottom=False,
                     cap_top=False, sharp_angle=60)
    holder = geom.empty("brot_achse")
    geom.parent(holder, root, (T(0, 0, h / 2) @ R("Y", 90) @ T(0, 0, -lh_ / 2)) if landscape else T())
    geom.parent(body, holder)
    geom.parent(band, holder)
    if landscape:
        size = (0.40 * w, 0.70 * h)
    else:
        size = (0.74 * w, 0.38 * h)
    lw, lh = size
    mat = _rect_label_mat(spec, lw, lh, frame=False)
    dec = geom.plane_decal("etikett", lw, lh, mat, nx=10, nz=10)
    geom.parent(dec, root, T(0, -d / 2 - 0.004, h / 2))
    geom.shrinkwrap(dec, band, 0.0002)
    return root


# ---------------------------------------------------------------------------
# Schachteln / flache Artikel
# ---------------------------------------------------------------------------
def _tea_box(spec, rng, name="tea_box"):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty(name)
    body = geom.rbox("schachtel", w, d, h, 0.0007, materials.paper(spec.tone, 0.68))
    geom.parent(body, root)
    # abgesetzter Deckelstreifen (Stuelpschachtel) - bricht die glatte Flaeche
    light = spec.tone in ("creme", "natur", "sand", "weiss", "salbei", "kraft", "senf")
    accent = {"salbei": "dunkeloliv", "kraft": "dunkeloliv"}.get(spec.tone, "oliv") if light else "creme"
    bh = min(0.15 * h, 0.022) if h >= w else min(0.2 * h, 0.018)
    e = 0.0007
    band = geom.rbox("deckelstreifen", w + e, d + e, bh, 0.0007, materials.paper(accent, 0.66))
    geom.parent(band, root, T(0, 0, h - bh + e / 2))
    zc = (h - bh) * (0.5 if h < w else 0.52)
    _front_label(root, spec, w, h - bh, -d / 2, zc)
    return root


def _cookie_pack(spec, rng):
    return _tea_box(spec, rng, "cookie_pack")


def _stick_pack(spec, rng):
    return _tea_box(spec, rng, "stick_pack")


def _chocolate_bar(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("chocolate_bar")
    body = geom.rbox("tafel", w, d, h, 0.0012, materials.paper(spec.tone, 0.55, texture=0.7))
    geom.parent(body, root)
    band_paper = _label_paper_name(spec)
    bm = materials.paper(band_paper, 0.72)
    e = 0.0009
    if h >= w:
        bh = 0.46 * h
        band = geom.rbox("banderole", w + e, d + e, bh, 0.0008, bm)
        geom.parent(band, root, T(0, 0, (h - bh) / 2))
        _front_label(root, spec, w, bh, -(d + e) / 2, h / 2, size=(0.90 * w, 0.84 * bh),
                     paper=band_paper)
    else:
        bw = 0.46 * w
        band = geom.rbox("banderole", bw, d + e, h + e, 0.0008, bm)
        geom.parent(band, root, T(0, 0, -e / 2))
        _front_label(root, spec, bw, h, -(d + e) / 2, h / 2, size=(0.88 * bw, 0.86 * h),
                     paper=band_paper)
    return root


def _praline_box(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("praline_box")
    base = geom.rbox("boden", w - 0.002, d, h - 0.002, 0.001, materials.paper("natur", 0.7))
    geom.parent(base, root, T(0, 0.0008, 0.001))
    lid_d = d * 0.72
    lid = geom.rbox("deckel", w, lid_d, h, 0.0012, materials.paper(spec.tone, 0.62))
    geom.parent(lid, root, T(0, -d / 2 + lid_d / 2, 0))
    s = min(w, h)
    _front_label(root, spec, w, h, -d / 2, h / 2, size=(0.56 * s, 0.38 * s))
    return root


def _notebook(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("notebook")
    cov = materials.paper(spec.tone, 0.8, texture=2.0, sheen=0.15)
    ct = 0.0016
    for y in (-d / 2 + ct / 2, d / 2 - ct / 2):
        c = geom.rbox("deckel", w, ct, h, 0.0006, cov)
        geom.parent(c, root, T(0, y, 0))
    spine = geom.rbox("ruecken", ct, d, h, 0.0006, cov)
    geom.parent(spine, root, T(-w / 2 + ct / 2, 0, 0))
    pages = geom.rbox("seiten", w - 0.004, d - 2 * ct, h - 0.005, 0.0, materials.paper("weiss", 0.85))
    geom.parent(pages, root, T(0.0005, 0, 0.0025))
    band = geom.rbox("gummiband", 0.007, d + 0.0012, h + 0.0012, 0.0004,
                     materials.paper("ink" if spec.tone != "ink" else "salbei", 0.8))
    geom.parent(band, root, T(w * 0.33, 0, -0.0006))
    _front_label(root, spec, w, h, -d / 2, h * 0.60, size=(0.50 * w, 0.20 * h))
    return root


def _card(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("card")
    th = 0.0007
    pm = materials.paper("#EFEBD9", 0.8)
    back = geom.rbox("karte_hinten", w, th, h, 0.0, pm)
    geom.parent(back, root, T(0, min(d, 0.004) / 2 - th / 2, 0))
    front = geom.rbox("karte_vorn", w, th, h, 0.0, pm)
    geom.parent(front, root, T(0, -min(d, 0.004) / 2 + th / 2, 0))
    img = labels.card_image(spec.label or "Danke", w * 1000, h * 1000, seed=spec.seed, sub=spec.sub)
    mat = materials.label_paper(materials.image_from_pil(img, "karte"), 0.78)
    dec = geom.plane_decal("druck", w, h, mat)
    geom.parent(dec, root, T(0, -min(d, 0.004) / 2 - 0.00006, h / 2))
    return root


def _tin(spec, rng):
    w, d, h = spec.w, spec.d, spec.h
    root = geom.empty("tin")
    metal = materials.painted_metal(spec.tone, 0.45)
    if spec.shape == "eckig":
        body = geom.rbox("dose", w - 0.0012, d, h - 0.0012, 0.004, metal, segments=4)
        geom.parent(body, root, T(0, 0.0005, 0.0006))
        lid_d = d * 0.42
        lid = geom.rbox("dosendeckel", w, lid_d, h, 0.0045, metal, segments=4)
        geom.parent(lid, root, T(0, -d / 2 + lid_d / 2, 0))
        s = min(w, h)
        _front_label(root, spec, w, h, -d / 2, h / 2, size=(0.74 * w, min(0.5 * h, 0.9 * 0.74 * w)))
        return root
    Rr = w / 2
    prof = [(Rr - 0.003, 0.0), (Rr - 0.0008, 0.0012), (Rr - 0.0008, 0.56 * d),
            (Rr, 0.56 * d), (Rr, d - 0.0022), (Rr - 0.0009, d - 0.0006), (Rr - 0.0035, d)]
    body = geom.lathe("dose", prof, 64, [metal], sharp_angle=35)
    holder = geom.empty("dosen_achse")
    geom.parent(holder, root, T(0, d / 2, Rr) @ R("X", 90))
    geom.parent(body, holder)
    paper = _label_paper_name(spec)
    img = labels.round_label_image(spec.label, spec.sub, paper, 2 * Rr * 0.80 * 1000, seed=spec.seed)
    mat = materials.label_paper(materials.image_from_pil(img, "dose"))
    disc = geom.disc_decal("etikett", 2 * Rr * 0.80, mat)
    geom.parent(disc, holder, T(0, 0, d + 0.00015))
    return root


# ---------------------------------------------------------------------------
# Glas
# ---------------------------------------------------------------------------
def _jar(spec, rng):
    Rr, h = spec.w / 2, spec.h
    root = geom.empty("jar")
    lid_h = 0.0135
    hg = h - lid_h * 0.45
    rn = Rr * 0.88
    wall = 0.0026
    outer = geom.smooth_profile([(Rr * 0.86, 0.0), (Rr, 0.006), (Rr, 0.45 * hg), (Rr, 0.76 * hg),
                                 (rn, 0.87 * hg), (rn, hg)], 6)
    inner = [(rn - wall, hg), (rn - wall, 0.87 * hg), (Rr - wall, 0.76 * hg), (Rr - wall, 0.012),
             (Rr * 0.6, 0.0075), (0.0, 0.007)]
    prof = [(0.0, 0.0)] + outer + inner
    glass = geom.lathe("glas", prof, 56, [materials.clear_glass()], cap_bottom=False, cap_top=False,
                       sharp_angle=50)
    geom.parent(glass, root)
    fill = 0.71 * hg
    rc = Rr - wall * 0.45
    cont = geom.lathe("inhalt", [(0.0, 0.0072), (Rr * 0.6, 0.0076), (rc, 0.0125), (rc, fill - 0.001),
                                 (rc - 0.0008, fill), (0.0, fill)], 56,
                      [materials.jar_contents(spec.contents or "erdbeer")], cap_bottom=False,
                      cap_top=False, sharp_angle=50)
    geom.parent(cont, root)
    rl = rn + 0.0028
    lid = geom.lathe("schraubdeckel", [(rl - 0.0006, h - lid_h), (rl, h - lid_h + 0.001),
                                       (rl, h - 0.0022), (rl - 0.0012, h - 0.0006), (rl - 0.004, h),
                                       (0.0, h)], 56,
                     [materials.painted_metal(spec.tone)],
                     cap_top=False, sharp_angle=30)
    geom.parent(lid, root)
    lw, lh = min(0.36 * 2 * math.pi * Rr, 0.085), 0.38 * hg
    mat = _rect_label_mat(spec, lw, lh, paper=str(spec.raw.get("label_tone", "creme")))
    dec = geom.cyl_decal("etikett", Rr + 0.0002, lw, lh, mat, 28, z0=0.50 * hg)
    geom.parent(dec, root)
    return root


def _candle(spec, rng):
    Rr, h = spec.w / 2, spec.h
    root = geom.empty("candle")
    wx = materials.wax()
    if spec.variant.startswith("stumpen"):
        prof = [(Rr - 0.002, 0.0), (Rr, 0.002), (Rr, h - 0.004), (Rr - 0.003, h - 0.0005),
                (Rr * 0.5, h - 0.0015), (0.0, h - 0.002)]
        body = geom.lathe("stumpen", prof, 56, [wx], cap_top=False, sharp_angle=50)
        geom.parent(body, root)
        top = h - 0.002
        rlab = Rr
        lh, zc = 0.34 * h, 0.40 * h
    else:
        wall = 0.003
        prof = [(0.0, 0.0), (Rr - 0.002, 0.0), (Rr, 0.002), (Rr, h), (Rr - wall, h),
                (Rr - wall, 0.012), (0.0, 0.011)]
        glass = geom.lathe("kerzenglas", prof, 56, [materials.clear_glass()], cap_bottom=False,
                           cap_top=False, sharp_angle=50)
        geom.parent(glass, root)
        top = 0.80 * h
        rc = Rr - wall * 0.45
        waxm = geom.lathe("wachs", [(0.0, 0.0112), (rc, 0.012), (rc, top), (rc - 0.004, top - 0.0012),
                                    (0.0, top - 0.0016)], 56, [wx], cap_bottom=False, cap_top=False,
                          sharp_angle=50)
        geom.parent(waxm, root)
        rlab = Rr
        lh, zc = 0.40 * h, 0.52 * h
    wick = geom.lathe("docht", [(0.0009, top - 0.003), (0.0009, top + 0.007), (0.0, top + 0.0075)], 8,
                      [materials.plain("#2B2620", 0.9, "dk_docht")], cap_top=False)
    geom.parent(wick, root, T(0, 0, 0) @ R("X", float(rng.uniform(-6, 6))))
    lw = min(0.34 * 2 * math.pi * rlab, 0.08)
    mat = _rect_label_mat(spec, lw, lh, paper="salbei" if spec.tone == "salbei" else "creme")
    dec = geom.cyl_decal("etikett", rlab + 0.0002, lw, lh, mat, 28, z0=zc)
    geom.parent(dec, root)
    return root


BOTTLE_VARIANTS = {
    # variant: (Glas, Kapsel/Verschluss, Kapselfarbe, Profiltyp)
    "wein_rot": ("gruen_dunkel", "kapsel", "#5A2622", "bordeaux"),
    "wein_weiss": ("gruen", "kapsel", "#D9D4BC", "burgunder"),
    "sekt": ("gruen_dunkel", "folie", "#B5A06A", "sekt"),
    "saft": ("braun", "schraub", "#E4E0CC", "saft"),
    "oel": ("gruen", "schraub", "#1F2416", "saft"),
    "likoer": ("klar", "schraub", "#1F2416", "saft"),
}


def bottle_profile(spec):
    """(r, z)-Profil der Flasche von unten nach oben (geglaettet)."""
    Rr, h = spec.w / 2, spec.h
    typ = BOTTLE_VARIANTS.get(spec.variant, BOTTLE_VARIANTS["wein_rot"])[3]
    rn = max(0.0138 * (h / 0.30) ** 0.5, 0.011)
    rn = min(rn, Rr * 0.5)
    if typ == "bordeaux":
        pts = [(Rr * 0.9, 0.0), (Rr, 0.008), (Rr, 0.30 * h), (Rr, 0.585 * h), (Rr * 0.93, 0.64 * h),
               (rn * 1.25, 0.715 * h), (rn * 1.03, 0.76 * h), (rn, 0.90 * h), (rn, 0.968 * h),
               (rn * 1.12, 0.974 * h), (rn * 1.12, 0.992 * h), (rn * 0.95, h)]
    elif typ == "burgunder":
        pts = [(Rr * 0.9, 0.0), (Rr, 0.008), (Rr, 0.25 * h), (Rr, 0.47 * h), (Rr * 0.9, 0.57 * h),
               (Rr * 0.6, 0.68 * h), (rn * 1.15, 0.79 * h), (rn, 0.90 * h), (rn, 0.968 * h),
               (rn * 1.12, 0.974 * h), (rn * 1.12, 0.992 * h), (rn * 0.95, h)]
    elif typ == "sekt":
        pts = [(Rr * 0.88, 0.0), (Rr, 0.010), (Rr, 0.22 * h), (Rr, 0.42 * h), (Rr * 0.9, 0.52 * h),
               (Rr * 0.62, 0.64 * h), (rn * 1.3, 0.76 * h), (rn * 1.05, 0.86 * h), (rn, 0.93 * h),
               (rn * 1.2, 0.94 * h), (rn * 1.2, 0.96 * h), (rn, 0.965 * h), (rn, h)]
    else:  # saft / oel
        pts = [(Rr * 0.9, 0.0), (Rr, 0.006), (Rr, 0.30 * h), (Rr, 0.60 * h), (Rr * 0.92, 0.66 * h),
               (rn * 1.45, 0.75 * h), (rn * 1.15, 0.82 * h), (rn * 1.1, 0.93 * h), (rn * 1.1, h)]
    return geom.smooth_profile(pts, 5)


def profile_radius(profile, z):
    zs = np.array([p[1] for p in profile])
    rs = np.array([p[0] for p in profile])
    return np.interp(z, zs, rs)


def _bottle(spec, rng):
    Rr, h = spec.w / 2, spec.h
    root = geom.empty(spec.type)
    glass_kind, closure, cap_hex, typ = BOTTLE_VARIANTS.get(spec.variant, BOTTLE_VARIANTS["wein_rot"])
    prof = bottle_profile(spec)
    body = geom.lathe("flasche", prof, 56, [materials.bottle_glass(glass_kind)], sharp_angle=50)
    geom.parent(body, root)
    e = 0.0006
    if closure == "kapsel":
        z0 = h - 0.19 * h
        zs = np.linspace(z0, h, 14)
        cp = [(float(profile_radius(prof, z)) + e, float(z)) for z in zs]
        cp += [(cp[-1][0] - 0.001, h + 0.0006), (0.0, h + 0.0008)]
        cap = geom.lathe("kapsel", cp, 40, [materials.paper(cap_hex, 0.42, texture=0.5)],
                         cap_bottom=False, cap_top=False, sharp_angle=40)
    elif closure == "folie":
        z0 = h - 0.36 * h
        zs = np.linspace(z0, 0.955 * h, 22)
        cp = [(float(profile_radius(prof, z)) + e, float(z)) for z in zs]
        rn = cp[-1][0]
        cp += [(rn * 1.08, 0.962 * h), (rn * 1.42, 0.975 * h), (rn * 1.5, 0.99 * h),
               (rn * 1.42, 1.005 * h), (rn * 1.0, 1.016 * h), (0.0, 1.018 * h)]
        cap = geom.lathe("folienkapsel", cp, 40, [materials.foil(cap_hex, 0.45)], cap_bottom=False,
                         cap_top=False, sharp_angle=60)
    else:
        rn = float(profile_radius(prof, h * 0.97))
        ch = 0.075 * h
        cp = [(rn + 0.0012, h - ch), (rn + 0.0016, h - ch + 0.001), (rn + 0.0016, h),
              (rn + 0.0006, h + 0.0012), (0.0, h + 0.0014)]
        cap = geom.lathe("schraubverschluss", cp, 40, [materials.painted_metal(cap_hex, 0.4)],
                         cap_top=False, sharp_angle=35)
    geom.parent(cap, root)
    # Etikett auf dem zylindrischen Teil
    z_body_top = {"bordeaux": 0.585, "burgunder": 0.47, "sekt": 0.42, "saft": 0.60}[typ] * h
    lh = min(0.30 * h, z_body_top - 0.035 * h - 0.05 * h)
    zc = 0.07 * h + (z_body_top - 0.07 * h) / 2 + 0.01 * h
    lw = min(0.36 * 2 * math.pi * Rr, 0.095)
    mat = _rect_label_mat(spec, lw, lh, paper="salbei" if spec.tone == "salbei" else "creme")
    dec = geom.cyl_decal("etikett", Rr + 0.00025, lw, lh, mat, 28, z0=zc)
    geom.parent(dec, root)
    return root


BUILDERS = {
    "coffee_bag": _coffee_bag, "tea_box": _tea_box, "chocolate_bar": _chocolate_bar,
    "praline_box": _praline_box, "cookie_pack": _cookie_pack, "tin": _tin, "jar": _jar,
    "bottle": _bottle, "bottle_small": _bottle, "pouch": _pouch, "pasta_bag": _pasta_bag,
    "marzipan_loaf": _marzipan_loaf, "stick_pack": _stick_pack, "notebook": _notebook,
    "candle": _candle, "card": _card,
}


def build_item(spec: ItemSpec, rng=None):
    """Baut den Artikel im kanonischen Display-System und gibt das Root-Empty zurueck."""
    rng = rng or np.random.default_rng(spec.seed)
    root = BUILDERS[spec.type](spec, rng)
    root.name = f"artikel_{spec.index:02d}_{spec.type}"
    return root


def lying_matrix(spec: ItemSpec, x, y, yaw_deg=0.0, z=0.0):
    """Pose fuers Flatlay: Artikel liegt auf dem Ruecken, Etikett nach oben,
    Oberkante zeigt nach +y. (x, y) = Mittelpunkt der Grundflaeche w x h."""
    return T(x, y, z) @ R("Z", yaw_deg) @ T(0, -spec.h / 2, spec.d / 2) @ R("X", -90)
