"""Szene: Untergrund, Fensterlicht, Kamera (Auto-Framing, Schaerfentiefe), Cycles-Setup."""
from __future__ import annotations

import math
import warnings

import bpy
import numpy as np
from mathutils import Matrix, Vector

from . import geom, materials
from .config import COLOR, LIGHT, RENDER


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials.reset()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    return scene


# ---------------------------------------------------------------------------
# Untergrund
# ---------------------------------------------------------------------------
def build_ground(surface="leinen"):
    s = 4.0
    verts = [(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)]
    mat = materials.light_wood() if surface == "holz" else materials.linen("creme")
    return geom.mesh_obj("untergrund", verts, [(0, 1, 2, 3)], mats=[mat])


# ---------------------------------------------------------------------------
# Licht
# ---------------------------------------------------------------------------
def _area(name, pos, target, size, power, temp):
    li = bpy.data.lights.new(name, "AREA")
    li.shape = "RECTANGLE"
    li.size, li.size_y = size
    li.energy = power
    try:
        li.use_temperature = True
        li.temperature = temp
    except Exception:
        li.color = (1.0, 0.94, 0.86) if temp < 5600 else (1.0, 0.98, 0.96)
    ob = bpy.data.objects.new(name, li)
    ob.location = pos
    d = Vector(target) - Vector(pos)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    geom.link(ob)
    return ob


def build_lights(scene, center=(0.0, 0.0, 0.08), cfg=None):
    """Fenster links (zwei Fluegel mit Sprosse -> natuerliche Reflexe im Glas),
    grosse schwache Aufhellung rechts, cremefarbenes Umgebungslicht."""
    cfg = dict(LIGHT, **(cfg or {}))
    c = Vector(center)
    wpos = c + Vector(cfg["window_pos"])
    fwd = (c - wpos).normalized()
    right = fwd.cross(Vector((0, 0, 1))).normalized()
    ww, wh = cfg["window_size"]
    gap = 0.07
    pane_w = (ww - gap) / 2
    for i, sgn in enumerate((-1, 1)):
        p = wpos + right * sgn * (pane_w / 2 + gap / 2)
        _area(f"fenster_{i}", p, p + fwd, (pane_w, wh), cfg["window_power"] / 2, cfg["window_temp"])
    fpos = c + Vector(cfg["fill_pos"])
    _area("aufhellung", fpos, c, cfg["fill_size"], cfg["fill_power"], cfg["fill_temp"])

    world = bpy.data.worlds.new("dk_welt")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            world.use_nodes = True
        except Exception:
            pass
    nt = world.node_tree
    nt.nodes.clear()
    bg = nt.nodes.new("ShaderNodeBackground")
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg.inputs["Color"].default_value = (*cfg["world_color"], 1.0)
    bg.inputs["Strength"].default_value = cfg["world_strength"]
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    scene.world = world


# ---------------------------------------------------------------------------
# Kamera
# ---------------------------------------------------------------------------
def _cam_basis(elev_deg, azim_deg):
    el, az = math.radians(elev_deg), math.radians(azim_deg)
    u = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    fwd = -u
    up_w = Vector((0, 0, 1)) if elev_deg < 89.0 else Vector((math.sin(az), math.cos(az), 0)) \
        if abs(az) > 1e-6 else Vector((0, 1, 0))
    right = fwd.cross(up_w).normalized()
    up = right.cross(fwd).normalized()
    return u, fwd, right, up


def build_camera(scene, shot, fit_points, focus_point, offset=(0.0, 0.0)):
    """Kamera so setzen, dass fit_points mit Rand `margin` formatfuellend im Bild sind.
    offset = Verschiebung des Motivs in Bildanteilen (x nach rechts, y nach oben)."""
    cam = bpy.data.cameras.new("kamera")
    cam.lens = shot["lens"]
    cam.sensor_width = 36.0
    cam.sensor_fit = "HORIZONTAL"
    cam.clip_start, cam.clip_end = 0.05, 30.0
    ob = bpy.data.objects.new("kamera", cam)
    geom.link(ob)
    scene.camera = ob

    rx, ry = shot["res"]
    tan_h = 18.0 / cam.lens
    tan_v = tan_h * ry / rx
    if ry > rx:
        cam.sensor_fit = "VERTICAL"
        tan_v = 18.0 / cam.lens
        tan_h = tan_v * rx / ry
    u, fwd, right, up = _cam_basis(shot["elevation"], shot.get("azimuth", 0.0))
    P = np.array([tuple(p) for p in fit_points], float)
    r, upv, f = np.array(right), np.array(up), np.array(fwd)
    c = P.mean(axis=0)
    D = 1.5
    lim = 1.0 - 2.0 * shot.get("margin", 0.08)
    for _ in range(16):
        pos = c - f * D
        rel = P - pos
        depth = rel @ f
        nx = (rel @ r) / (depth * tan_h)
        ny = (rel @ upv) / (depth * tan_v)
        mx, my = (nx.max() + nx.min()) / 2, (ny.max() + ny.min()) / 2
        ex, ey = (nx.max() - nx.min()) / 2, (ny.max() - ny.min()) / 2
        c = c + r * (mx * D * tan_h) + upv * (my * D * tan_v)
        D *= max(ex, ey) / lim
    # Motiv versetzen
    c = c - r * (offset[0] * 2 * D * tan_h) - upv * (offset[1] * 2 * D * tan_v)
    pos = c - f * D
    rot = Matrix((right, up, -fwd)).transposed().to_4x4()
    ob.matrix_world = Matrix.Translation(Vector(pos)) @ rot
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = shot["fstop"]
    cam.dof.aperture_blades = 9
    cam.dof.focus_distance = float((np.array(focus_point) - pos) @ f)
    return ob


# ---------------------------------------------------------------------------
# Render-Einstellungen
# ---------------------------------------------------------------------------
def setup_render(scene, res, scale=1.0, samples=None, threads=None, exposure=None):
    scene.render.engine = "CYCLES"
    cy = scene.cycles
    cy.device = "CPU"
    cy.samples = int(samples or RENDER["samples"])
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = RENDER["adaptive_threshold"]
    cy.adaptive_min_samples = min(RENDER["adaptive_min_samples"], cy.samples)
    cy.max_bounces = RENDER["max_bounces"]
    cy.diffuse_bounces = RENDER["diffuse_bounces"]
    cy.glossy_bounces = RENDER["glossy_bounces"]
    cy.transmission_bounces = RENDER["transmission_bounces"]
    cy.transparent_max_bounces = RENDER["transparent_bounces"]
    cy.sample_clamp_indirect = RENDER["clamp_indirect"]
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.use_denoising = True
    try:
        cy.denoiser = "OPENIMAGEDENOISE"
        cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
        cy.denoising_prefilter = "ACCURATE"
    except Exception as e:  # pragma: no cover
        print("[dk] Hinweis: OIDN nicht verfuegbar:", e)
    try:
        cy.use_light_tree = True
    except Exception:
        pass
    r = scene.render
    r.resolution_x, r.resolution_y = res
    r.resolution_percentage = max(1, int(round(scale * 100)))
    r.threads_mode = "FIXED"
    r.threads = int(threads or RENDER["threads"])
    r.film_transparent = False
    r.use_persistent_data = False
    try:
        r.image_settings.file_format = "PNG"
    except Exception:
        r.image_settings.media_type = "IMAGE"
        r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 30
    try:
        r.use_compositing = False
        r.use_sequencer = False
    except Exception:
        pass
    vs = scene.view_settings
    try:
        vs.view_transform = COLOR["view_transform"]
    except Exception:
        vs.view_transform = "Filmic"
    try:
        vs.look = COLOR["look"]
    except Exception:
        for cand in ("AgX - " + COLOR["look"], "Medium High Contrast", "None"):
            try:
                vs.look = cand
                break
            except Exception:
                continue
    vs.exposure = COLOR["exposure"] if exposure is None else exposure
    vs.gamma = COLOR["gamma"]
    scene.display_settings.display_device = "sRGB"


def render_to(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
