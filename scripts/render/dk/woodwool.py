"""Holzwolle: tausende duenne, flache, unregelmaessig gekraeuselte Spaene als ein Mesh.

Bewusst kein Partikelsystem: die Spaene werden per numpy als Zufallslaeufe mit
wechselnder Kruemmung, Knicken und Verdrehung erzeugt (schnell, reproduzierbar,
unabhaengig von der Blender-Version). Spaene enden an Artikeln (keine sichtbaren
Durchdringungen), stossen an den Waenden um und duerfen am Rand ueberquellen.
"""
from __future__ import annotations

import math

import numpy as np

from . import geom, items as items_mod, materials

DS = 0.0026           # Schrittweite entlang des Spans (m)


def _grow(rng, start, z_target, steps, bounds=None, out0=None, hang=None, floor_z=0.0015,
          curl=1.0):
    """Zufallslaeufe. start (S,3). bounds = (xi, yi, xo, yo, rim_z, inner_floor) oder None.
    Rueckgabe: Punkte (S,M,3), Seitenvektoren (S,M,3)."""
    S = len(start)
    pos = start.copy()
    phi = rng.uniform(0, 2 * np.pi, S)
    psi = rng.normal(0, 0.15, S)
    kappa = rng.normal(0, 55.0, S) * curl
    tau = rng.uniform(0, 2 * np.pi, S)
    tw_rate = rng.normal(0, 0.10, S)
    out = np.zeros(S, bool) if out0 is None else out0.copy()
    zt = z_target.copy()
    hang = np.full(S, floor_z) if hang is None else hang
    P = np.empty((S, steps, 3))
    Sd = np.empty((S, steps, 3))
    up = np.array([0.0, 0.0, 1.0])
    for m in range(steps):
        kappa += -0.12 * kappa + rng.normal(0, 28.0, S) * curl
        kink = rng.random(S) < 0.06
        phi += kappa * DS + kink * rng.normal(0, 0.9, S)
        tgt = np.where(out, hang, zt)
        psi = 0.78 * psi + rng.normal(0, 0.13, S) + np.clip((tgt - pos[:, 2]) * 55.0, -0.6, 0.6) * 0.3
        psi = np.clip(psi, -1.25, 1.1)
        cp = np.cos(psi)
        d = np.stack([cp * np.cos(phi), cp * np.sin(phi), np.sin(psi)], axis=1)
        new = pos + d * DS
        if bounds is not None:
            xi, yi, xo, yo, rim_z, in_floor = bounds
            low = new[:, 2] < rim_z + 0.0018
            inside_prev = ~out
            # innen an der Wand umkehren
            hit_x = inside_prev & low & (np.abs(new[:, 0]) > xi)
            phi = np.where(hit_x, np.pi - phi, phi)
            new[:, 0] = np.where(hit_x, np.sign(new[:, 0]) * xi, new[:, 0])
            hit_y = inside_prev & low & (np.abs(new[:, 1]) > yi)
            phi = np.where(hit_y, -phi, phi)
            new[:, 1] = np.where(hit_y, np.sign(new[:, 1]) * yi, new[:, 1])
            beyond = (np.abs(new[:, 0]) > xo) | (np.abs(new[:, 1]) > yo)
            out = out | beyond
            # draussen: nicht zurueck in die Wand
            in_band = out & low & (np.abs(new[:, 0]) < xo) & (np.abs(new[:, 1]) < yo)
            if in_band.any():
                dx = xo - np.abs(new[:, 0])
                dy = yo - np.abs(new[:, 1])
                px = in_band & (dx <= dy)
                py = in_band & (dx > dy)
                new[:, 0] = np.where(px, np.sign(new[:, 0] + 1e-9) * xo, new[:, 0])
                new[:, 1] = np.where(py, np.sign(new[:, 1] + 1e-9) * yo, new[:, 1])
            new[:, 2] = np.where(out, np.maximum(new[:, 2], floor_z), np.maximum(new[:, 2], in_floor))
        else:
            new[:, 2] = np.maximum(new[:, 2], floor_z)
        pos = new
        P[:, m] = pos
        s = np.cross(d, up)
        ln = np.linalg.norm(s, axis=1, keepdims=True)
        s = np.where(ln > 1e-4, s / np.maximum(ln, 1e-9), np.array([1.0, 0.0, 0.0]))
        nrm = np.cross(s, d)
        tau += tw_rate + rng.normal(0, 0.05, S)
        Sd[:, m] = s * np.cos(tau)[:, None] + nrm * np.sin(tau)[:, None]
    return P, Sd


def _inside_any(P, placements, margin=0.0012):
    """Maske (S,M): Punkt liegt in einem Artikel (Box-lokale Koordinaten)."""
    S, M, _ = P.shape
    flat = P.reshape(-1, 3)
    mask = np.zeros(len(flat), bool)
    for pl in placements:
        inv = np.array(pl.matrix.inverted())
        loc = flat @ inv[:3, :3].T + inv[:3, 3]
        s = pl.spec
        if pl.kind == "bottle":
            prof = items_mod.bottle_profile(s)
            rr = items_mod.profile_radius(prof, np.clip(loc[:, 2], 0, s.h)) + margin
            m = (loc[:, 0] ** 2 + loc[:, 1] ** 2 <= rr ** 2) & (loc[:, 2] >= -margin) & \
                (loc[:, 2] <= s.h + margin)
        elif pl.kind == "cyl":
            r = s.w / 2 + margin
            m = (loc[:, 0] ** 2 + loc[:, 1] ** 2 <= r * r) & (loc[:, 2] >= -margin) & \
                (loc[:, 2] <= s.h + margin)
        else:
            m = (np.abs(loc[:, 0]) <= s.w / 2 + margin) & (np.abs(loc[:, 1]) <= s.d / 2 + margin) & \
                (loc[:, 2] >= -margin) & (loc[:, 2] <= s.h + margin)
        mask |= m
    return mask.reshape(S, M)


def _mesh_from_strands(name, P, Sd, lengths, widths, rnd, mat):
    S, M, _ = P.shape
    keep = lengths >= 7
    idx = np.nonzero(keep)[0]
    verts, uvs, faces = [], [], []
    base = 0
    for i in idx:
        n = int(lengths[i])
        p, s = P[i, :n], Sd[i, :n]
        w = widths[i]
        a = p - s * (w / 2)
        b = p + s * (w / 2)
        v = np.empty((2 * n, 3))
        v[0::2], v[1::2] = a, b
        verts.append(v)
        uv = np.empty((2 * n, 2))
        uv[:, 0] = rnd[i]
        uv[0::2, 1] = uv[1::2, 1] = np.arange(n) * DS
        uvs.append(uv)
        k = np.arange(n - 1) * 2 + base
        faces.append(np.stack([k, k + 1, k + 3, k + 2], axis=1))
        base += 2 * n
    if not verts:
        return None
    verts = np.vstack(verts)
    uvs = np.vstack(uvs)
    faces = np.vstack(faces)
    return geom.mesh_obj(name, verts, faces.tolist(), uvs, [mat], smooth=True)


def build_wool(d, placements, z_wool, rng, density=1.0):
    """Holzwolle-Fuellung der offenen Box (Box-lokale Koordinaten).
    Rueckgabe: Liste der erzeugten Objekte."""
    L, W, H, t = d.L, d.W, d.H, d.t
    rim_z = t + H
    area_cm2 = L * W * 1e4
    S = int(area_cm2 * 3.4 * density)
    steps = 60
    xi, yi = L / 2 - 0.0012, W / 2 - 0.0012
    xo, yo = L / 2 + t + 0.0016, W / 2 + t + 0.0016
    start = np.stack([rng.uniform(-xi, xi, S), rng.uniform(-yi, yi, S), np.zeros(S)], axis=1)
    u = rng.random(S)
    zt = np.where(u < 0.62, rng.uniform(z_wool - 0.024, z_wool + 0.002, S),
                  rng.uniform(z_wool - 0.004, z_wool + 0.011, S))
    # am Rand quillt es ueber
    wall_dist = np.minimum(xi - np.abs(start[:, 0]), yi - np.abs(start[:, 1]))
    over = (wall_dist < 0.025) & (rng.random(S) < 0.13)
    zt = np.where(over, rim_z + rng.uniform(0.001, 0.009, S), zt)
    start[:, 2] = zt + rng.normal(0, 0.003, S)
    hang = rim_z - rng.uniform(0.005, 0.04, S)
    P, Sd = _grow(rng, start, zt, steps, (xi, yi, xo, yo, rim_z, t + 0.004), hang=hang)
    lengths = rng.integers(20, steps + 1, S)
    mask = _inside_any(P, placements)
    first_hit = np.where(mask.any(axis=1), mask.argmax(axis=1), steps)
    lengths = np.minimum(lengths, first_hit)
    # ausserhalb der Box nur kurze Enden (sonst stehen "Draehte" in der Luft)
    outside = (np.abs(P[:, :, 0]) > xo - 1e-6) | (np.abs(P[:, :, 1]) > yo - 1e-6)
    first_out = np.where(outside.any(axis=1), outside.argmax(axis=1), steps)
    lengths = np.minimum(lengths, first_out + rng.integers(4, 15, S))
    widths = rng.uniform(0.0009, 0.0023, S)
    rnd = rng.random(S)
    objs = []
    wool = _mesh_from_strands("holzwolle", P, Sd, lengths, widths, rnd, materials.wood_wool())
    if wool is not None:
        objs.append(wool)
    # Bett darunter (fuellt die Tiefe, damit man nie auf den Boden schaut)
    nx, ny = 48, 36
    gx = np.linspace(-L / 2 + 0.0008, L / 2 - 0.0008, nx)
    gy = np.linspace(-W / 2 + 0.0008, W / 2 - 0.0008, ny)
    X, Y = np.meshgrid(gx, gy)
    ph = rng.uniform(0, 6.28, 6)
    Z = (z_wool - 0.013 + 0.004 * np.sin(X * 55 + ph[0]) * np.sin(Y * 48 + ph[1])
         + 0.003 * np.sin(X * 131 + ph[2]) + 0.003 * np.sin(Y * 117 + ph[3])
         + rng.normal(0, 0.0012, X.shape))
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)
    faces = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            a = j * nx + i
            faces.append((a, a + 1, a + nx + 1, a + nx))
    bed = geom.mesh_obj("holzwolle_bett", verts, faces, mats=[materials.wood_wool(bed=True)],
                        smooth=True)
    objs.append(bed)
    return objs


def build_loose(rng, rect, n=10, avoid=None):
    """Ein paar lose Spaene auf dem Tisch um das Rechteck rect=(x0,y0,x1,y1) herum
    (Weltkoordinaten, Box-lokal wenn geparentet)."""
    x0, y0, x1, y1 = rect
    starts = []
    for _ in range(n):
        side = rng.choice(4, p=[0.45, 0.2, 0.2, 0.15])     # vorn, links, rechts, hinten
        off = rng.uniform(0.012, 0.07)
        if side == 0:
            starts.append((rng.uniform(x0, x1), y0 - off, 0.0025))
        elif side == 1:
            starts.append((x0 - off, rng.uniform(y0, y1), 0.0025))
        elif side == 2:
            starts.append((x1 + off, rng.uniform(y0, y1), 0.0025))
        else:
            starts.append((rng.uniform(x0, x1), y1 + off, 0.0025))
    start = np.array(starts)
    S = len(start)
    steps = 34
    zt = np.full(S, 0.0022)
    e = 0.004
    bounds = ((x1 - x0) / 2 - 0.5, (y1 - y0) / 2 - 0.5, (x1 - x0) / 2 + e, (y1 - y0) / 2 + e, 10.0, 0.0)
    c = np.array([(x0 + x1) / 2, (y0 + y1) / 2, 0.0])
    P, Sd = _grow(rng, start - c, zt, steps, bounds, out0=np.ones(S, bool),
                  hang=np.full(S, 0.0022), floor_z=0.0012, curl=0.6)
    P = P + c
    lengths = rng.integers(14, steps + 1, S)
    return _mesh_from_strands("holzwolle_lose", P, Sd, lengths, rng.uniform(0.0012, 0.0026, S),
                              rng.random(S), materials.wood_wool())
