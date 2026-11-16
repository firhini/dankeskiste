"""Zentrale Stellschrauben der Dankeskiste-Renderpipeline.

Alles, was man fuer Art Direction typischerweise anfasst (Palette, Boxmasse,
Kamera, Licht, Renderqualitaet), steht hier - nicht verstreut im Code.
Laengen in diesem Modul sind in ZENTIMETERN, sofern nicht anders vermerkt;
die Geometrie-Module rechnen mit CM = 0.01 in Meter um.
"""

CM = 0.01
MM = 0.001

# --------------------------------------------------------------------------
# Palette (sRGB-Hex). Die ersten fuenf sind die Markenfarben.
# --------------------------------------------------------------------------
PALETTE = {
    "creme": "#EBEBD8",
    "oliv": "#637545",
    "dunkeloliv": "#455230",
    "salbei": "#9BA685",
    "ink": "#1F2416",
    # Naturtoene fuer Packungen / Baender
    "natur": "#D8CDB4",      # ungebleichtes Papier / Rohbaumwolle
    "kraft": "#A98A62",      # Kraftpapier
    "sand": "#CDBB98",
    "terrakotta": "#A9644A",
    "rost": "#8A4B33",
    "kakao": "#4A3327",
    "senf": "#B8973F",
    "weiss": "#F4F2E8",
}

# Etikettenpapier je Packungston (heller Ton -> Salbei-/Creme-Etikett usw.)
LABEL_PAPER_FOR_TONE = {
    "creme": "salbei", "weiss": "salbei", "natur": "creme", "sand": "creme",
    "kraft": "creme", "salbei": "creme", "oliv": "creme", "dunkeloliv": "creme",
    "ink": "creme", "terrakotta": "creme", "rost": "creme", "kakao": "creme",
    "senf": "creme",
}

RIBBON_TONES = {"oliv": "oliv", "natur": "natur", "salbei": "salbei",
                "dunkeloliv": "dunkeloliv"}

# --------------------------------------------------------------------------
# Boxgroessen: Innenmasse (Laenge x, Tiefe y, Hoehe z) in cm
# --------------------------------------------------------------------------
BOX_SIZES = {
    "klein": (25.0, 18.0, 9.0),
    "mittel": (30.0, 22.0, 10.0),
    "gross": (36.0, 27.0, 12.0),
}
BOX_WALL = 0.3            # Wellpappe-Staerke (cm)
LID_HEIGHT_FRAC = 0.42    # Hoehe des Stuelpdeckel-Rands relativ zur Boxhoehe
LID_CLEARANCE = 0.08      # Luft zwischen Deckel und Unterteil (cm)
RIBBON_WIDTH = 2.2        # cm
STICKER_DIAMETER = 5.5    # cm
CARD_SIZE = (10.5, 7.4)   # Grusskarte quer (cm)

# --------------------------------------------------------------------------
# Aufnahmen
# --------------------------------------------------------------------------
SHOTS = {
    "hero": {
        "res": (1800, 1350),
        "lens": 70.0,          # mm (Kleinbild)
        "fstop": 4.0,
        "elevation": 40.0,     # Grad ueber der Tischebene
        "azimuth": 0.0,        # Grad; 0 = frontal, + = Kamera wandert nach rechts
        "box_yaw": 11.0,       # Box leicht gedreht (Grad)
        "margin": 0.065,       # Luft um das Motiv (Anteil der Bildkante)
    },
    "flatlay": {
        "res": (1600, 1600),
        "lens": 85.0,
        "fstop": 5.6,
        "elevation": 90.0,
        "azimuth": 0.0,
        "box_yaw": 0.0,
        "margin": 0.075,
    },
    "geschlossen": {
        "res": (1800, 1350),
        "lens": 75.0,
        "fstop": 4.0,
        "elevation": 33.0,
        "azimuth": 0.0,
        "box_yaw": 24.0,
        "margin": 0.17,
    },
}

# --------------------------------------------------------------------------
# Licht: grosses Fenster links, weiche Aufhellung rechts
# --------------------------------------------------------------------------
LIGHT = {
    "window_pos": (-1.55, 0.55, 1.25),   # m, relativ zum Motivzentrum
    "window_size": (1.5, 1.25),          # m (Breite, Hoehe) - zwei Fluegel
    "window_power": 150.0,               # Watt (Blender), beide Fluegel zusammen
    "window_temp": 5700.0,               # Kelvin, leicht warm
    "fill_pos": (1.5, -0.5, 0.75),
    "fill_size": (1.8, 1.4),
    "fill_power": 12.0,
    "fill_temp": 6000.0,
    "world_color": (0.93, 0.92, 0.86),
    "world_strength": 0.22,
}

# --------------------------------------------------------------------------
# Farbe / Renderqualitaet
# --------------------------------------------------------------------------
COLOR = {
    "view_transform": "AgX",
    "look": "Medium High Contrast",
    "exposure": 0.0,
    "gamma": 1.0,
}

RENDER = {
    "samples": 80,
    "adaptive_threshold": 0.03,
    "adaptive_min_samples": 24,
    "max_bounces": 10,
    "diffuse_bounces": 3,
    "glossy_bounces": 4,
    "transmission_bounces": 10,
    "transparent_bounces": 8,
    "clamp_indirect": 6.0,
    "threads": 4,
}

# Koernung / Vignette (--grade); bewusst zurueckhaltend
GRADE = {
    "vignette": 0.14,     # 0..1 Abdunklung in den Ecken
    "grain": 0.012,       # Standardabweichung (0..1) der Luminanzkoernung
    "warmth": 0.0,        # optional: + waermer / - kuehler
}


def hex_to_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def srgb_to_linear(c):
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
                 for v in c)


def tone_hex(name, default="creme"):
    if isinstance(name, str) and name.startswith("#") and len(name) == 7:
        return name
    return PALETTE.get(str(name).lower(), PALETTE[default])


def tone_linear(name, default="creme"):
    """Palette-Name oder Hex -> linearer RGB-Tripel (fuer Shader)."""
    return srgb_to_linear(hex_to_srgb(tone_hex(name, default)))


def tone_is_dark(name):
    r, g, b = hex_to_srgb(tone_hex(name))
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 0.55
