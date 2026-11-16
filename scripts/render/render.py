#!/usr/bin/env python3
"""Dankeskiste - Produktfoto-Renderpipeline (Blender/Cycles als Python-Modul `bpy`).

Aufruf:
  python3 scripts/render/render.py --boxes scripts/render/boxes.json --out renders \
      [--only slug1,slug2] [--shots hero,flatlay,geschlossen] [--samples N] \
      [--scale 0.25] [--seed-offset k] [--grade] [--surface leinen|holz] [--threads N]

Pro Box entstehen <slug>-hero.png, <slug>-flatlay.png, <slug>-geschlossen.png.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

ALL_SHOTS = ("hero", "flatlay", "geschlossen")


def _specs(box, seed):
    from dk import items
    return [items.make_spec(raw, i, seed) for i, raw in enumerate(box.get("items", []))
            if isinstance(raw, dict)]


def _corners(matrix, w, d, h):
    from mathutils import Vector
    pts = []
    for sx in (-0.5, 0.5):
        for sy in (-0.5, 0.5):
            for z in (0.0, h):
                pts.append(matrix @ Vector((sx * w, sy * d, z)))
    return pts


def shot_hero(box, seed, args):
    """Geoeffnete Box schraeg von oben, Artikel in Holzwolle, Deckel und Karte daneben."""
    from mathutils import Vector
    from dk import box as boxm, config, geom, items, layout, scene as S, woodwool
    from dk.geom import R, T
    shot = dict(config.SHOTS["hero"])
    sc = S.reset_scene()
    S.build_ground(args.surface)
    d = boxm.dims_for(box.get("size", "mittel"))
    rng = np.random.default_rng([seed, 1])
    specs = _specs(box, seed)
    placements, info = layout.pack_box(specs, d, rng)

    root = geom.empty("set")
    geom.parent(boxm.build_base(d, rng), root)
    for pl in placements:
        ob = items.build_item(pl.spec, np.random.default_rng(pl.spec.seed))
        geom.parent(ob, root, pl.matrix)
    for ob in woodwool.build_wool(d, placements, info["z_wool"], rng):
        geom.parent(ob, root)
    ox, oy, _ = d.outer
    loose = woodwool.build_loose(rng, (-ox / 2, -oy / 2, ox / 2, oy / 2), n=6)
    if loose:
        geom.parent(loose, root)
    yaw = shot["box_yaw"] + float(rng.uniform(-1.5, 1.5))
    root.matrix_world = R("Z", yaw)

    # Deckel liegt rechts hinten, angeschnitten; Sticker sichtbar
    Lo, Wo = d.lid_outer
    lid = boxm.build_lid(d, rng)
    boxm.add_sticker(lid, d, (0.20 * Lo, 0.04 * Wo), rng)
    lid.matrix_world = (T(ox * 0.60, oy * 0.74 + 0.02, d.lid_h) @ R("Z", -13.0 + float(rng.uniform(-3, 3))))
    # Grusskarte vorn links
    card, (cw, ch, _) = boxm.build_card("karte", "Danke", seed=int(rng.integers(1e6)))
    card.matrix_world = (T(-ox * 0.36, -oy * 0.5 - ch * 0.66, 0.0004)
                         @ R("Z", 16.0 + float(rng.uniform(-4, 4))))

    import bpy
    bpy.context.view_layer.update()
    mw = root.matrix_world
    fit = _corners(mw @ T(0, 0, 0), ox, oy, d.H + d.t)
    for pl in placements:
        s = pl.spec
        fit += _corners(mw @ pl.matrix, s.w, s.d, s.h)
    # Karte teilweise mit ins Bild nehmen
    fit += [card.matrix_world @ Vector((sx * cw / 2, sy * ch / 2, 0.0)) for sx in (-1, 1) for sy in (-1, 1)]
    # Fokus: Etiketten der vorderen Artikel
    lps = sorted([mw @ pl.label_point for pl in placements], key=lambda p: p.y)
    k = max(1, len(lps) // 2)
    focus = sum(lps[:k], Vector()) / k if lps else Vector((0, 0, d.H))
    S.build_lights(sc, (0.0, 0.0, d.H * 0.6))
    S.build_camera(sc, shot, fit, focus)
    return sc, shot


def shot_flatlay(box, seed, args):
    """Senkrecht von oben: geschlossene Box + alle Artikel ordentlich ausgelegt (Knolling)."""
    from mathutils import Vector
    from dk import box as boxm, config, geom, items, layout, scene as S, woodwool
    from dk.geom import R, T
    shot = dict(config.SHOTS["flatlay"])
    sc = S.reset_scene()
    S.build_ground(args.surface)
    d = boxm.dims_for(box.get("size", "mittel"))
    rng = np.random.default_rng([seed, 2])
    specs = _specs(box, seed)
    Lo, Wo = d.lid_outer
    box_xy, placed, (bw, bh) = layout.knoll(specs, (Lo, Wo), rng)
    closed = boxm.build_closed(d, box.get("ribbon", "oliv"), np.random.default_rng([seed, 99]))
    closed.matrix_world = T(box_xy[0], box_xy[1], 0) @ R("Z", float(rng.uniform(-0.8, 0.8)))
    zs = [d.closed_h]
    for s, x, y, yaw in placed:
        ob = items.build_item(s, np.random.default_rng(s.seed))
        ob.matrix_world = items.lying_matrix(s, x, y, yaw)
        zs.append(s.d)
    fit = [Vector((sx * bw / 2, sy * bh / 2, 0.0)) for sx in (-1, 1) for sy in (-1, 1)]
    fit += [Vector((box_xy[0] + sx * Lo / 2, box_xy[1] + sy * Wo / 2, d.closed_h))
            for sx in (-1, 1) for sy in (-1, 1)]
    S.build_lights(sc, (0.0, 0.0, 0.05))
    S.build_camera(sc, shot, fit, (0.0, 0.0, float(np.median(zs)) * 0.8))
    return sc, shot


def shot_geschlossen(box, seed, args):
    """Geschlossene Box mit Logo-Sticker, Band, Schleife und Karte, leicht schraeg."""
    from mathutils import Vector
    from dk import box as boxm, config, geom, scene as S, woodwool
    from dk.geom import R, T
    shot = dict(config.SHOTS["geschlossen"])
    sc = S.reset_scene()
    S.build_ground(args.surface)
    d = boxm.dims_for(box.get("size", "mittel"))
    rng = np.random.default_rng([seed, 3])
    closed = boxm.build_closed(d, box.get("ribbon", "oliv"), np.random.default_rng([seed, 99]))
    closed.matrix_world = R("Z", shot["box_yaw"] + float(rng.uniform(-2, 2)))
    Lo, Wo = d.lid_outer
    loose = woodwool.build_loose(rng, (-Lo / 2, -Wo / 2, Lo / 2, Wo / 2), n=3)
    if loose:
        geom.parent(loose, closed)
    import bpy
    bpy.context.view_layer.update()
    fit = _corners(closed.matrix_world, Lo, Wo, d.closed_h + 0.03)
    focus = closed.matrix_world @ Vector((-0.1 * Lo, -0.2 * Wo, d.closed_h))
    S.build_lights(sc, (0.0, 0.0, d.closed_h * 0.6))
    S.build_camera(sc, shot, fit, focus)
    return sc, shot


SHOT_FUNCS = {"hero": shot_hero, "flatlay": shot_flatlay, "geschlossen": shot_geschlossen}


def main(argv=None):
    ap = argparse.ArgumentParser(description="Dankeskiste Produktfotos rendern")
    ap.add_argument("--boxes", required=True, help="Pfad zur boxes.json")
    ap.add_argument("--out", default="renders", help="Ausgabeverzeichnis")
    ap.add_argument("--only", default="", help="nur diese Slugs (kommagetrennt)")
    ap.add_argument("--shots", default=",".join(ALL_SHOTS), help="hero,flatlay,geschlossen")
    ap.add_argument("--samples", type=int, default=None, help="Cycles-Samples (Standard: config.RENDER)")
    ap.add_argument("--scale", type=float, default=1.0, help="Aufloesungsfaktor, z. B. 0.25 fuer Previews")
    ap.add_argument("--seed-offset", type=int, default=0, help="verschiebt alle Seeds (andere Variante)")
    ap.add_argument("--grade", action="store_true", help="Vignette + feine Koernung einrechnen")
    ap.add_argument("--surface", default="leinen", choices=("leinen", "holz"), help="Untergrund")
    ap.add_argument("--threads", type=int, default=None, help="CPU-Threads (Standard 4)")
    ap.add_argument("--exposure", type=float, default=None, help="Belichtungskorrektur in Blenden")
    args = ap.parse_args(argv)

    with open(args.boxes, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    boxes = data.get("boxes", data if isinstance(data, list) else [])
    only = {s.strip() for s in args.only.split(",") if s.strip()}
    shots = [s.strip() for s in args.shots.split(",") if s.strip()]
    bad = [s for s in shots if s not in SHOT_FUNCS]
    if bad:
        ap.error(f"unbekannte Aufnahme(n): {bad} - erlaubt: {', '.join(ALL_SHOTS)}")
    if only:
        missing = only - {b.get("slug") for b in boxes}
        if missing:
            print(f"[dk] Warnung: Slug(s) nicht in {args.boxes}: {sorted(missing)}")
    os.makedirs(args.out, exist_ok=True)

    from dk import grade, scene as S
    t_all = time.time()
    done = []
    for bi, box in enumerate(boxes):
        slug = box.get("slug") or f"box-{bi + 1}"
        if only and slug not in only:
            continue
        seed = int(box.get("seed", bi + 1)) + args.seed_offset
        for shot_name in shots:
            t0 = time.time()
            sc, shot = SHOT_FUNCS[shot_name](box, seed, args)
            S.setup_render(sc, shot["res"], args.scale, args.samples, args.threads, args.exposure)
            path = os.path.abspath(os.path.join(args.out, f"{slug}-{shot_name}.png"))
            t1 = time.time()
            S.render_to(sc, path)
            if args.grade:
                grade.apply(path, seed=seed)
            dt = time.time() - t0
            print(f"[dk] {slug}-{shot_name}.png  Aufbau {t1 - t0:.1f}s  Render {time.time() - t1:.1f}s"
                  f"  gesamt {dt:.1f}s", flush=True)
            done.append((path, dt))
    print(f"[dk] fertig: {len(done)} Bild(er) in {time.time() - t_all:.1f}s -> {os.path.abspath(args.out)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
