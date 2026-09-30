"""Entraîne le modèle « questionnaire → mesures » sur ANSUR II (US Army, 2012, domaine public).

Entrées du questionnaire : sexe, âge, stature, poids + 4 questions de silhouette
(ventre, hanches, poitrine/torse, épaules) répondues en -1 / 0 / +1.
Sorties : les mesures utilisées par l'avatar et les patrons (cm), avec leur erreur moyenne.

Les réponses de silhouette sont apprises ainsi : pour chaque personne de la base, on calcule le
résidu (mesure réelle − mesure attendue pour sa taille, son poids et son âge) du tour de taille,
du tour de bassin, du tour de poitrine et de la carrure ; on le découpe en tiers (-1 / 0 / +1).
Ces tiers deviennent des variables du modèle : c'est l'information qu'apporte la question.

Usage : python tools/fit_anthropometry.py ANSUR_II_MALE_Public.csv ANSUR_II_FEMALE_Public.csv
        (fichiers : https://www.openlab.psu.edu/ansur2/)
Écrit js/anthro-model.js.
"""
import csv, json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent

# mesure du modèle -> fonction(ligne ANSUR en mm) -> cm
TARGETS = {
    "neck":      lambda r: r["neckcircumference"] / 10,
    "shoulder":  lambda r: r["shoulderlength"] / 10,
    "chest":     lambda r: r["chestcircumference"] / 10,
    "waist":     lambda r: r["waistcircumference"] / 10,
    "hip":       lambda r: r["buttockcircumference"] / 10,
    "bicep":     lambda r: r["bicepscircumferenceflexed"] * 0.94 / 10,   # base : biceps contracté
    "wrist":     lambda r: r["wristcircumference"] / 10,
    "armLength": lambda r: (r["acromionradialelength"] + r["radialestylionlength"]) / 10,
    "thigh":     lambda r: r["thighcircumference"] / 10,
    "knee":      lambda r: r["lowerthighcircumference"] * 0.95 / 10,     # base : bas de cuisse
    "calf":      lambda r: r["calfcircumference"] / 10,
    "ankle":     lambda r: r["anklecircumference"] / 10,
    "outseam":   lambda r: r["waistheightomphalion"] / 10 - 3,           # taille -> 3 cm du sol
    "rise":      lambda r: (r["waistheightomphalion"] - r["crotchheight"]) / 10 + 4,  # montant de patronage
}
SHAPES = {  # question -> mesure dont le résidu définit la réponse
    "belly": "waistcircumference", "hips": "buttockcircumference",
    "chest": "chestcircumference", "shoulders": "biacromialbreadth",
}
# hauteurs utiles à l'avatar, en fraction de la stature
LANDMARKS = {
    "neckBase": "cervicaleheight", "shoulder": "acromialheight", "chest": "chestheight",
    "knee": "kneeheightmidpatella", "ankle": "lateralmalleolusheight", "crotch": "crotchheight",
}


def load(path):
    with open(path, newline="", encoding="latin-1") as f:
        rows = list(csv.DictReader(f))
    out = []
    for r in rows:
        r = {k.strip().lower(): v for k, v in r.items()}
        d = {}
        for k, v in r.items():
            try:
                d[k] = float(v)
            except (TypeError, ValueError):
                pass
        d["weight"] = d["weightkg"] / 10
        d["height"] = d["stature"] / 10
        out.append(d)
    return out


def base_features(h, w, age):
    bmi = w / (h / 100) ** 2
    return np.column_stack([np.ones_like(h), h, w, bmi, age, age ** 2 / 100, h * bmi / 100])


def fit(X, y):
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    return beta


def cv_mae(X, y, k=5, seed=1):
    idx = np.random.default_rng(seed).permutation(len(y))
    folds = np.array_split(idx, k)
    err = []
    for f in folds:
        tr = np.setdiff1d(idx, f)
        b = fit(X[tr], y[tr])
        err.append(np.abs(X[f] @ b - y[f]))
    return float(np.mean(np.concatenate(err)))


def model_for(rows):
    h = np.array([r["height"] for r in rows]); w = np.array([r["weight"] for r in rows])
    age = np.array([r["age"] for r in rows])
    XB = base_features(h, w, age)
    shapes, cuts = [], {}
    for q, col in SHAPES.items():
        y = np.array([r[col] for r in rows]) / 10
        res = y - XB @ fit(XB, y)
        lo, hi = np.percentile(res, [33.3, 66.7])
        cuts[q] = [round(float(lo), 2), round(float(hi), 2)]
        shapes.append(np.where(res < lo, -1.0, np.where(res > hi, 1.0, 0.0)))
    XS = np.column_stack([XB] + shapes)
    targets = {}
    for name, fn in TARGETS.items():
        y = np.array([fn(r) for r in rows])
        b = fit(XS, y)
        targets[name] = {
            "coef": [round(float(v), 6) for v in b],
            "mae": round(cv_mae(XS, y), 2),
            "maeBase": round(cv_mae(XB, y), 2),
            "mean": round(float(y.mean()), 1),
        }
    ratios = {k: round(float(np.mean([r[c] / r["stature"] for r in rows])), 4) for k, c in LANDMARKS.items()}
    return {
        "n": len(rows),
        "features": ["1", "stature", "poids", "IMC", "age", "age²/100", "stature·IMC/100", "ventre", "hanches", "poitrine", "epaules"],
        "range": {"stature": [round(float(np.percentile(h, 1))), round(float(np.percentile(h, 99)))],
                  "poids": [round(float(np.percentile(w, 1))), round(float(np.percentile(w, 99)))],
                  "age": [int(age.min()), int(age.max())]},
        "targets": targets, "landmarks": ratios,
    }


def main():
    male, female = sys.argv[1], sys.argv[2]
    model = {"source": "ANSUR II (US Army, 2012), domaine public", "homme": model_for(load(male)), "femme": model_for(load(female))}
    js = ("/* Généré par tools/fit_anthropometry.py à partir d'ANSUR II. Ne pas modifier à la main. */\n"
          "window.ANTHRO_MODEL = " + json.dumps(model, ensure_ascii=False) + ";\n")
    (ROOT / "js" / "anthro-model.js").write_text(js, encoding="utf-8")
    for sex in ("homme", "femme"):
        print(sex, model[sex]["n"], "sujets")
        for k, t in model[sex]["targets"].items():
            print(f"  {k:10s} moyenne {t['mean']:6.1f}  erreur moy. {t['mae']:4.2f} cm (sans silhouette {t['maeBase']:4.2f})")
        print("  repères", model[sex]["landmarks"])


if __name__ == "__main__":
    main()
