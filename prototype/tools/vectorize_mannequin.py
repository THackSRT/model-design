"""Vectorise un croquis de mannequin (trait noir sur fond blanc) pour l'atelier.

Produit js/mannequin-data.js :
  - lines   : le trait du mannequin en un seul chemin SVG (fill-rule evenodd) ;
  - regions : silhouettes pleines (avant-bras + mains, pieds) utilisées pour
              faire passer les mains devant la tunique et chausser les pieds.

Usage : pip install pillow numpy scipy potracer
        python tools/vectorize_mannequin.py [references/mannequin-croquis.png]

Les graines (seed) et barrières des régions sont propres à ce croquis : pour un
autre mannequin, ajustez-les en coordonnées pixels de l'image source.
"""
import json, sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "references" / "mannequin-croquis.png"
CROP = (0, 0, 285, 720)   # figure de gauche uniquement
S = 3                      # sur-échantillonnage pour un tracé plus lisse
THRESH = 170

REGIONS = {
    "armL": ((95, 280), [[(70, 196), (135, 196)]]),
    "armR": ((252, 260), [[(226, 190), (280, 190)], [(228, 300), (232, 366)]]),
    "footL": ((155, 695), [[(130, 666), (180, 669)], [(128, 716), (175, 716)]]),
    "footR": ((192, 675), [[(170, 646), (212, 646)]]),
}


def to_path(bitmap_fg, turdsize=6, tol=0.2):
    # potracer : False = encre
    curves = potrace.Bitmap(~bitmap_fg).trace(turdsize=turdsize, alphamax=1.0, opticurve=True, opttolerance=tol)
    out = []
    for c in curves:
        sp = c.start_point
        d = [f"M{sp.x / S:.1f} {sp.y / S:.1f}"]
        for s in c.segments:
            if s.is_corner:
                d.append(f"L{s.c.x / S:.1f} {s.c.y / S:.1f}L{s.end_point.x / S:.1f} {s.end_point.y / S:.1f}")
            else:
                d.append(f"C{s.c1.x / S:.1f} {s.c1.y / S:.1f} {s.c2.x / S:.1f} {s.c2.y / S:.1f} "
                         f"{s.end_point.x / S:.1f} {s.end_point.y / S:.1f}")
        d.append("Z")
        out.append("".join(d))
    return "".join(out)


def region(lines, seed, barriers, close=7, grow=2):
    closed = ndi.binary_dilation(lines, iterations=close)
    img = Image.fromarray((closed * 255).astype("uint8"))
    draw = ImageDraw.Draw(img)
    for b in barriers:
        draw.line([(x * S, y * S) for x, y in b], fill=255, width=3 * S)
    walls = np.array(img) > 0
    lab, _ = ndi.label(~walls)
    r = lab == lab[int(seed[1] * S), int(seed[0] * S)]
    if r.mean() > 0.2:
        raise SystemExit(f"région {seed} non fermée : ajoutez une barrière")
    return ndi.binary_fill_holes(ndi.binary_dilation(r, iterations=close + grow))


def main():
    im = Image.open(SRC).convert("RGBA")
    white = Image.new("RGBA", im.size, "white")
    gray = Image.alpha_composite(white, im).convert("L").crop(CROP)
    big = gray.resize((gray.width * S, gray.height * S), Image.LANCZOS)
    lines = np.array(big) < THRESH
    data = {
        "viewBox": [40, 0, 250, 720],
        "lines": to_path(lines),
        "regions": {k: to_path(region(lines, *v), turdsize=20, tol=0.3) for k, v in REGIONS.items()},
    }
    js = ("/* Généré par tools/vectorize_mannequin.py à partir de references/mannequin-croquis.png.\n"
          "   Coordonnées = pixels de l'image source (viewBox 40 0 250 720). */\n"
          "window.MANNEQUIN = " + json.dumps(data, indent=2) + ";\n")
    (ROOT / "js" / "mannequin-data.js").write_text(js, encoding="utf-8")
    print("js/mannequin-data.js :", len(js), "octets")


if __name__ == "__main__":
    main()
