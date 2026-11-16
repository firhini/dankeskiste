"""Stuelpdeckel-Karton aus Kraft-Wellpappe, Band mit Schleife, Logo-Sticker, Grusskarte.

Koordinaten des Box-Roots: Ursprung = Mitte der Standflaeche auf dem Tisch,
x = Laenge (links/rechts), y = Tiefe (-y vorn zur Kamera), z = oben.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from mathutils import Matrix

from . import geom, labels, materials
from .config import (BOX_SIZES, BOX_WALL, CARD_SIZE, CM, LID_CLEARANCE, LID_HEIGHT_FRAC,
                     RIBBON_TONES, RIBBON_WIDTH, STICKER_DIAMETER)
from .geom import R, T


@dataclass
class BoxDims:
    L: float          # Innenlaenge (m)
    W: float          # Innentiefe
    H: float          # Innenhoehe
    t: float          # Wandstaerke
    lid_h: float      # Hoehe des Deckelrands
    c: float          # Spiel Deckel/Unterteil

    @property
    def outer(self):  # Aussenmasse Unterteil
        return (self.L + 2 * self.t, self.W + 2 * self.t, self.H + self.t)

    @property
    def lid_outer(self):
        return (self.L + 4 * self.t + 2 * self.c, self.W + 4 * self.t + 2 * self.c)

    @property
    def closed_h(self):
        return self.H + 2 * self.t


def dims_for(size) -> BoxDims:
    if isinstance(size, (list, tuple)) and len(size) == 3:
        L, W, H = size
    else:
        L, W, H = BOX_SIZES.get(str(size).lower(), BOX_SIZES["mittel"])
    return BoxDims(L * CM, W * CM, H * CM, BOX_WALL * CM, LID_HEIGHT_FRAC * H * CM,
                   LID_CLEARANCE * CM)


def _wall(name, length, height, t, normal_axis, sign, mat_out, mat_edge, mat_in):
    """Wandplatte: lokal X = Laenge, Y = Hoehe, Z = Staerke (+Z = aussen)."""
    p = geom.panel(name, length, height, t, mat_out, mat_edge, mat_in)
    if normal_axis == "y":
        if sign < 0:   # Front: X->X, Y->Z, Z->-Y
            rot = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
        else:          # Rueckwand: X->-X, Y->Z, Z->+Y
            rot = Matrix(((-1, 0, 0), (0, 0, 1), (0, 1, 0)))
    else:
        if sign < 0:   # links: X->-Y, Y->Z, Z->-X
            rot = Matrix(((0, 0, -1), (-1, 0, 0), (0, 1, 0)))
        else:          # rechts: X->+Y, Y->Z, Z->+X
            rot = Matrix(((0, 0, 1), (1, 0, 0), (0, 1, 0)))
    return p, rot.to_4x4()


def build_base(d: BoxDims, rng):
    """Offenes Unterteil. Rueckgabe: Root-Empty."""
    root = geom.empty("box_unterteil")
    k_out, k_in, k_edge = materials.kraft_board(), materials.kraft_board(inner=True), \
        materials.corrugated_edge()
    t = d.t
    floor = geom.panel("boden", d.L + 2 * t, d.W + 2 * t, t, k_in, k_edge)
    geom.parent(floor, root, T(0, 0, t / 2))
    zc = t + d.H / 2
    # Seitenwaende laufen durch (ihre Schnittkante ist vorn/hinten sichtbar)
    for sign in (-1, 1):
        p, rot = _wall("wand_seite", d.W + 2 * t, d.H, t, "x", sign, k_out, k_edge, k_in)
        geom.parent(p, root, T(sign * (d.L / 2 + t / 2), 0, zc) @ rot)
        p, rot = _wall("wand_laengs", d.L, d.H, t, "y", sign, k_out, k_edge, k_in)
        geom.parent(p, root, T(0, sign * (d.W / 2 + t / 2), zc) @ rot)
    return root


def build_lid(d: BoxDims, rng):
    """Stuelpdeckel. Ursprung = Mitte der Unterseite der Deckelplatte
    (geschlossen liegt er damit bei z = t + H auf dem Unterteil)."""
    root = geom.empty("box_deckel")
    k_out, k_in, k_edge = materials.kraft_board(), materials.kraft_board(inner=True), \
        materials.corrugated_edge()
    t = d.t
    Lo, Wo = d.lid_outer
    top = geom.panel("deckelplatte", Lo, Wo, t, k_out, k_edge, k_in)
    geom.parent(top, root, T(0, 0, t / 2))
    zc = -d.lid_h / 2
    for sign in (-1, 1):
        p, rot = _wall("deckel_seite", Wo, d.lid_h, t, "x", sign, k_out, k_edge, k_in)
        geom.parent(p, root, T(sign * (Lo / 2 - t / 2), 0, zc) @ rot)
        p, rot = _wall("deckel_laengs", Lo - 2 * t, d.lid_h, t, "y", sign, k_out, k_edge, k_in)
        geom.parent(p, root, T(0, sign * (Wo / 2 - t / 2), zc) @ rot)
    return root


# ---------------------------------------------------------------------------
# Deko auf dem Deckel
# ---------------------------------------------------------------------------
def add_sticker(lid_root, d: BoxDims, pos_xy, rng, text="Ihr Logo"):
    img = materials.image_from_pil(labels.sticker_image(text, STICKER_DIAMETER * 10,
                                                         seed=int(rng.integers(1e6))), "sticker")
    mat = materials.label_paper(img, rough=0.6)
    disc = geom.disc_decal("logo_sticker", STICKER_DIAMETER * CM, mat)
    yaw = float(rng.uniform(-7, 5))
    geom.parent(disc, lid_root, T(pos_xy[0], pos_xy[1], d.t + 0.00012) @ R("Z", yaw))
    return disc


def build_card(name, text="Danke", size_cm=CARD_SIZE, text_x=0.5, seed=0, sub=""):
    """Flache Karte, liegt in XY mit Schrift nach +z, Ursprung = Mitte Unterseite."""
    w, h = size_cm[0] * CM, size_cm[1] * CM
    root = geom.empty(name)
    th = 0.0006
    body = geom.rbox(name + "_karton", w, h, th, bevel=0.0, mat=materials.paper("#EFEBD9", 0.8))
    geom.parent(body, root)
    img = materials.image_from_pil(labels.card_image(text, size_cm[0] * 10, size_cm[1] * 10,
                                                     seed=seed, text_x=text_x, sub=sub), name)
    face = geom.plane_decal(name + "_druck", w, h, materials.label_paper(img, 0.78))
    # plane_decal steht in XZ mit Front -y  ->  flach legen, Front +z
    geom.parent(face, root, T(0, 0, th + 0.00005) @ R("X", -90))
    return root, (w, h, th)


def _band_path(d: BoxDims, xb, off, bumps=()):
    """Mittellinie des Bandes um die geschlossene Box in der Ebene x = xb.
    bumps: Liste (y0, y1, hoehe) - Band hebt sich dort (z. B. ueber der Karte)."""
    yl = d.lid_outer[1] / 2
    yb = d.outer[1] / 2
    z_top = d.closed_h
    z_lb = d.t + d.H - d.lid_h
    pts = [(-yb - off, 0.0), (-yl - off, z_lb)]
    n_arc = 6
    for i in range(n_arc + 1):          # vordere Deckelkante
        a = math.pi - (math.pi / 2) * i / n_arc
        pts.append((-yl + off * math.cos(a), z_top + off * math.sin(a)))
    ys = np.linspace(-yl, yl, 90)[1:-1]
    for y in ys:
        pts.append((float(y), z_top + off))
    for i in range(n_arc + 1):          # hintere Deckelkante
        a = math.pi / 2 - (math.pi / 2) * i / n_arc
        pts.append((yl + off * math.cos(a), z_top + off * math.sin(a)))
    pts += [(yl + off, z_lb), (yb + off, 0.0)]
    pts = np.array(pts)
    if bumps:
        lift = np.zeros(len(pts))
        on_top = pts[:, 1] > z_top
        for y0, y1, hgt in bumps:
            e = 0.006
            s = np.clip((pts[:, 0] - (y0 - e)) / e, 0, 1) * np.clip(((y1 + e) - pts[:, 0]) / e, 0, 1)
            s = s * s * (3 - 2 * s)
            lift = np.maximum(lift, s * hgt * on_top)
        pts[:, 1] += lift
    return np.stack([np.full(len(pts), xb), pts[:, 0], pts[:, 1]], axis=1)


def add_ribbon(root, d: BoxDims, tone, rng, xb, bow_y, bumps=()):
    """Einfach gebundenes Band (quer ueber die Tiefe) mit Schleife. root = Box-Root
    der geschlossenen Box."""
    mat = materials.cotton_ribbon(RIBBON_TONES.get(str(tone).lower(), "oliv"))
    w = RIBBON_WIDTH * CM
    off = 0.0007
    pts = geom.resample(_band_path(d, xb, off, bumps), 0.004)
    n = len(pts)
    # nicht perfekt: leichtes seitliches Wandern, minimale Wellen
    s = np.linspace(0, 1, n)
    ph = rng.uniform(0, 6.28, 3)
    pts[:, 0] += 0.0012 * np.sin(s * 9.0 + ph[0]) + 0.0006 * np.sin(s * 31.0 + ph[1])
    sides = np.tile(np.array([1.0, 0.0, 0.0]), (n, 1))
    tilt = 0.035 * np.sin(s * 14.0 + ph[2])
    sides[:, 1] = tilt
    band = geom.strip("band", pts, sides, w, mat, thickness=0.0)
    geom.parent(band, root)
    bow = build_bow(mat, rng, w, scale=float(np.clip(d.lid_outer[1] / 0.234, 0.78, 1.1)))
    geom.parent(bow, root, T(xb, bow_y, d.closed_h + off + 0.0006) @ R("Z", float(rng.uniform(-9, 9))))
    return band, bow


def build_bow(mat, rng, w, scale=1.0):
    """Stilisierte, aber glaubwuerdige Schleife: zwei Schlaufen, Knoten, zwei Enden.
    Liegt um den Ursprung, Schlaufen entlang +-x."""
    root = geom.empty("schleife")
    n = 34
    for sign in (1, -1):
        Lp = float(rng.uniform(0.050, 0.060)) * scale
        Hh = float(rng.uniform(0.027, 0.034)) * scale
        yaw = math.radians(float(rng.uniform(4, 20)) * -sign)
        t = np.linspace(0.0, 1.0, n)
        st, ct = np.sin(np.pi * t), np.cos(np.pi * t)
        x = sign * Lp * st ** 0.85
        z = Hh * st * (0.56 + 0.44 * ct) + 0.0035 + 0.002 * st
        y = 0.30 * w * ct * sign + 0.004 * st * float(rng.uniform(-1, 1))
        pts = np.stack([x, y, z], axis=1)
        # Breitenrichtung: waagrecht (y), an der Spitze leicht verdreht
        twist = 0.35 * st * float(rng.uniform(0.5, 1.0)) * sign
        sides = np.stack([np.zeros(n), np.cos(twist), np.sin(twist)], axis=1)
        widths = w * (0.58 + 0.42 * st ** 0.45)
        rz = np.array([[math.cos(yaw), -math.sin(yaw), 0], [math.sin(yaw), math.cos(yaw), 0],
                       [0, 0, 1]])
        # Schlaufen kippen leicht nach vorn, damit man auf die Bandflaeche schaut
        roll = math.radians(float(rng.uniform(24, 40)) if sign > 0 else float(rng.uniform(8, 22)))
        rx = np.array([[1, 0, 0], [0, math.cos(roll), -math.sin(roll)],
                       [0, math.sin(roll), math.cos(roll)]])
        rot = rz @ rx
        loop = geom.strip("schlaufe", pts @ rot.T, sides @ rot.T, w, mat, 0.0, widths=widths)
        geom.parent(loop, root)
    # Enden
    for sign in (1, -1):
        ang = math.radians(float(rng.uniform(205, 235)) if sign > 0 else float(rng.uniform(305, 335)))
        ln = float(rng.uniform(0.075, 0.095)) * scale
        m = 26
        s = np.linspace(0, 1, m)
        curve = float(rng.uniform(-0.35, 0.35))
        a = ang + curve * s
        dx, dy = np.cos(a), np.sin(a)
        x = np.cumsum(dx) * ln / m
        y = np.cumsum(dy) * ln / m
        z = 0.007 * (1 - s) ** 2 + 0.0035 * np.sin(np.pi * s) ** 2 * float(rng.uniform(0.4, 1.0)) \
            + 0.0005
        pts = np.stack([x, y, z], axis=1)
        tw = 0.25 * np.sin(np.pi * s) * float(rng.uniform(-1, 1))
        sides = np.stack([-dy * np.cos(tw), dx * np.cos(tw), np.sin(tw)], axis=1)
        widths = w * (0.55 + 0.45 * np.clip(s * 4, 0, 1) ** 0.6)
        # schraeg geschnittenes Ende
        shear = np.zeros(m)
        shear[-1] = w * 0.45 * (1 if rng.random() < 0.5 else -1)
        tail = _strip_sheared(pts, sides, widths, shear, mat)
        geom.parent(tail, root)
    # Knoten
    k = 20
    phi = np.linspace(0, 2 * np.pi, k)
    a_, b_ = 0.0085, 0.0062
    pts = np.stack([np.zeros(k), a_ * np.cos(phi), b_ * np.sin(phi) + b_ + 0.0008], axis=1)
    sides = np.tile(np.array([1.0, 0.0, 0.0]), (k, 1))
    knot = geom.strip("knoten", pts, sides, w * 0.62, mat, 0.0)
    geom.parent(knot, root, R("Z", float(rng.uniform(-12, 12))))
    return root


def _strip_sheared(pts, sides, widths, shear, mat):
    """Wie geom.strip, aber mit schraeg geschnittenem Ende (shear in m je Punkt)."""
    pts = np.asarray(pts, float)
    tang = np.gradient(pts, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-12
    sides = sides / (np.linalg.norm(sides, axis=1, keepdims=True) + 1e-12)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    arc = np.concatenate([[0], np.cumsum(seg)])
    nu = 4
    verts, uvs, faces = [], [], []
    M = len(pts)
    for i in range(M):
        for k in range(nu + 1):
            u = k / nu
            verts.append(pts[i] + sides[i] * (u - 0.5) * widths[i] + tang[i] * (u - 0.5) * shear[i])
            uvs.append((u, arc[i]))
    for i in range(M - 1):
        for k in range(nu):
            a = i * (nu + 1) + k
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    return geom.mesh_obj("bandende", verts, faces, uvs, [mat], smooth=True)


def build_closed(d: BoxDims, ribbon_tone, rng, with_card=True):
    """Geschlossene Box mit Sticker, Band, Schleife und Karte. Rueckgabe Root."""
    root = geom.empty("box_geschlossen")
    base = build_base(d, rng)
    geom.parent(base, root)
    lid = build_lid(d, rng)
    # Deckel sitzt nie ganz perfekt
    geom.parent(lid, root, T(float(rng.uniform(-0.0006, 0.0006)), float(rng.uniform(-0.0006, 0.0006)),
                            d.t + d.H + 0.0003) @ R("Z", float(rng.uniform(-0.35, 0.35))))
    Lo, Wo = d.lid_outer
    xb = -0.21 * Lo + float(rng.uniform(-0.004, 0.004))
    bow_y = -0.13 * Wo + float(rng.uniform(-0.006, 0.006))
    add_sticker(lid, d, (0.20 * Lo + float(rng.uniform(-0.004, 0.004)),
                         -0.02 * Wo + float(rng.uniform(-0.004, 0.004))), rng)
    bumps = []
    if with_card:
        cw, ch = CARD_SIZE[0] * CM, CARD_SIZE[1] * CM
        card, (_, _, cth) = build_card("karte", "Danke", text_x=0.66, seed=int(rng.integers(1e6)))
        cyaw = float(rng.uniform(-9, -3))
        cx = xb + 0.28 * cw
        cy = min(0.21 * Wo, Wo / 2 - ch / 2 - 0.012)
        geom.parent(card, root, T(cx, cy, d.closed_h + 0.0001) @ R("Z", cyaw))
        bumps.append((cy - ch / 2 - 0.001, cy + ch / 2 + 0.001, cth + 0.0003))
    add_ribbon(root, d, ribbon_tone, rng, xb, bow_y, bumps)
    return root
