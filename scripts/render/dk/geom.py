"""Mesh-Helfer: Platten mit Wellpappe-Kante, Loft/Drehkoerper, Aufkleber-Patches, Baender."""
from __future__ import annotations

import math

import bpy
import numpy as np
from mathutils import Matrix, Vector


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def empty(name):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.02
    return link(e)


def parent(child, root, matrix=None):
    child.parent = root
    if matrix is not None:
        child.matrix_local = matrix
    return child


def mesh_obj(name, verts, faces, uvs=None, mats=(), face_mat=None, smooth=False,
             sharp_angle=None):
    """verts: (N,3); faces: Liste von Index-Tupeln; uvs: (N,2) pro Vertex."""
    me = bpy.data.meshes.new(name)
    verts = np.asarray(verts, dtype=np.float64)
    me.from_pydata(verts.tolist(), [], [tuple(int(i) for i in f) for f in faces])
    if uvs is not None:
        uvl = me.uv_layers.new(name="UVMap")
        li = np.empty(len(me.loops), np.int32)
        me.loops.foreach_get("vertex_index", li)
        uvl.data.foreach_set("uv", np.asarray(uvs, np.float32)[li].ravel())
    for m in mats:
        me.materials.append(m)
    if face_mat is not None:
        me.polygons.foreach_set("material_index", np.asarray(face_mat, np.int32))
    if smooth:
        me.shade_smooth()
        if sharp_angle is not None:
            me.set_sharp_from_angle(angle=math.radians(sharp_angle))
    me.update()
    obj = bpy.data.objects.new(name, me)
    return link(obj)


# ---------------------------------------------------------------------------
# Quader
# ---------------------------------------------------------------------------
_CUBE_FACES = [  # (Normalachse, Vorzeichen)
    (0, -1), (0, 1), (1, -1), (1, 1), (2, -1), (2, 1)]


def _cuboid(sx, sy, sz, center=(0, 0, 0)):
    """24 Vertices (4 je Flaeche), damit UVs pro Flaeche moeglich sind."""
    h = np.array([sx, sy, sz]) / 2.0
    verts, faces, normals = [], [], []
    for axis, sign in _CUBE_FACES:
        a, b = [i for i in range(3) if i != axis]
        quad = []
        for da, db in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            p = np.zeros(3)
            p[axis] = sign * h[axis]
            p[a] = da * h[a]
            p[b] = db * h[b]
            quad.append(p + np.array(center))
        # Windung so, dass die Normale nach aussen zeigt
        n = np.cross(quad[1] - quad[0], quad[3] - quad[0])
        if n[axis] * sign < 0:
            quad = quad[::-1]
        i0 = len(verts)
        verts.extend(quad)
        faces.append((i0, i0 + 1, i0 + 2, i0 + 3))
        normals.append((axis, sign))
    return np.array(verts), faces, normals


def panel(name, sx, sy, sz, mat_face, mat_edge, mat_inner=None):
    """Wellpappe-Platte. Die duennste Achse ist die Materialstaerke; die vier
    Schmalseiten bekommen das Kanten-Material mit UV (u = Meter entlang, v = 0..1).
    mat_inner (optional) fuer die Flaeche in -Richtung der duennen Achse."""
    verts, faces, normals = _cuboid(sx, sy, sz)
    dims = [sx, sy, sz]
    thin = int(np.argmin(dims))
    uvs = np.zeros((len(verts), 2))
    fm = []
    for fi, (axis, sign) in enumerate(normals):
        idx = faces[fi]
        if axis == thin:
            fm.append(2 if (mat_inner is not None and sign < 0) else 0)
            a, b = [i for i in range(3) if i != axis]
            for vi in idx:
                uvs[vi] = (verts[vi][a], verts[vi][b])
        else:
            fm.append(1)
            along = [i for i in range(3) if i not in (axis, thin)][0]
            for vi in idx:
                uvs[vi] = (verts[vi][along], verts[vi][thin] / dims[thin] + 0.5)
    mats = [mat_face, mat_edge] + ([mat_inner] if mat_inner is not None else [])
    return mesh_obj(name, verts, faces, uvs, mats, fm)


def rbox(name, w, d, h, bevel=0.0006, mat=None, origin_bottom=True, segments=3):
    """Quader mit leicht gerundeten Kanten (Bevel + gewichtete Normalen)."""
    verts, faces, _ = _cuboid(w, d, h, center=(0, 0, h / 2 if origin_bottom else 0))
    # verschweisste Variante (8 Ecken) fuer sauberen Bevel
    uniq, inv = np.unique(np.round(verts, 7), axis=0, return_inverse=True)
    inv = np.asarray(inv).ravel()
    f2 = [tuple(int(inv[i]) for i in f) for f in faces]
    obj = mesh_obj(name, uniq, f2, mats=[mat] if mat else ())
    if bevel > 0:
        obj.data.shade_smooth()
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = min(bevel, 0.45 * min(w, d, h))
        b.segments = segments
        b.limit_method = "ANGLE"
        b.angle_limit = math.radians(40)
        wn = obj.modifiers.new("wn", "WEIGHTED_NORMAL")
        wn.keep_sharp = False
        wn.weight = 100
    return obj


# ---------------------------------------------------------------------------
# Loft / Drehkoerper
# ---------------------------------------------------------------------------
def ring(w, d, z, p=2.0, n=48, y_off=0.0, x_off=0.0):
    """Superellipse (p=2 Ellipse, p>=6 fast Rechteck). Start hinten (+y), gegen den
    Uhrzeigersinn von oben gesehen. Rueckgabe (n,3)."""
    t = np.linspace(0, 2 * np.pi, n, endpoint=False) + np.pi / 2
    c, s = np.cos(t), np.sin(t)
    e = 2.0 / p
    x = np.sign(c) * np.abs(c) ** e * w / 2 + x_off
    y = np.sign(s) * np.abs(s) ** e * d / 2 + y_off
    return np.stack([x, y, np.full(n, z)], axis=1)


def loft(name, rings, mats=(), cap_bottom=True, cap_top=True, smooth=True, sharp_angle=50,
         v_coords=None):
    """rings: Liste gleich langer (n,3)-Arrays von unten nach oben. Naht hinten,
    UV: u = Umfang 0..1, v = 0..1 (bzw. v_coords)."""
    R = len(rings)
    n = len(rings[0])
    verts, uvs = [], []
    for r, rg in enumerate(rings):
        v = (r / (R - 1)) if v_coords is None else v_coords[r]
        for i in range(n + 1):
            verts.append(rg[i % n])
            uvs.append((i / n, v))
    faces = []
    for r in range(R - 1):
        for i in range(n):
            a = r * (n + 1) + i
            b = a + 1
            c = (r + 1) * (n + 1) + i + 1
            d = (r + 1) * (n + 1) + i
            faces.append((a, b, c, d))
    if cap_bottom:
        faces.append(tuple(range(n - 1, -1, -1)))
    if cap_top:
        base = (R - 1) * (n + 1)
        faces.append(tuple(base + i for i in range(n)))
    return mesh_obj(name, verts, faces, uvs, mats, smooth=smooth, sharp_angle=sharp_angle)


def lathe(name, profile, n=48, mats=(), cap_bottom=True, cap_top=True, sharp_angle=40):
    """profile: Liste (radius, z) von unten nach oben."""
    rings = [ring(2 * max(r, 1e-5), 2 * max(r, 1e-5), z, 2.0, n) for r, z in profile]
    return loft(name, rings, mats, cap_bottom, cap_top, True, sharp_angle)


def smooth_profile(points, per_seg=6):
    """Catmull-Rom durch Profilpunkte (r,z) fuer weiche Flaschenkonturen."""
    pts = np.asarray(points, float)
    out = []
    P = np.vstack([pts[0], pts, pts[-1]])
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, per_seg, endpoint=False):
            t2, t3 = t * t, t * t * t
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                       + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            # kein Ueberschwingen: zylindrische Abschnitte bleiben exakt zylindrisch
            q = np.minimum(np.maximum(q, np.minimum(p1, p2)), np.maximum(p1, p2))
            out.append(q)
    out.append(pts[-1])
    return [(max(float(r), 0.0), float(z)) for r, z in out]


# ---------------------------------------------------------------------------
# Etiketten-Patches (UV 0..1, nicht gespiegelt bei Blick auf die Vorderseite)
# ---------------------------------------------------------------------------
def plane_decal(name, w, h, mat=None, nx=1, nz=1):
    """Ebene in XZ, Vorderseite zeigt nach -y, Mittelpunkt im Ursprung."""
    verts, uvs, faces = [], [], []
    for j in range(nz + 1):
        for i in range(nx + 1):
            u, v = i / nx, j / nz
            verts.append(((u - 0.5) * w, 0.0, (v - 0.5) * h))
            uvs.append((u, v))
    for j in range(nz):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    return mesh_obj(name, verts, faces, uvs, [mat] if mat else (), smooth=nx > 1 or nz > 1)


def cyl_decal(name, radius, w_arc, h, mat=None, n=24, z0=0.0):
    """Patch auf einem Zylinder (Achse z), mittig nach -y gerichtet."""
    phi = w_arc / radius
    verts, uvs, faces = [], [], []
    for j in range(2):
        for i in range(n + 1):
            u = i / n
            a = (u - 0.5) * phi
            verts.append((radius * math.sin(a), -radius * math.cos(a), z0 + (j - 0.5) * h))
            uvs.append((u, j))
    for i in range(n):
        faces.append((i, i + 1, i + n + 2, i + n + 1))
    return mesh_obj(name, verts, faces, uvs, [mat] if mat else (), smooth=True)


def disc_decal(name, diameter, mat=None, n=72):
    """Kreisscheibe in XY, Vorderseite +z."""
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    verts = np.stack([np.cos(t) * diameter / 2, np.sin(t) * diameter / 2, np.zeros(n)], axis=1)
    uvs = np.stack([np.cos(t) * 0.5 + 0.5, np.sin(t) * 0.5 + 0.5], axis=1)
    return mesh_obj(name, verts, [tuple(range(n))], uvs, [mat] if mat else ())


def shrinkwrap(decal, target, offset=0.0003):
    """Patch entlang seiner lokalen Y-Achse (nach hinten) auf target projizieren."""
    sw = decal.modifiers.new("wrap", "SHRINKWRAP")
    sw.target = target
    sw.wrap_method = "PROJECT"
    sw.use_project_x = False
    sw.use_project_y = True
    sw.use_project_z = False
    sw.use_positive_direction = True
    sw.use_negative_direction = True
    sw.offset = offset
    return sw


# ---------------------------------------------------------------------------
# Band-Streifen
# ---------------------------------------------------------------------------
def strip(name, pts, sides, width, mat=None, thickness=0.0005, v0=0.0, widths=None):
    """Streifen entlang pts (M,3); sides (M,3) = Einheitsvektor quer zum Band.
    UV: u quer 0..1, v = Bogenlaenge in Metern."""
    pts = np.asarray(pts, float)
    sides = np.asarray(sides, float)
    sides /= np.linalg.norm(sides, axis=1, keepdims=True) + 1e-12
    M = len(pts)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    arc = np.concatenate([[0], np.cumsum(seg)]) + v0
    wv = np.full(M, width) if widths is None else np.asarray(widths, float)
    nu = 4
    verts, uvs, faces = [], [], []
    for i in range(M):
        for k in range(nu + 1):
            u = k / nu
            verts.append(pts[i] + sides[i] * (u - 0.5) * wv[i])
            uvs.append((u, arc[i]))
    for i in range(M - 1):
        for k in range(nu):
            a = i * (nu + 1) + k
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    obj = mesh_obj(name, verts, faces, uvs, [mat] if mat else (), smooth=True)
    if thickness > 0:
        so = obj.modifiers.new("solid", "SOLIDIFY")
        so.thickness = thickness
        so.offset = 0.0
    return obj


def resample(pts, step):
    """Polyline gleichmaessig (Bogenlaenge) neu abtasten."""
    pts = np.asarray(pts, float)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    arc = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(arc[-1] / step) + 1)
    s = np.linspace(0, arc[-1], n)
    return np.stack([np.interp(s, arc, pts[:, k]) for k in range(3)], axis=1)


def smooth_polyline(pts, iterations=2):
    """Chaikin-Glaettung (Ecken runden), Endpunkte bleiben."""
    pts = np.asarray(pts, float)
    for _ in range(iterations):
        q = pts[:-1] * 0.75 + pts[1:] * 0.25
        r = pts[:-1] * 0.25 + pts[1:] * 0.75
        mid = np.empty((2 * len(q), 3))
        mid[0::2], mid[1::2] = q, r
        pts = np.vstack([pts[:1], mid, pts[-1:]])
    return pts


# ---------------------------------------------------------------------------
# Transform-Helfer
# ---------------------------------------------------------------------------
def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation(Vector((x, y, z)))


def R(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)
