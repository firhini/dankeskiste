"""Prozedurale PBR-Materialien (Cycles, Principled BSDF).

Alle Materialien sind matt bis seidenmatt gehalten - keine harten Glanzlichter.
Materialien werden pro Szene gecacht (reset() beim Szenenaufbau aufrufen).
"""
from __future__ import annotations

import atexit
import math
import os
import shutil
import tempfile
import warnings

import bpy
import numpy as np

from .config import hex_to_srgb, srgb_to_linear, tone_linear

_CACHE: dict = {}
_TEX_COUNT = 0


def reset():
    _CACHE.clear()


def _lin(hexstr):
    return srgb_to_linear(hex_to_srgb(hexstr))


def _rgba(c, a=1.0):
    return (c[0], c[1], c[2], a)


def _scale(c, f):
    return tuple(min(1.0, v * f) for v in c[:3])


# ---------------------------------------------------------------------------
# Node-Helfer
# ---------------------------------------------------------------------------
def _new(name):
    m = bpy.data.materials.new(name)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            m.use_nodes = True
        except Exception:
            pass
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return m, nt, bsdf, out


def _set(nt, sock, val):
    if isinstance(val, bpy.types.NodeSocket):
        nt.links.new(val, sock)
    elif val is not None:
        if hasattr(sock, "default_value"):
            try:
                sock.default_value = val
            except Exception:
                if isinstance(val, (tuple, list)) and len(val) == 3:
                    sock.default_value = (*val, 1.0)
                else:
                    raise


def N(nt, typ, ins=None, **attrs):
    node = nt.nodes.new(typ)
    for k, v in attrs.items():
        setattr(node, k, v)
    for k, v in (ins or {}).items():
        _set(nt, node.inputs[k], v)
    return node


def P(nt, bsdf, **ins):
    """Principled-Eingaenge setzen (Unterstriche = Leerzeichen)."""
    for k, v in ins.items():
        _set(nt, bsdf.inputs[k.replace("_", " ")], v)


def mix(nt, fac, a, b, blend="MIX"):
    n = nt.nodes.new("ShaderNodeMix")
    n.data_type = "RGBA"
    n.blend_type = blend
    _set(nt, n.inputs[0], fac)
    for idx, v in ((6, a), (7, b)):
        if isinstance(v, (tuple, list)) and len(v) == 3:
            v = (*v, 1.0)
        _set(nt, n.inputs[idx], v)
    return n.outputs[2]


def math_(nt, op, a, b=None, c=None, clamp=False):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    _set(nt, n.inputs[0], a)
    if b is not None:
        _set(nt, n.inputs[1], b)
    if c is not None:
        _set(nt, n.inputs[2], c)
    return n.outputs[0]


def coords(nt, kind="Object", scale=(1, 1, 1), rot=(0, 0, 0), loc=(0, 0, 0)):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tc.outputs[kind], mp.inputs["Vector"])
    mp.inputs["Scale"].default_value = scale
    mp.inputs["Rotation"].default_value = rot
    mp.inputs["Location"].default_value = loc
    return mp.outputs["Vector"]


def noise(nt, vec, scale, detail=2.0, rough=0.5, distortion=0.0):
    n = N(nt, "ShaderNodeTexNoise", {"Vector": vec, "Scale": scale, "Detail": detail,
                                     "Roughness": rough, "Distortion": distortion})
    return n.outputs["Factor"]


def bump(nt, height, strength=0.2, distance=0.001, normal=None):
    n = N(nt, "ShaderNodeBump", {"Height": height, "Strength": strength, "Distance": distance})
    if normal is not None:
        nt.links.new(normal, n.inputs["Normal"])
    return n.outputs["Normal"]


def _wave_scale(period):
    """Wave-Textur (Bands): Periode in Objekt-Einheiten -> Scale (sin(20*scale*x))."""
    return 2 * math.pi / 20.0 / period


def _cached(key, builder):
    if key not in _CACHE:
        _CACHE[key] = builder()
    return _CACHE[key]


_TEX_DIR = None


def _tex_dir():
    global _TEX_DIR
    if _TEX_DIR is None or not os.path.isdir(_TEX_DIR):
        _TEX_DIR = tempfile.mkdtemp(prefix="dankeskiste_tex_")
        atexit.register(shutil.rmtree, _TEX_DIR, True)
    return _TEX_DIR


def image_from_pil(pil_img, name):
    """PIL-Bild -> bpy-Image (sRGB). Geht ueber eine temporaere PNG-Datei, weil
    Cycles im bpy-Modul generierte, nur im Speicher liegende Bilder nicht zuverlaessig sieht."""
    global _TEX_COUNT
    _TEX_COUNT += 1
    path = os.path.join(_tex_dir(), f"{_TEX_COUNT:04d}_{name}.png")
    pil_img.convert("RGB").save(path, compress_level=1)
    bimg = bpy.data.images.load(path)
    bimg.name = f"{name}_{_TEX_COUNT}"
    bimg.colorspace_settings.name = "sRGB"
    return bimg


# ---------------------------------------------------------------------------
# Karton / Papier
# ---------------------------------------------------------------------------
KRAFT_LIGHT = "#A5855A"
KRAFT_DARK = "#8C6E47"


def kraft_board(inner=False):
    """Brauner Kraftkarton: Faserstruktur, wolkige Farbschwankung, ganz leichtes
    Durchzeichnen der Welle (Washboarding), aufgehellte Kanten (Abrieb)."""
    def build():
        m, nt, bsdf, _ = _new("dk_kraft_inner" if inner else "dk_kraft")
        v = coords(nt, "Object")
        cloud = noise(nt, v, 9.0, 4.0, 0.55)
        fibre_v = coords(nt, "Object", scale=(60.0, 1400.0, 600.0))
        fibre = noise(nt, fibre_v, 1.0, 3.0, 0.6)
        speck = noise(nt, v, 900.0, 1.0, 0.5)
        f = math_(nt, "ADD", math_(nt, "MULTIPLY", cloud, 0.6), math_(nt, "MULTIPLY", fibre, 0.4))
        ramp = N(nt, "ShaderNodeMapRange", {"Value": f, "From Min": 0.32, "From Max": 0.68})
        dark, light = _lin(KRAFT_DARK), _lin(KRAFT_LIGHT)
        if inner:
            dark, light = _scale(dark, 0.94), _scale(light, 0.95)
        col = mix(nt, ramp.outputs[0], dark, light)
        # helle/dunkle Fasersprenkel
        sp = N(nt, "ShaderNodeMapRange", {"Value": speck, "From Min": 0.62, "From Max": 0.8})
        col = mix(nt, math_(nt, "MULTIPLY", sp.outputs[0], 0.18), col, _scale(light, 1.25))
        # Kantenabrieb: konvexe Kanten leicht aufhellen (AO "inside")
        ao = N(nt, "ShaderNodeAmbientOcclusion", {"Distance": 0.0022}, inside=True, samples=3,
               only_local=True)
        edge = N(nt, "ShaderNodeMapRange", {"Value": ao.outputs["AO"], "From Min": 0.97,
                                            "From Max": 0.55})
        wear_n = noise(nt, v, 260.0, 2.0, 0.6)
        wear = math_(nt, "MULTIPLY", edge.outputs[0],
                     N(nt, "ShaderNodeMapRange", {"Value": wear_n, "From Min": 0.35,
                                                  "From Max": 0.7}).outputs[0])
        col = mix(nt, math_(nt, "MULTIPLY", wear, 0.5), col, _lin("#DCC29A"))
        # Bump: Fasern + Washboarding (Wellen laufen entlang lokaler Y-Achse)
        wave_v = coords(nt, "Object", scale=(1.0, 0.0, 0.0))
        wave = N(nt, "ShaderNodeTexWave", {"Vector": wave_v, "Scale": _wave_scale(0.0062),
                                           "Distortion": 0.4, "Detail": 0.0},
                 wave_type="BANDS", bands_direction="X", wave_profile="SIN").outputs["Factor"]
        h = math_(nt, "ADD", math_(nt, "MULTIPLY", fibre, 0.55), math_(nt, "MULTIPLY", speck, 0.25))
        nrm = bump(nt, h, 0.32, 0.00012)
        nrm = bump(nt, wave, 0.10, 0.00035, nrm)
        rough = N(nt, "ShaderNodeMapRange", {"Value": cloud, "To Min": 0.78, "To Max": 0.9})
        P(nt, bsdf, Base_Color=col, Roughness=rough.outputs[0], Normal=nrm,
          Specular_IOR_Level=0.25, Sheen_Weight=0.08, Sheen_Roughness=0.6)
        return m
    return _cached(("kraft", inner), build)


def corrugated_edge():
    """Schnittkante der Wellpappe: zwei Deckbahnen + sichtbare Welle.
    UV: u = Laenge entlang der Kante in Metern, v = 0..1 ueber die Materialstaerke."""
    def build():
        m, nt, bsdf, _ = _new("dk_wellpappe_kante")
        uv = N(nt, "ShaderNodeUVMap").outputs["UV"]
        sep = N(nt, "ShaderNodeSeparateXYZ", {"Vector": uv})
        u, v = sep.outputs["X"], sep.outputs["Y"]
        pitch = 0.0052
        jitter = noise(nt, N(nt, "ShaderNodeCombineXYZ", {"X": u, "Y": 0.0, "Z": 0.0}).outputs[0],
                       140.0, 1.0)
        phase = math_(nt, "ADD", math_(nt, "MULTIPLY", u, 2 * math.pi / pitch),
                      math_(nt, "MULTIPLY", jitter, 1.6))
        w = math_(nt, "ADD", math_(nt, "MULTIPLY", math_(nt, "SINE", phase), 0.31), 0.5)
        dist = math_(nt, "ABSOLUTE", math_(nt, "SUBTRACT", v, w))
        flute = N(nt, "ShaderNodeMapRange", {"Value": dist, "From Min": 0.10, "From Max": 0.17,
                                             "To Min": 1.0, "To Max": 0.0}).outputs[0]
        centre = math_(nt, "ABSOLUTE", math_(nt, "SUBTRACT", v, 0.5))
        liner = N(nt, "ShaderNodeMapRange", {"Value": centre, "From Min": 0.34, "From Max": 0.39}
                  ).outputs[0]
        paper = math_(nt, "MAXIMUM", flute, liner)
        col = mix(nt, paper, _lin("#3E2C1B"), _lin("#C7A478"))
        nrm = bump(nt, paper, 0.6, 0.0004)
        P(nt, bsdf, Base_Color=col, Roughness=0.88, Normal=nrm, Specular_IOR_Level=0.2)
        return m
    return _cached("edge", build)


def paper(tone="creme", rough=0.72, texture=1.0, sheen=0.0, name=None):
    """Mattes Verpackungspapier/-karton in einem Paletten- oder Naturton."""
    def build():
        m, nt, bsdf, _ = _new(name or f"dk_papier_{tone}")
        base = tone_linear(tone)
        v = coords(nt, "Object")
        cloud = noise(nt, v, 14.0, 3.0, 0.55)
        fine = noise(nt, v, 1400.0, 2.0, 0.6)
        col = mix(nt, cloud, _scale(base, 0.93), _scale(base, 1.05))
        nrm = bump(nt, fine, 0.12 * texture, 0.00008)
        P(nt, bsdf, Base_Color=col, Roughness=rough, Normal=nrm, Specular_IOR_Level=0.3,
          Sheen_Weight=sheen)
        return m
    return _cached(("paper", tone, rough, texture, sheen), build)


def crinkle_paper(tone="kraft", rough=0.7, strength=1.0):
    """Papier fuer Beutel: zusaetzlich weiche Knitter (nur als Bump)."""
    def build():
        m, nt, bsdf, _ = _new(f"dk_beutel_{tone}")
        base = tone_linear(tone)
        v = coords(nt, "Object")
        cloud = noise(nt, v, 10.0, 3.0, 0.55)
        fine = noise(nt, v, 1200.0, 2.0, 0.6)
        vor = N(nt, "ShaderNodeTexVoronoi", {"Vector": v, "Scale": 26.0, "Randomness": 1.0},
                feature="DISTANCE_TO_EDGE").outputs["Distance"]
        crease = N(nt, "ShaderNodeMapRange", {"Value": vor, "From Min": 0.0, "From Max": 0.12}
                   ).outputs[0]
        soft = noise(nt, v, 38.0, 2.0, 0.5, 0.6)
        col = mix(nt, cloud, _scale(base, 0.92), _scale(base, 1.05))
        nrm = bump(nt, fine, 0.10, 0.00008)
        nrm = bump(nt, soft, 0.30 * strength, 0.0012, nrm)
        nrm = bump(nt, crease, 0.10 * strength, 0.0005, nrm)
        P(nt, bsdf, Base_Color=col, Roughness=rough, Normal=nrm, Specular_IOR_Level=0.3)
        return m
    return _cached(("crinkle", tone, rough, strength), build)


def label_paper(bimg, rough=0.66):
    m, nt, bsdf, _ = _new("dk_etikett_" + bimg.name)
    tex = N(nt, "ShaderNodeTexImage", image=bimg, interpolation="Cubic", extension="EXTEND")
    v = coords(nt, "Object")
    fine = noise(nt, v, 1600.0, 2.0, 0.6)
    nrm = bump(nt, fine, 0.08, 0.00006)
    P(nt, bsdf, Base_Color=tex.outputs["Color"], Roughness=rough, Normal=nrm,
      Specular_IOR_Level=0.3)
    return m


# ---------------------------------------------------------------------------
# Textil
# ---------------------------------------------------------------------------
def cotton_ribbon(tone="oliv"):
    """Baumwollband: mattes Fischgrat-/Koeperband mit sichtbarer Webstruktur.
    UV: u quer 0..1, v laengs in Metern."""
    def build():
        m, nt, bsdf, _ = _new(f"dk_band_{tone}")
        base = tone_linear(tone)
        uv = N(nt, "ShaderNodeUVMap").outputs["UV"]
        sep = N(nt, "ShaderNodeSeparateXYZ", {"Vector": uv})
        u, v = sep.outputs["X"], sep.outputs["Y"]
        width, pitch = 0.022, 0.0017
        # Fischgrat: Koepergrat laeuft von der Mitte nach aussen
        chev = math_(nt, "ABSOLUTE", math_(nt, "SUBTRACT", u, 0.5))
        phase = math_(nt, "ADD", math_(nt, "MULTIPLY", v, 2 * math.pi / pitch),
                      math_(nt, "MULTIPLY", chev, 2 * math.pi * width / pitch))
        rib = math_(nt, "SINE", phase)
        vec = N(nt, "ShaderNodeCombineXYZ", {"X": math_(nt, "MULTIPLY", u, width), "Y": v,
                                             "Z": 0.0}).outputs[0]
        thread = noise(nt, vec, 2600.0, 2.0, 0.7)
        mott = noise(nt, vec, 160.0, 3.0, 0.6)
        streak = noise(nt, N(nt, "ShaderNodeCombineXYZ", {"X": math_(nt, "MULTIPLY", u, 26.0),
                                                          "Y": math_(nt, "MULTIPLY", v, 14.0),
                                                          "Z": 0.0}).outputs[0], 1.0, 2.0)
        col = mix(nt, math_(nt, "ADD", math_(nt, "MULTIPLY", rib, 0.5), 0.5),
                  _scale(base, 0.80), _scale(base, 1.07))
        col = mix(nt, math_(nt, "MULTIPLY", mott, 0.5), col, _scale(base, 0.82))
        col = mix(nt, math_(nt, "MULTIPLY", streak, 0.35), col, _scale(base, 1.14))
        col = mix(nt, math_(nt, "MULTIPLY", thread, 0.25), col, _scale(base, 0.7))
        # Webkante
        sel = N(nt, "ShaderNodeMapRange", {"Value": chev, "From Min": 0.44, "From Max": 0.47}
                ).outputs[0]
        col = mix(nt, math_(nt, "MULTIPLY", sel, 0.25), col, _scale(base, 0.68))
        h = math_(nt, "ADD", math_(nt, "MULTIPLY", rib, 0.5), math_(nt, "MULTIPLY", thread, 0.6))
        nrm = bump(nt, h, 0.7, 0.00028)
        nrm = bump(nt, mott, 0.25, 0.0012, nrm)
        nrm = bump(nt, sel, 0.4, 0.0002, nrm)
        P(nt, bsdf, Base_Color=col, Roughness=0.95, Normal=nrm, Specular_IOR_Level=0.1,
          Sheen_Weight=0.5, Sheen_Roughness=0.45)
        return m
    return _cached(("ribbon", tone), build)


# Leinen etwas kraeftiger anlegen als der Zielton: AgX entsaettigt helle Flaechen,
# im fertigen Bild landet der Untergrund so bei ca. #EBEBD8.
LINEN_BASE = {"creme": "#DEE2BC"}


def linen(tone="creme"):
    """Leinen-Tischtuch: unregelmaessige Leinwandbindung mit Garnverdickungen (Slubs)
    und sanften, grossflaechigen Wellen (nur Bump - nichts schwebt)."""
    def build():
        m, nt, bsdf, _ = _new("dk_leinen")
        base = tone_linear(LINEN_BASE.get(tone, tone))
        v = coords(nt, "Object")
        # Garnstreifen in Kett- und Schussrichtung (lang und duenn)
        warpn = noise(nt, coords(nt, "Object", scale=(620.0, 9.0, 1.0)), 1.0, 3.0, 0.65)
        weftn = noise(nt, coords(nt, "Object", scale=(9.0, 620.0, 1.0)), 1.0, 3.0, 0.65)
        wx = N(nt, "ShaderNodeTexWave", {"Vector": v, "Scale": _wave_scale(0.0013), "Distortion": 1.6,
                                         "Detail": 1.0, "Detail Scale": 0.5},
               wave_type="BANDS", bands_direction="X", wave_profile="SIN").outputs["Factor"]
        wy = N(nt, "ShaderNodeTexWave", {"Vector": v, "Scale": _wave_scale(0.0013), "Distortion": 1.6,
                                         "Detail": 1.0, "Detail Scale": 0.5},
               wave_type="BANDS", bands_direction="Y", wave_profile="SIN").outputs["Factor"]
        weave = math_(nt, "MAXIMUM", wx, wy)
        slub = math_(nt, "MAXIMUM", warpn, weftn)
        slub_c = N(nt, "ShaderNodeMapRange", {"Value": slub, "From Min": 0.45, "From Max": 0.85}
                   ).outputs[0]
        cloud = noise(nt, v, 3.0, 3.0, 0.5)
        col = mix(nt, slub_c, _scale(base, 0.875), _scale(base, 1.03))
        col = mix(nt, math_(nt, "MULTIPLY", cloud, 0.30), col, _scale(base, 0.92))
        col = mix(nt, math_(nt, "MULTIPLY", math_(nt, "SUBTRACT", 1.0, weave), 0.22), col,
                  _scale(base, 0.70))
        folds = noise(nt, coords(nt, "Object", scale=(1.0, 1.7, 1.0), rot=(0, 0, 0.45)), 3.1, 1.0,
                      0.4, 0.5)
        h = math_(nt, "ADD", math_(nt, "MULTIPLY", weave, 0.5), math_(nt, "MULTIPLY", slub_c, 0.9))
        nrm = bump(nt, h, 0.6, 0.00035)
        nrm = bump(nt, folds, 1.0, 0.022, nrm)
        P(nt, bsdf, Base_Color=col, Roughness=0.93, Normal=nrm, Specular_IOR_Level=0.12,
          Sheen_Weight=0.25, Sheen_Roughness=0.5)
        return m
    return _cached(("linen", tone), build)


def light_wood():
    """Helles, geoeltes Holz (Ahorn/Esche) als Alternative zum Leinen."""
    def build():
        m, nt, bsdf, _ = _new("dk_holz_hell")
        v = coords(nt, "Object", scale=(1.0, 9.0, 1.0), rot=(0, 0, 1.5708))
        grain = noise(nt, v, 26.0, 6.0, 0.62, 1.4)
        ring = N(nt, "ShaderNodeTexWave", {"Vector": v, "Scale": 3.0, "Distortion": 7.0,
                                           "Detail": 3.0, "Detail Scale": 1.4},
                 wave_type="BANDS", bands_direction="Y").outputs["Factor"]
        pores = noise(nt, coords(nt, "Object", scale=(60.0, 2200.0, 1.0), rot=(0, 0, 1.5708)),
                      1.0, 2.0)
        f = math_(nt, "ADD", math_(nt, "MULTIPLY", grain, 0.55), math_(nt, "MULTIPLY", ring, 0.45))
        col = mix(nt, f, _lin("#CDB389"), _lin("#E3D0AC"))
        col = mix(nt, math_(nt, "MULTIPLY", N(nt, "ShaderNodeMapRange", {
            "Value": pores, "From Min": 0.6, "From Max": 0.8}).outputs[0], 0.25), col, _lin("#B79A6E"))
        nrm = bump(nt, math_(nt, "ADD", f, math_(nt, "MULTIPLY", pores, 0.5)), 0.12, 0.0003)
        rough = N(nt, "ShaderNodeMapRange", {"Value": f, "To Min": 0.52, "To Max": 0.68}).outputs[0]
        P(nt, bsdf, Base_Color=col, Roughness=rough, Normal=nrm, Specular_IOR_Level=0.35)
        return m
    return _cached("wood", build)


def wood_wool(bed=False):
    """Holzwolle: helle, matte Spaene, pro Span leicht andere Farbe (UV.x = Zufall),
    etwas durchscheinend."""
    def build():
        m, nt, bsdf, out = _new("dk_holzwolle_bett" if bed else "dk_holzwolle")
        if bed:
            v = coords(nt, "Object")
            n1 = noise(nt, v, 260.0, 3.0, 0.7)
            n2 = noise(nt, coords(nt, "Object", scale=(900.0, 60.0, 300.0)), 1.0, 2.0)
            col = mix(nt, n1, _lin("#8F7446"), _lin("#C9AE7C"))
            nrm = bump(nt, math_(nt, "ADD", n1, n2), 1.0, 0.003)
            P(nt, bsdf, Base_Color=col, Roughness=0.85, Normal=nrm, Specular_IOR_Level=0.1)
            return m
        uv = N(nt, "ShaderNodeUVMap").outputs["UV"]
        sep = N(nt, "ShaderNodeSeparateXYZ", {"Vector": uv})
        rnd, along = sep.outputs["X"], sep.outputs["Y"]
        ramp = N(nt, "ShaderNodeValToRGB", {"Factor": rnd})
        cr = ramp.color_ramp
        cr.elements[0].position = 0.0
        cr.elements[0].color = _rgba(_lin("#CDB07C"))
        cr.elements[1].position = 1.0
        cr.elements[1].color = _rgba(_lin("#EFE2C0"))
        e = cr.elements.new(0.5)
        e.color = _rgba(_lin("#E2CC9C"))
        grain = noise(nt, N(nt, "ShaderNodeCombineXYZ", {"X": math_(nt, "MULTIPLY", rnd, 97.0),
                                                         "Y": math_(nt, "MULTIPLY", along, 60.0),
                                                         "Z": 0.0}).outputs[0], 1.0, 2.0)
        col = mix(nt, math_(nt, "MULTIPLY", grain, 0.35), ramp.outputs["Color"], _lin("#C3A36E"))
        P(nt, bsdf, Base_Color=col, Roughness=0.7, Specular_IOR_Level=0.2)
        trans = N(nt, "ShaderNodeBsdfTranslucent", {"Color": col})
        ms = N(nt, "ShaderNodeMixShader", {"Factor": 0.22})
        nt.links.new(bsdf.outputs[0], ms.inputs[1])
        nt.links.new(trans.outputs[0], ms.inputs[2])
        nt.links.new(ms.outputs[0], out.inputs["Surface"])
        return m
    return _cached(("wool", bed), build)


# ---------------------------------------------------------------------------
# Glas, Inhalte, Metall, Wachs
# ---------------------------------------------------------------------------
def _shadow_passthrough(nt, bsdf, out, color, amount=0.75):
    """Ohne Kaustiken wuerde Glas tiefschwarze Schatten werfen: Schattenstrahlen
    teilweise (getoent) durchlassen."""
    lp = N(nt, "ShaderNodeLightPath")
    tr = N(nt, "ShaderNodeBsdfTransparent", {"Color": _rgba(color)})
    ms = N(nt, "ShaderNodeMixShader",
           {"Factor": math_(nt, "MULTIPLY", lp.outputs["Is Shadow Ray"], amount)})
    nt.links.new(bsdf.outputs[0], ms.inputs[1])
    nt.links.new(tr.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out.inputs["Surface"])


def clear_glass():
    def build():
        m, nt, bsdf, out = _new("dk_glas_klar")
        P(nt, bsdf, Base_Color=(0.985, 0.995, 0.99, 1), Roughness=0.015, IOR=1.5,
          Transmission_Weight=1.0)
        _shadow_passthrough(nt, bsdf, out, (0.9, 0.93, 0.9), 0.85)
        return m
    return _cached("glass", build)


BOTTLE_GLASS = {
    "gruen_dunkel": (0.035, 0.07, 0.025),
    "gruen": (0.16, 0.26, 0.07),
    "braun": (0.20, 0.085, 0.02),
    "klar": (0.95, 0.97, 0.95),
}


def bottle_glass(kind="gruen_dunkel"):
    """Massives, gefaerbtes Flaschenglas (Faerbung ueber die Oberflaechen-Transmission)."""
    def build():
        m, nt, bsdf, out = _new(f"dk_flaschenglas_{kind}")
        c = BOTTLE_GLASS.get(kind, BOTTLE_GLASS["gruen_dunkel"])
        P(nt, bsdf, Base_Color=_rgba(c), Roughness=0.04, IOR=1.5, Transmission_Weight=1.0)
        _shadow_passthrough(nt, bsdf, out, c, 0.35)
        return m
    return _cached(("bglass", kind), build)


CONTENTS = {
    # name: (Farbe sRGB-Hex, Art)
    "erdbeer": ("#8E1A1F", "gel"), "himbeer": ("#8A1230", "gel"), "kirsch": ("#5E0F1C", "gel"),
    "aprikose": ("#D98324", "gel"), "orange": ("#D8791C", "gel"), "quitte": ("#D9A23A", "gel"),
    "honig": ("#D9951E", "klar"), "sirup": ("#B26A1A", "klar"), "oel": ("#C9B437", "klar"),
    "pesto": ("#4C5C24", "paste"), "nougat": ("#5B3A24", "creme"), "schoko": ("#3B2418", "creme"),
    "senf": ("#C9A53A", "creme"), "oliven": ("#5F6A2E", "stuecke"), "tomate": ("#A63A22", "paste"),
    "chutney": ("#A2581F", "paste"), "salz": ("#EFEDE6", "paste"), "kraeuter": ("#6B7446", "paste"),
    "tee": ("#5A4A2C", "paste"), "karamell": ("#B5722B", "creme"),
}


def jar_contents(kind="erdbeer"):
    def build():
        hexc, sort = CONTENTS.get(str(kind).lower(), CONTENTS["erdbeer"])
        c = _lin(hexc)
        m, nt, bsdf, out = _new(f"dk_inhalt_{kind}")
        v = coords(nt, "Object")
        if sort == "klar":      # Honig, Oel: durchscheinend
            P(nt, bsdf, Base_Color=_rgba(c), Roughness=0.08, IOR=1.47, Transmission_Weight=0.85,
              Subsurface_Weight=0.0)
        elif sort == "gel":     # Konfituere: dunkel, leicht durchleuchtet, Fruchtstuecke
            n = noise(nt, v, 90.0, 3.0, 0.6)
            col = mix(nt, n, _scale(c, 0.55), _scale(c, 1.15))
            P(nt, bsdf, Base_Color=col, Roughness=0.12, IOR=1.42, Subsurface_Weight=0.7,
              Subsurface_Radius=(0.006, 0.0015, 0.001), Subsurface_Scale=1.0)
        elif sort == "stuecke":  # Oliven o. ae.
            vor = N(nt, "ShaderNodeTexVoronoi", {"Vector": v, "Scale": 42.0, "Randomness": 0.9})
            col = mix(nt, vor.outputs["Distance"], _scale(c, 1.2), _scale(c, 0.35))
            P(nt, bsdf, Base_Color=col, Roughness=0.25, IOR=1.4)
        elif sort == "paste":   # Pesto, Chutney: koernig, matt
            n = noise(nt, v, 380.0, 3.0, 0.7)
            col = mix(nt, n, _scale(c, 0.6), _scale(c, 1.25))
            P(nt, bsdf, Base_Color=col, Roughness=0.45, Normal=bump(nt, n, 0.4, 0.0004))
        else:                   # Creme: Nougat, Senf
            n = noise(nt, v, 30.0, 2.0, 0.5)
            col = mix(nt, n, _scale(c, 0.88), _scale(c, 1.08))
            P(nt, bsdf, Base_Color=col, Roughness=0.3, Subsurface_Weight=0.2,
              Subsurface_Radius=(0.002, 0.001, 0.0006))
        return m
    return _cached(("contents", kind), build)


def painted_metal(tone="ink", rough=0.42):
    """Lackiertes Blech (Schraubdeckel, Dosen): seidenmatt, kein Chrom."""
    def build():
        m, nt, bsdf, _ = _new(f"dk_lack_{tone}")
        base = tone_linear(tone)
        v = coords(nt, "Object")
        n = noise(nt, v, 60.0, 2.0)
        col = mix(nt, n, _scale(base, 0.95), _scale(base, 1.04))
        P(nt, bsdf, Base_Color=col, Roughness=rough, Specular_IOR_Level=0.45,
          Coat_Weight=0.15, Coat_Roughness=0.35, Normal=bump(nt, n, 0.03, 0.0002))
        return m
    return _cached(("metal", tone, rough), build)


def foil(color_hex="#B9A46A", rough=0.42):
    """Folienkapsel (Sekt/Wein): gebuerstet-matt, fein geknittert."""
    def build():
        m, nt, bsdf, _ = _new(f"dk_folie_{color_hex}")
        v = coords(nt, "Object")
        vor = N(nt, "ShaderNodeTexVoronoi", {"Vector": v, "Scale": 180.0}, feature="DISTANCE_TO_EDGE"
                ).outputs["Distance"]
        n = noise(nt, v, 240.0, 2.0)
        nrm = bump(nt, math_(nt, "ADD", vor, math_(nt, "MULTIPLY", n, 0.3)), 0.25, 0.0002)
        P(nt, bsdf, Base_Color=_rgba(_lin(color_hex)), Metallic=0.85, Roughness=rough, Normal=nrm)
        return m
    return _cached(("foil", color_hex, rough), build)


def wax(color_hex="#EDE6D2"):
    def build():
        m, nt, bsdf, _ = _new("dk_wachs")
        c = _lin(color_hex)
        P(nt, bsdf, Base_Color=_rgba(c), Roughness=0.5, Subsurface_Weight=0.8,
          Subsurface_Radius=(0.012, 0.009, 0.006), Subsurface_Scale=1.0, IOR=1.44)
        return m
    return _cached(("wax", color_hex), build)


def plain(color_hex, rough=0.6, name="dk_plain"):
    def build():
        m, nt, bsdf, _ = _new(name)
        P(nt, bsdf, Base_Color=_rgba(_lin(color_hex)), Roughness=rough)
        return m
    return _cached(("plain", color_hex, rough), build)
