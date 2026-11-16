"""Automatische Anordnung.

pack_box():  Artikel im Praesentations-Stil in die offene Box stellen - hohe hinten,
             flache angelehnt, Flaschen liegend vorn (bei zu kurzer Box schraeg ueber
             den Rand), alles mit kleinen, per Seed reproduzierbaren Unregelmaessigkeiten.
             Kollisionen werden in der Seitenansicht (y/z) exakt geprueft, in x ueber
             getrennte Spalten ausgeschlossen.
knoll():     Flatlay - geschlossene Box + Artikel ordentlich in Reihen ausgelegt.

Alle Koordinaten sind Box-lokal: x Laenge, y Tiefe (-y vorn), z ab Tischplatte.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from itertools import combinations

import numpy as np
from mathutils import Matrix, Vector

from . import items as items_mod
from .geom import R, T

GAP_X = 0.007        # Mindestabstand nebeneinander
GAP_Y = 0.002        # Luft zwischen hintereinander stehenden Artikeln
MARGIN = 0.004       # Abstand zur Wand
WOOL_BELOW_RIM = 0.015


@dataclass
class Placement:
    spec: items_mod.ItemSpec
    matrix: Matrix            # Box-lokal, kanonischer Artikel -> Box
    kind: str                 # 'box' | 'cyl' | 'bottle'
    label_point: Vector       # ungefaehre Etikettmitte (fuer Fokus)
    top_z: float = 0.0


# ---------------------------------------------------------------------------
# 2D-Geometrie (Seitenansicht)
# ---------------------------------------------------------------------------
def _poly_item(yb, zb, d, h, lean_deg):
    a = math.radians(lean_deg)
    s, c = math.sin(a), math.cos(a)
    return [(yb, zb), (yb - d * c, zb + d * s), (yb - d * c + h * s, zb + d * s + h * c),
            (yb + h * s, zb + h * c)]


def _poly_circle(yc, zc, r, dz=0.0, n=14):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        z = zc + r * math.sin(a) + (dz / 2 if math.sin(a) >= 0 else -dz / 2)
        pts.append((yc + r * math.cos(a), z))
    return pts


def _axes(poly):
    out = []
    n = len(poly)
    for i in range(n):
        (y0, z0), (y1, z1) = poly[i], poly[(i + 1) % n]
        ey, ez = y1 - y0, z1 - z0
        ln = math.hypot(ey, ez)
        if ln > 1e-9:
            out.append((-ez / ln, ey / ln))
    return out


def _overlap(A, B, margin=0.0):
    """SAT fuer konvexe Polygone; True, wenn Abstand < margin."""
    for ax in _axes(A) + _axes(B):
        pa = [p[0] * ax[0] + p[1] * ax[1] for p in A]
        pb = [p[0] * ax[0] + p[1] * ax[1] for p in B]
        if min(pa) - max(pb) >= margin or min(pb) - max(pa) >= margin:
            return False
    return True


# ---------------------------------------------------------------------------
# Flaschen
# ---------------------------------------------------------------------------
def _fit_bottle(spec, L, H, z_wool, x_lo, x_hi):
    """Kleinster Neigungswinkel, mit dem die liegende Flasche zwischen x_lo..x_hi passt
    (der Hals darf oberhalb des Randes ueber die Wand ragen). Rueckgabe (theta, xa, za)."""
    prof = items_mod.bottle_profile(spec)
    ss = np.array([p[1] for p in prof])
    rr = np.array([p[0] for p in prof])
    r = spec.w / 2
    for theta_deg in np.arange(2.5, 62.0, 0.5):
        th = math.radians(theta_deg)
        c, s = math.cos(th), math.sin(th)
        za = max(H - 0.30 * r - (spec.h * 0.33) * s, 0.008 + r * c)
        xa = x_lo + MARGIN + r * s
        # zentrieren, falls Luft ist
        slack = (x_hi - MARGIN) - (xa + spec.h * c)
        if 0 < slack <= 0.05:
            xa += slack / 2
        elif slack > 0.05:
            xa += 0.004
        cx, cz = xa + ss * c, za + ss * s
        ok = True
        for sgn in (-1, 1):
            px, pz = cx - sgn * rr * s, cz + sgn * rr * c
            inside = (px <= x_hi - 0.003) & (px >= x_lo + 0.003) & (pz >= 0.004)
            above = pz >= H + 0.003
            if not np.all(inside | above):
                ok = False
                break
        if ok:
            return theta_deg, xa, za
    return None


def _bottle_matrix(spec, xa, yc, za, theta_deg, flip, label_angle_deg, t_floor):
    th = math.radians(theta_deg)
    u = Vector((math.cos(th) * (-1 if flip else 1), 0.0, math.sin(th)))
    b = math.radians(label_angle_deg)
    n0 = Vector((0.0, -math.sin(b), math.cos(b)))
    n = (n0 - n0.dot(u) * u).normalized()
    yv = -n
    xv = yv.cross(u)
    rot = Matrix((xv, yv, u)).transposed().to_4x4()
    return Matrix.Translation(Vector((xa, yc, za + t_floor))) @ rot


# ---------------------------------------------------------------------------
# Box packen
# ---------------------------------------------------------------------------
def _embed_base(h, z_wool, cls="stand", back_row=False):
    """Standhoehe: wie tief der Artikel in der Holzwolle steckt. Die hintere Reihe
    steht etwas hoeher (auf mehr Holzwolle), damit ihre Etiketten sichtbar bleiben."""
    embed = 0.012 if cls == "cyl" else min(max(0.22 * h, 0.012), 0.026 if back_row else 0.045)
    return max(z_wool - embed, 0.006)


def _lean_for(spec, rng):
    if spec.cls == "cyl":
        return float(rng.uniform(0.0, 3.0))
    if spec.cls == "flat":
        return float(rng.uniform(11.0, 16.0))
    return float(rng.uniform(5.0, 9.0))


def _oriented(spec, swapped):
    if swapped and spec.swap:
        return spec.h, spec.d, spec.w
    return spec.w, spec.d, spec.h


def _row_x(order, widths, cap_lo, cap_hi, rng, even=True):
    """Artikel einer Reihe in x verteilen. Rueckgabe Mittelpunkte oder None.
    even=False verteilt die Luft zufaellig (Reihen stehen dann versetzt)."""
    n = len(order)
    total = sum(widths[i] for i in order)
    free = (cap_hi - cap_lo) - total - GAP_X * (n - 1)
    if free < -1e-6:
        return None, -free
    if even:
        parts = np.array([0.8] + [1.0] * (n - 1) + [0.8])
    else:
        parts = rng.uniform(0.15, 1.0, n + 1)
    parts = parts / parts.sum() * free
    xs = {}
    x = cap_lo + parts[0]
    for k, i in enumerate(order):
        xs[i] = x + widths[i] / 2
        x += widths[i] + GAP_X + parts[k + 1]
    return xs, 0.0


def _outside_in(idx_sorted_by_height, rng):
    """Groesste nach aussen: abwechselnd links/rechts einsortieren."""
    left, right = [], []
    flip = rng.random() < 0.5
    for k, i in enumerate(idx_sorted_by_height):
        (left if (k % 2 == 0) != flip else right).append(i)
    return left + right[::-1]


# Etikettzone (Anteil der Artikelhoehe) je Packklasse - fuer die Sichtbarkeitsbewertung
LABEL_ZONE = {"stand": (0.28, 0.62), "flat": (0.30, 0.70), "cyl": (0.30, 0.68), "lying": (0.2, 0.8)}
VIEW_TAN = math.tan(math.radians(40.0))      # Blickwinkel der Hero-Kamera


def pack_box(specs, dims, rng, verbose=True):
    """Gibt (placements, info) zurueck. Mutiert spec.w/h, falls ein Artikel quer gestellt wird."""
    L, W, H, t = dims.L, dims.W, dims.H, dims.t
    z_wool = H - WOOL_BELOW_RIM
    placements = []
    warnings = []
    x_lo, x_hi = -L / 2, L / 2
    y_front_limit = -W / 2 + MARGIN

    lying = [s for s in specs if s.cls == "lying"]
    others = [s for s in specs if s.cls != "lying"]
    lying.sort(key=lambda s: -s.h)

    lane_obstacles = []       # (x0, x1, polygon)
    lane = None               # (x0, x1, y-Grenze, Oberkante z, y-Mitte)
    lane_seg = None
    pseudo = set()
    if lying:
        first = lying[0]
        flip = bool(rng.random() < 0.5)
        fit = _fit_bottle(first, L, H, z_wool, x_lo, x_hi)
        if fit is None:
            warnings.append(f"Flasche '{first.label}' passt nicht in die Box.")
            fit = (35.0, x_lo + 0.03, 0.05)
        th, xa, za = fit
        r = first.w / 2
        yc = -W / 2 + MARGIN + r + 0.002
        ext = first.h * math.cos(math.radians(th))
        bx0, bx1 = xa - r - 0.004, xa + ext + 0.004
        if flip:
            xa = -xa
            bx0, bx1 = -bx1, -bx0
        M = _bottle_matrix(first, xa, yc, za, th, flip, 22.0, t)
        placements.append(Placement(first, M, "bottle", M @ Vector((0, -r, first.h * 0.3)), za + t + r))
        dz = first.h * 0.6 * math.sin(math.radians(th))
        lane_obstacles.append((bx0, bx1, _poly_circle(yc, za + dz / 2, r, dz)))
        lane = (bx0, bx1, yc + r * 0.80, za + r + dz * 0.3, yc)
        # freies Stueck neben der Flasche (fuer kleine Artikel in der vorderen Reihe)
        seg = max([(x_lo, bx0), (bx1, x_hi)], key=lambda a: a[1] - a[0])
        lane_seg = seg if seg[1] - seg[0] > 0.05 else None
        # weitere liegende Flaschen: wie normale Artikel, quer liegend
        for s in lying[1:]:
            pseudo.add(id(s))
            others.append(s)

    n = len(others)
    info = {"z_wool": z_wool + t, "warnings": warnings}
    if n == 0:
        return placements, info

    def disp_dims(s, swapped):
        if id(s) in pseudo:
            return s.h, s.w, s.w
        return _oriented(s, swapped)

    leans = [0.0 if id(s) in pseudo else _lean_for(s, rng) for s in others]
    yaws = [float(rng.uniform(-14, 14)) if s.cls == "cyl" else float(rng.uniform(-4.0, 4.0))
            for s in others]
    rolls = [0.0 if s.cls == "cyl" else float(rng.uniform(-1.3, 1.3)) for s in others]
    order_h = sorted(range(n), key=lambda i: -disp_dims(others[i], False)[2])
    back_wall = [(W / 2, -0.05), (W / 2, H), (W / 2 + 0.02, H), (W / 2 + 0.02, -0.05)]
    can_flip = [s.swap and id(s) not in pseudo for s in others]

    def front_limit(x0, x1):
        if lane is not None and x0 < lane[1] and x1 > lane[0]:
            return lane[2]
        return y_front_limit

    def evaluate(rows, row_rng, seg_last, flats_landscape, order_variant):
        swapped = {i: bool(flats_landscape and can_flip[i] and others[i].cls == "flat"
                           and others[i].h > others[i].w) for i in range(n)}
        initial = dict(swapped)
        layout = {}
        placed = []           # (x0, x1, poly)
        over_x = 0.0
        over_y = 0.0

        def eff_w(i):
            w_, d_, h_ = disp_dims(others[i], swapped[i])
            if others[i].cls == "cyl":
                return w_
            yaw = math.radians(abs(yaws[i]))
            return w_ * math.cos(yaw) + d_ * math.sin(yaw) + h_ * math.sin(math.radians(1.5))

        for ri, row in enumerate(rows):
            in_seg = seg_last and ri == len(rows) - 1 and lane_seg is not None
            c_lo, c_hi = (lane_seg if in_seg else (x_lo, x_hi))
            c_lo, c_hi = c_lo + MARGIN, c_hi - MARGIN
            toggled = set()
            for _ in range(len(row) + 1):     # zu breit? -> Artikel hochkant drehen
                widths = {i: eff_w(i) for i in row}
                need = sum(widths.values()) + GAP_X * (len(row) - 1) - (c_hi - c_lo)
                if need <= 0:
                    break
                cands = [i for i in row if can_flip[i] and i not in toggled
                         and disp_dims(others[i], swapped[i])[0] > disp_dims(others[i], swapped[i])[2]]
                if not cands:
                    break
                j = max(cands, key=lambda i: disp_dims(others[i], swapped[i])[0]
                        - disp_dims(others[i], swapped[i])[2])
                swapped[j] = not swapped[j]
                toggled.add(j)
            widths = {i: eff_w(i) for i in row}
            hs = sorted(row, key=lambda i: -disp_dims(others[i], swapped[i])[2])
            if order_variant == 0:
                order = _outside_in(hs, row_rng)
            else:
                order = [row[k] for k in row_rng.permutation(len(row))]
            xs, ox = _row_x(order, widths, c_lo, c_hi, row_rng, even=order_variant < 2)
            if xs is None:
                over_x += ox
                xs = {}
                step = (c_hi - c_lo) / len(order)
                for k, i in enumerate(order):
                    xs[i] = c_lo + step * (k + 0.5)
            for i in order:
                s = others[i]
                w_, d_, h_ = disp_dims(s, swapped[i])
                lean = leans[i] + (2.5 if ri == 0 and s.cls != "cyl" else 0.0)
                if id(s) in pseudo:
                    zb = max(z_wool - 0.30 * w_, 0.006)
                    poly0 = _poly_circle(-d_ / 2, zb + d_ / 2, d_ / 2)
                else:
                    zb = _embed_base(h_, z_wool, s.cls, back_row=(ri == 0 and len(rows) > 1))
                    d_eff = d_ + (0 if s.cls == "cyl" else w_ * math.sin(math.radians(abs(yaws[i]))))
                    poly0 = _poly_item(0.0, zb, d_eff, h_, lean)
                x0, x1 = xs[i] - widths[i] / 2 - 0.002, xs[i] + widths[i] / 2 + 0.002
                obst = [back_wall] + [p_ for (a, b, p_) in placed if a < x1 and b > x0]

                def free(yb):
                    poly = [(py + yb, pz) for py, pz in poly0]
                    return not any(_overlap(poly, o, GAP_Y) for o in obst)
                hi, lo = W / 2 + 0.01, -W / 2 - 0.25
                if free(hi):
                    yb = hi
                else:
                    for _ in range(15):       # groesstes yb ohne Kollision
                        mid = (hi + lo) / 2
                        if free(mid):
                            lo = mid
                        else:
                            hi = mid
                    yb = lo
                poly = [(py + yb, pz) for py, pz in poly0]
                front = min(p_[0] for p_ in poly)
                lim = front_limit(x0, x1)
                pen = lim - front
                for (a, b, lp_) in lane_obstacles:
                    if a < x1 and b > x0 and _overlap(poly, lp_, 0.001):
                        pen = max(pen, 0.004)
                if pen > 0:
                    over_y = max(over_y, pen)
                placed.append((x0, x1, poly))
                layout[i] = dict(x=xs[i], yb=yb, zb=zb, lean=lean, swapped=swapped[i], row=ri,
                                 dims=(w_, d_, h_), front=front, slack=front - lim,
                                 x0=x0, x1=x1, top=max(p_[1] for p_ in poly))
        # ---------------- Bewertung ----------------
        score = over_x * 4000 + over_y * 4000
        for i in range(n):                    # Etiketten sollen sichtbar bleiben
            b_ = layout[i]
            s = others[i]
            lo_f, hi_f = LABEL_ZONE.get("lying" if id(s) in pseudo else s.cls, (0.3, 0.7))
            l_lo, l_hi = b_["zb"] + lo_f * b_["dims"][2], b_["zb"] + hi_f * b_["dims"][2]
            wb = b_["x1"] - b_["x0"]
            for j in range(n):
                f_ = layout[j]
                if j == i or f_["row"] <= b_["row"]:
                    continue
                ov = min(b_["x1"], f_["x1"]) - max(b_["x0"], f_["x0"])
                if ov <= 0:
                    continue
                dy = max(0.0, (b_["front"]) - f_["yb"]) + 0.5 * f_["dims"][1]
                occ = f_["top"] - VIEW_TAN * dy
                hidden = min(1.0, max(0.0, (occ - l_lo) / (l_hi - l_lo)))
                cover = hidden * min(1.0, ov / wb)
                score += cover * 2.2 + (3.0 if cover > 0.7 else 0.0)
            if lane is not None and b_["x0"] < lane[1] and b_["x1"] > lane[0]:
                ov = min(b_["x1"], lane[1]) - max(b_["x0"], lane[0])
                dy = max(0.0, b_["front"] - lane[4])
                occ = lane[3] - VIEW_TAN * dy
                hidden = min(1.0, max(0.0, (occ - l_lo) / (l_hi - l_lo)))
                score += hidden * min(1.0, ov / wb) * 1.2
        fills = [sum(layout[i]["dims"][0] for i in row) / L for row in rows]
        score += sum(max(0.0, 0.40 - f) for f in fills) * 2.0
        score += (max(fills) - min(fills)) * 0.6
        score += sum(0.35 for i in layout if layout[i]["swapped"] != initial[i])
        score += sum(0.5 for i in layout if layout[i]["swapped"] and others[i].cls != "flat")
        slack = min(layout[i]["slack"] for i in layout)
        score += max(0.0, slack - 0.03) * 6.0
        return score, layout, (over_x, over_y)

    # Kandidaten: zusammenhaengende Aufteilungen der hoehensortierten Liste in 1-3 Reihen,
    # jeweils mit ein paar Reihenfolgen und (fuer flache Artikel) Hoch-/Querformat
    best = None
    seed_eval = int(rng.integers(1 << 30))
    has_flats = any(can_flip[i] and others[i].cls == "flat" and others[i].h > others[i].w
                    for i in range(n))
    # zweite Sortierung: drehbare Artikel nach ihrer Hochkant-Hoehe einordnen
    order_alt = sorted(range(n), key=lambda i: -(max(others[i].w, others[i].h) if can_flip[i]
                                                 else disp_dims(others[i], False)[2]))
    orderings = [order_h] + ([order_alt] if order_alt != order_h else [])
    for order_ in orderings:
        for k in range(1, min(3, n) + 1):
            for cuts in combinations(range(1, n), k - 1):
                b = [0, *cuts, n]
                rows = [order_[b[i]:b[i + 1]] for i in range(k)]
                for seg_last in ((False, True) if lane_seg is not None else (False,)):
                    for fl in ((False, True) if has_flats else (False,)):
                        for ov_ in range(8):
                            sc, lay, ov = evaluate(rows, np.random.default_rng(seed_eval + ov_),
                                                   seg_last, fl, ov_)
                            if best is None or sc < best[0] - 1e-9:
                                best = (sc, lay, ov, rows)
    sc, lay, (ox, oy), rows = best
    if ox > 1e-4 or oy > 6e-3:
        warnings.append(f"Box ist zu voll (Ueberstand x {ox * 100:.1f} cm, y {oy * 100:.1f} cm) - "
                        "Artikel koennen sich beruehren. Groessere Box oder weniger Artikel waehlen.")

    # etwas Luft nach vorn verteilen (Reihen nicht alle an die Rueckwand pressen)
    slack = min(v["slack"] for v in lay.values())
    n_rows = len(rows)
    for i, v in lay.items():
        s = others[i]
        shift = 0.0
        if slack > 0.004:
            shift = slack * (0.25 + 0.75 * v["row"] / max(1, n_rows - 1)) * (0.75 if n_rows > 1 else 0.45)
        yb = v["yb"] - shift
        if v["slack"] < 0:          # ueberfuellt: lieber Artikel aneinander als durch die Wand
            yb += -v["slack"]
        if id(s) in pseudo:
            r = s.w / 2
            flip = bool(rng.random() < 0.5)
            xa = v["x"] - (s.h / 2) * (-1 if flip else 1)
            M = _bottle_matrix(s, xa, yb - r, v["zb"] + r, 1.5, flip, 30.0, t)
            placements.append(Placement(s, M, "bottle", M @ Vector((0, -r, s.h * 0.3)),
                                        v["zb"] + t + 2 * r))
            continue
        if v["swapped"]:
            s.w, s.h = s.h, s.w
        M = (T(v["x"], yb, v["zb"] + t) @ R("Z", yaws[i]) @ R("X", -v["lean"]) @ R("Y", rolls[i])
             @ T(0, -s.d / 2, 0))
        kind = "cyl" if s.is_round else "box"
        lp = M @ Vector((0, -s.d / 2, s.h * 0.45))
        placements.append(Placement(s, M, kind, lp, v["zb"] + t + s.h))
    if verbose:
        for wmsg in warnings:
            print("[dk] Warnung:", wmsg)
    info["rows"] = rows
    return placements, info


# ---------------------------------------------------------------------------
# Flatlay (Knolling)
# ---------------------------------------------------------------------------
def knoll(specs, box_wh, rng, gap=0.028):
    """Ordnet Box (Grundflaeche box_wh) und liegende Artikel in zentrierten Reihen an.
    Rueckgabe: (box_xy, [(spec, x, y, yaw)], (breite, hoehe) der Gesamtflaeche)."""
    rects = [("box", box_wh[0], box_wh[1], None)]
    for s in specs:
        rects.append(("item", s.w, s.h, s))
    items_sorted = [rects[0]] + sorted(rects[1:], key=lambda r: (-r[2], -r[1]))
    total_w = sum(r[1] for r in items_sorted) + gap * (len(items_sorted) - 1)
    min_w = max(r[1] for r in items_sorted)
    best = None
    for Wt in np.linspace(min_w, total_w, 60):
        rows, cur, cw = [], [], 0.0
        for r in items_sorted:
            need = r[1] + (gap if cur else 0.0)
            if cur and cw + need > Wt + 1e-9:
                rows.append(cur)
                cur, cw = [], 0.0
                need = r[1]
            cur.append(r)
            cw += need
        if cur:
            rows.append(cur)
        bw = max(sum(r[1] for r in row) + gap * (len(row) - 1) for row in rows)
        bh = sum(max(r[2] for r in row) for row in rows) + gap * (len(rows) - 1)
        # quadratisches Bild: groesste Kante minimieren, einzelne Waisen-Reihen vermeiden
        widths = [sum(r[1] for r in row) + gap * (len(row) - 1) for row in rows]
        ragged = (max(widths) - min(widths)) / max(widths)
        cost = max(bw, bh) * (1.0 + 0.10 * ragged) + 0.12 * abs(bw - bh)
        if best is None or cost < best[0] - 1e-9:
            best = (cost, rows, bw, bh)
    _, rows, bw, bh = best
    out = []
    box_xy = (0.0, 0.0)
    y = bh / 2
    for row in rows:
        rh = max(r[2] for r in row)
        rw = sum(r[1] for r in row) + gap * (len(row) - 1)
        # Reihe im Blocksatz auf volle Breite ziehen, wenn sie nicht viel schmaler ist
        g = gap
        if len(row) > 1 and rw > 0.72 * bw:
            g = gap + (bw - rw) / (len(row) - 1)
            rw = bw
        x = -rw / 2
        yc = y - rh / 2
        for kind, w_, h_, s in row:
            cx = x + w_ / 2
            if kind == "box":
                box_xy = (cx, yc)
            else:
                out.append((s, cx + float(rng.uniform(-0.002, 0.002)),
                            yc + float(rng.uniform(-0.002, 0.002)), float(rng.uniform(-1.6, 1.6))))
            x += w_ + g
        y -= rh + gap
    return box_xy, out, (bw, bh)
