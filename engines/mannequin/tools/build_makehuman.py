"""Construit le paquet de données du mannequin réaliste à partir de MakeHuman (assets CC0).

Source : https://github.com/makehumancommunity/makehuman (dossier makehuman/data)
  - 3dobjs/base.obj                  maillage de base (groupe « body » uniquement)
  - targets/macrodetails/*.target    morphologie : sexe × âge (jeune/âgé) × musculature × corpulence, origine
  - targets/measure/*.target         mensurations (cou, poitrine, taille, bassin, bras, cuisse…)
  - targets/stomach, buttocks, hip   silhouette (ventre, fessier, bassin)
  - rigs/default.mhskel + default_weights.mhw   articulations et poids du bras (pour baisser les bras)

Sortie : assets/makehuman.mhz (données binaires compressées en gzip ; extension neutre pour que les
serveurs ne la décompressent pas en route).
Format binaire (little-endian) après décompression :
  en-tête JSON (longueur u32 + texte) puis blocs :
  positions de base Float32 (cm), UV Float32, correspondance sommet de rendu -> sommet de base Uint16,
  triangles Uint16, puis pour chaque cible : indices Uint16 + décalages Int16 (1/100 mm).

Usage : python engines/mannequin/tools/build_makehuman.py <chemin vers makehuman/data>
"""
import gzip, json, struct, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SCALE = 10.0          # MakeHuman travaille en décimètres -> cm
GROUPS = {"body", "helper-l-eye", "helper-r-eye"}
JOINTS = ["upperarm01", "lowerarm01", "wrist"]          # tête d'os : épaule, coude, poignet
ARM_CHAIN = ["upperarm01", "upperarm02", "lowerarm01", "lowerarm02", "wrist"] + \
    [f"metacarpal{i}" for i in range(1, 5)] + [f"finger{i}-{j}" for i in range(1, 6) for j in range(1, 4)]
Q = 1e-3              # quantification des décalages : 0,001 cm (0,01 mm)


def load_obj(path):
    V, VT, faces = [], [], []
    group = None
    for line in open(path, encoding="utf-8"):
        if line.startswith("v "):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("vt "):
            VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("g "):
            group = line.split()[1]
        elif line.startswith("f ") and group in GROUPS:
            face = []
            for tok in line.split()[1:]:
                parts = tok.split("/")
                face.append((int(parts[0]) - 1, int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1))
            faces.append(face)
    return np.array(V, dtype=np.float64), np.array(VT, dtype=np.float64), faces


def load_target(path):
    idx, d = [], []
    for line in open(path, encoding="utf-8"):
        if not line.strip() or line[0] == "#":
            continue
        p = line.split()
        idx.append(int(p[0])); d.append([float(p[1]), float(p[2]), float(p[3])])
    return np.array(idx, dtype=np.int64), np.array(d, dtype=np.float64).reshape(-1, 3)


def target_list(data):
    T = data / "targets"
    names = []
    for g in ("male", "female"):
        for a in ("young", "old"):
            for m in ("minmuscle", "averagemuscle", "maxmuscle"):
                for w in ("minweight", "averageweight", "maxweight"):
                    names.append(f"macrodetails/universal-{g}-{a}-{m}-{w}")
            for r in ("african", "asian", "caucasian"):
                names.append(f"macrodetails/{r}-{g}-{a}")
    for f in sorted((T / "measure").glob("*.target")):
        names.append("measure/" + f.stem)
    for sub, pats in (("stomach", ["stomach-pregnant-*"]), ("buttocks", ["buttocks-volume-*"]),
                      ("hip", ["hip-scale-horiz-*", "hip-scale-depth-*"])):
        for pat in pats:
            for f in sorted((T / sub).glob(pat + ".target")):
                names.append(f"{sub}/{f.stem}")
    return names


def main():
    data = Path(sys.argv[1])
    V, VT, faces = load_obj(data / "3dobjs" / "base.obj")
    skel = json.load(open(data / "rigs" / "default.mhskel", encoding="utf-8"))
    wts = json.load(open(data / "rigs" / "default_weights.mhw", encoding="utf-8"))["weights"]
    joint_src = {f"{j}.{s}": skel["joints"][f"{j}.{s}____head"] for j in JOINTS for s in ("L", "R")}
    used = sorted({v for f in faces for v, _ in f} | {v for g in joint_src.values() for v in g})
    remap = {v: i for i, v in enumerate(used)}
    base = V[used] * SCALE

    # sommets de rendu = couples (sommet, uv) ; triangulation des quads
    rv_key, rv_base, rv_uv, tris = {}, [], [], []
    def rv(v, t):
        k = (v, t)
        if k not in rv_key:
            rv_key[k] = len(rv_base); rv_base.append(remap[v]); rv_uv.append(VT[t] if t >= 0 else [0, 0])
        return rv_key[k]
    for f in faces:
        ids = [rv(v, t) for v, t in f]
        for i in range(1, len(ids) - 1):
            tris.append((ids[0], ids[i], ids[i + 1]))

    targets, blobs = [], []
    for name in target_list(data):
        idx, d = load_target(data / "targets" / (name + ".target"))
        keep = np.array([i in remap for i in idx], dtype=bool)
        idx = np.array([remap[i] for i in idx[keep]], dtype=np.uint16)
        q = np.round(d[keep] * SCALE / Q)
        if np.abs(q).max(initial=0) > 32767:
            raise SystemExit(f"{name} : décalage trop grand pour Int16")
        blobs.append(idx.tobytes() + q.astype(np.int16).tobytes())
        targets.append({"name": name, "n": int(len(idx))})

    joints = {k: [remap[v] for v in g] for k, g in joint_src.items()}
    arm_blobs, arm_meta = [], {}
    for side in ("L", "R"):
        acc = {}
        for bone in ARM_CHAIN:
            for v, w in wts.get(f"{bone}.{side}", []):
                if v in remap:
                    acc[remap[v]] = acc.get(remap[v], 0) + w
        idx = np.array(sorted(acc), dtype=np.uint16)
        ww = np.array([min(1.0, acc[i]) for i in idx]) if len(idx) else np.zeros(0)
        arm_blobs.append(idx.tobytes() + np.round(ww * 255).astype(np.uint8).tobytes() + (b"\0" if len(idx) % 2 else b""))
        arm_meta[side] = int(len(idx))

    header = {
        "source": "MakeHuman 1.x assets (CC0 1.0) - makehumancommunity.org",
        "units": "cm", "quant": Q,
        "nBase": len(used), "nRender": len(rv_base), "nTris": len(tris), "targets": targets,
        "joints": joints, "arm": arm_meta,
    }
    hb = json.dumps(header).encode("utf-8")
    out = bytearray(struct.pack("<I", len(hb)) + hb)
    while len(out) % 4:
        out += b" "
    out += base.astype(np.float32).tobytes()
    out += np.array(rv_uv, dtype=np.float32).tobytes()
    out += np.array(rv_base, dtype=np.uint16).tobytes()
    if len(out) % 2:
        out += b"\0"
    out += np.array(tris, dtype=np.uint16).tobytes()
    for b in blobs:
        out += b
    for b in arm_blobs:
        out += b
    gz = gzip.compress(bytes(out), 9)
    (ROOT / "assets" / "makehuman.mhz").write_bytes(gz)
    print(f"sommets {len(used)} / rendu {len(rv_base)} / triangles {len(tris)} / cibles {len(targets)}")
    print(f"binaire {len(out) / 1e6:.1f} Mo, gzip {len(gz) / 1e6:.1f} Mo")


if __name__ == "__main__":
    main()
