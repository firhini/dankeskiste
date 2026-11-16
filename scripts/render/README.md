# Produktbilder rendern (Blender)

Die Beispielbilder im Shop entstehen aus einer parametrischen Blender-Szene: Kraftkarton, Holzwolle,
Baumwollband, Grußkarte und generische Artikel mit neutralen Etiketten – ohne Markenlogos.

## Voraussetzungen

```bash
pip install bpy pillow        # Blender als Python-Modul (getestet mit bpy 5.3, Python 3.13)
```

Ein installiertes Blender wird nicht benötigt. Gerendert wird mit Cycles auf der CPU.

## Ablauf

```bash
npm run docs       # schreibt scripts/render/boxes.json aus den Boxen in db/seed-data
npm run render     # rendert alle Boxen nach renders/final (ca. 3–4 Minuten je Bild auf 4 Kernen)
npm run bilder     # erzeugt AVIF/WebP in vier Breiten + Blur → public/images/boxen, src/data/bild-manifest.json
npm run db:seed    # trägt die Bilder bei allen Boxen ein, die noch keine eigenen Fotos haben
```

Einzelne Boxen oder Aufnahmen:

```bash
python3 scripts/render/render.py --boxes scripts/render/boxes.json --out renders/final --grade \
  --only weihnachtskiste,pasta-abend --shots hero,flatlay
# schnelle Vorschau:
python3 scripts/render/render.py --boxes scripts/render/boxes.json --out renders/vorschau --scale 0.25 --samples 16
```

Je Box entstehen drei Aufnahmen: `<slug>-hero.png` (geöffnet, schräg von oben, 1800×1350),
`<slug>-flatlay.png` (von oben, 1600×1600) und `<slug>-geschlossen.png` (mit Band, Karte und Sticker).

## boxes.json

Wird aus den Seed-Daten erzeugt; jeder Artikel trägt dort ein `render`-Objekt:

```json
{ "type": "jar", "label": "Konfitüre", "sub": "ERDBEERE · 370 G", "contents": "erdbeer", "dims": [8.6, 8.6, 10.5] }
```

`type`: coffee_bag, tea_box, chocolate_bar, praline_box, cookie_pack, tin, jar, bottle, bottle_small, pouch,
pasta_bag, marzipan_loaf, stick_pack, notebook, candle. `tone` wählt die Packungsfarbe (creme, salbei, oliv,
dunkeloliv, natur, kraft, sand, terrakotta, rost, kakao, senf), `dims` überschreibt die Maße in Zentimetern.

## Anpassen

Alle Stellschrauben stehen in `dk/config.py`: Palette, Boxmaße, Kamera je Aufnahme, Licht, Renderqualität.
Die Module: `box.py` (Karton, Deckel, Band, Karte, Sticker), `items.py` (Artikel), `labels.py` (Etiketten als
Texturen, Schriften in `fonts/`), `woodwool.py` (Holzwolle), `layout.py` (Anordnung), `scene.py` (Licht, Kamera,
Untergrund), `grade.py` (Vignette und Körnung mit `--grade`).

Die Schriften Newsreader und Hanken Grotesk stehen unter der SIL Open Font License.
