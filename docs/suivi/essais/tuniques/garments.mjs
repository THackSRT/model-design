// Les cinq tuniques des photos, décrites comme des documents de modèle : options de la base + opérations.
// Aucune ligne de code propre à un vêtement : tout ce qui suit est de la donnée (mm, taille 42 homme).

const SIZE = 'cisMaleAdult42'

export const GARMENTS = [
  {
    id: 1,
    title: 'Tunique grise à galons',
    size: SIZE,
    base: { lengthBonus: 0.28, chestEase: 0.12, cuffEase: 0.4 },
    materials: {
      main: { name: 'Gris anthracite', tone: 'main', color: '#77797d' },
      galon: { name: 'Galon rayé noir et blanc', tone: 'stripes', color: '#141414' },
    },
    ops: [
      { op: 'neckline', lowerMm: 10, widenMm: 6 },
      { op: 'placket', lengthMm: 240, widthMm: 30, buttons: 4, material: 'main' },
      { op: 'cuff', heightMm: 65, style: 'french' },
      { op: 'pocket', side: 'left', xPct: 0.47, ref: 'armhole', dy: -95, widthMm: 120, heightMm: 140 },
      { op: 'trim', side: 'right', name: 'Galon rayé', material: 'galon', motif: 'stripes', widthMm: 52, path: { points: [{ edge: 'armhole', y: 172 }, { x: 22, y: 172 }] } },
      { op: 'trim', side: 'left', name: 'Galon rayé', material: 'galon', motif: 'stripes', widthMm: 48, path: { points: [{ edge: 'shoulder', x: 150 }, { x: 150, y: 345 }] } },
      { op: 'slit', heightMm: 90 },
    ],
  },
  {
    id: 2,
    title: 'Tunique blanche à plastron bogolan',
    size: SIZE,
    base: { lengthBonus: 0.24, chestEase: 0.18 },
    materials: {
      main: { name: 'Coton blanc', tone: 'main', color: '#f4f2ec' },
      bogolan: { name: 'Bogolan noir et blanc', tone: 'bogolan', color: '#1d1a17' },
    },
    ops: [
      { op: 'neckline', lowerMm: 18, widenMm: 12 },
      { op: 'neckSlit', lengthMm: 85 },
      { op: 'sleeveLength', totalMm: 270 },
      {
        op: 'decoupe',
        path: { smooth: true, points: [{ edge: 'shoulder', x: 196 }, { x: 194, y: 120 }, { x: 178, y: 212 }, { x: 110, y: 250 }, { x: 0, y: 258 }] },
        insideRef: { x: 60, y: 150 },
        inside: { name: 'Plastron', material: 'bogolan' },
      },
      { op: 'band', edge: 'hem', heightMm: 50, material: 'bogolan', name: "Bande d'ourlet" },
      { op: 'band', edge: 'sleeveHem', heightMm: 45, material: 'bogolan', name: 'Bande de manche' },
    ],
  },
  {
    id: 3,
    title: 'Tunique noire à plastron en pointe',
    size: SIZE,
    base: { lengthBonus: 0.24, chestEase: 0.15 },
    materials: {
      main: { name: 'Coton noir', tone: 'main', color: '#1d1d20' },
      geo: { name: 'Imprimé géométrique orange', tone: 'geo', color: '#e46f1f' },
    },
    ops: [
      { op: 'neckline', lowerMm: 15, widenMm: 10 },
      { op: 'neckSlit', lengthMm: 70 },
      { op: 'sleeveLength', totalMm: 265 },
      {
        op: 'decoupe',
        path: { points: [{ edge: 'shoulder', x: 186 }, { x: 180, y: 105 }, { x: 0, y: 292 }] },
        insideRef: { x: 50, y: 150 },
        inside: { name: 'Plastron', material: 'geo' },
      },
      { op: 'band', edge: 'hem', heightMm: 45, material: 'geo', name: "Bande d'ourlet" },
      { op: 'band', edge: 'sleeveHem', heightMm: 40, material: 'geo', name: 'Bande de manche' },
    ],
  },
  {
    id: 4,
    title: 'Caftan blanc brodé',
    size: SIZE,
    base: { lengthBonus: 0.34, chestEase: 0.24, bicepsEase: 0.3 },
    materials: {
      main: { name: 'Lin blanc cassé', tone: 'main', color: '#efece3' },
      brod: { name: 'Broderie gris perle', tone: 'embroidery', color: '#8f908d' },
    },
    ops: [
      { op: 'neckline', shape: 'v', widenMm: 14, vDepthMm: 185 },
      { op: 'placket', lengthMm: 140, widthMm: 22, buttons: 6, buttonMm: 9, material: 'main' },
      { op: 'embroidery', widthMm: 30, withPlacket: true },
      { op: 'sleeveLength', totalMm: 300 },
      { op: 'slit', heightMm: 140 },
    ],
  },
  {
    id: 5,
    title: 'Tunique marine à empiècement',
    size: SIZE,
    base: { lengthBonus: 0.42, chestEase: 0.14, cuffEase: 0.4 },
    materials: {
      main: { name: 'Bleu marine', tone: 'main', color: '#1f2b47' },
      light: { name: 'Bleu ciel', tone: 'light', color: '#dfe7f1' },
      grec: { name: 'Galon grecque', tone: 'greek', color: '#1f2b47' },
    },
    ops: [
      { op: 'neckline', lowerMm: 10, widenMm: 6 },
      {
        op: 'decoupe',
        path: { points: [{ x: 0, y: 226 }, { x: 330, y: 226 }] },
        insideRef: { x: 60, y: 120 },
        inside: { name: 'Empiècement devant', material: 'light' },
      },
      { op: 'trim', side: 'both', name: 'Galon grecque', material: 'grec', motif: 'greek', widthMm: 24, path: { points: [{ x: 0, y: 240 }, { edge: 'armhole', y: 240 }] } },
      { op: 'placket', lengthMm: 148, widthMm: 30, buttons: 2, material: 'main' },
      { op: 'cuff', heightMm: 60, style: 'barrel' },
      { op: 'slit', heightMm: 120 },
    ],
  },
]
