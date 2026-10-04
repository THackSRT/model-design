// Génère fiches/<modèle>.json (fiche de couture, format « fiche-couture/1 »).
// Une fiche dit, pour chaque pièce : ses bords (plages de points FreeSewing sur paths.seam, avec un rôle), ses pinces,
// sa coupe (au pli / en double) ; et pour le patron : les paires de bords cousus ensemble.
import { writeFileSync, mkdirSync } from 'node:fs'

const FS = '4.10.2'
const edge = (id, role, specRole, from, to, extra = {}) => ({ id, role, specRole, from, to, ...extra })
const base = (design, label, parts, pairs, extra = {}) => ({
  format: 'fiche-couture/1',
  design,
  label,
  garmentType: extra.garmentType,
  freesewing: FS,
  unit: 'mm',
  contour: 'paths.seam',
  conventions: {
    edgeOrder: 'bords dans le sens du contour paths.seam (sens trigonométrique à l\'écran, y vers le bas) ; la fin d\'un bord est le début du suivant',
    pointNames: 'noms de points FreeSewing (part.points) ; un point est un sommet du contour s\'il coïncide à 0,01 mm près avec la fin d\'une opération du tracé',
    roles: 'côté, épaule, emmanchure, encolure, ourlet, milieu devant, milieu dos, tête de manche, dessous de bras, poignet, taille, entrejambe, montant, pli',
    specRole: 'rôle du contrat GarmentSpec (seam, fold, hem, waistline, opening)',
    netLength: 'longueur nette d\'un bord = longueur du tracé moins les jambes des pinces qu\'il porte',
    pairDiff: 'écart = longueur de a moins longueur de b (mm) ; pour une tête de manche, a = tête et l\'écart est l\'embu',
    pairWalk: 'a et b sont des listes de bords parcourus bout à bout ; un préfixe « ~ » parcourt le bord à l\'envers ; align = same : le début du parcours de a se coud au début du parcours de b ; opposite : à sa fin',
  },
  parts,
  pairs,
})

// ---------------------------------------------------------------- Teagan (T-shirt, issu de Brian)
const teaganBody = (part, label, neckTo, hemFrom, neckRole, foldPos) => ({
  part,
  panel: part.split('.')[1],
  label,
  cut: { mode: 'pli', quantity: 1, fabric: 'fabric' },
  grain: { axis: 'y', note: 'parallèle au pli' },
  targets: [{ edge: 'armhole', storeKey: `library.sleeve.${neckTo === 'cfNeck' ? 'front' : 'back'}ArmholeLength`, tolMm: 0.5 }],
  edges: [
    edge('hem', 'ourlet', 'hem', hemFrom, 'hem'),
    edge('side', 'côté', 'seam', 'hem', 'armhole', { via: ['waist'] }),
    edge('armhole', 'emmanchure', 'seam', 'armhole', 'shoulder', { via: ['armholeHollow'] }),
    edge('shoulder', 'épaule', 'seam', 'shoulder', 'neck'),
    edge('neckline', 'encolure', 'opening', 'neck', neckTo),
    edge('fold', 'pli', 'fold', neckTo, hemFrom, { position: foldPos }),
  ],
})
const teagan = base(
  'teagan',
  'Teagan (T-shirt, issu de Brian)',
  [
    teaganBody('teagan.front', 'Devant', 'cfNeck', 'cfHem', 'encolure', 'milieu devant'),
    teaganBody('teagan.back', 'Dos', 'cbNeck', 'cbHem', 'encolure', 'milieu dos'),
    {
      part: 'teagan.sleeve',
      panel: 'sleeve',
      label: 'Manche',
      cut: { mode: 'double', quantity: 2, fabric: 'fabric' },
      grain: { axis: 'y', note: 'du bas de manche vers le sommet de la tête' },
      edges: [
        edge('hem', 'ourlet', 'hem', 'hemLeft', 'hemRight'),
        edge('underarmRight', 'dessous de bras', 'seam', 'hemRight', 'bicepsRight'),
        edge('cap', 'tête de manche', 'seam', 'bicepsRight', 'bicepsLeft', { via: ['capQ1', 'capQ2', 'capQ3', 'capQ4'] }),
        edge('underarmLeft', 'dessous de bras', 'seam', 'bicepsLeft', 'hemLeft'),
      ],
      targets: [{ edge: 'cap', storeKey: 'library.sleeve.sleevecapLength', tolMm: 0.5 }],
    },
  ],
  [
    { id: 'cote', role: 'côté', label: 'Côté devant / dos', a: ['teagan.front#side'], b: ['teagan.back#side'], align: 'same' },
    { id: 'epaule', role: 'épaule', label: 'Épaule devant / dos', a: ['teagan.front#shoulder'], b: ['teagan.back#shoulder'], align: 'same' },
    {
      id: 'emmanchure',
      role: 'tête de manche',
      kind: 'embu',
      label: 'Tête de manche / emmanchures devant + dos',
      a: ['teagan.sleeve#cap'],
      b: ['teagan.front#armhole', '~teagan.back#armhole'],
      align: 'same',
      expected: { easeStoreKey: 'library.sleeve.sleevecapEase' },
    },
    { id: 'dessous-de-bras', role: 'dessous de bras', label: 'Dessous de bras (gauche / droite de la manche)', a: ['teagan.sleeve#underarmLeft'], b: ['teagan.sleeve#underarmRight'], align: 'opposite' },
  ],
  { garmentType: 'tshirt' },
)

// ---------------------------------------------------------------- Bella (corsage ajusté à pinces)
const bella = base(
  'bella',
  'Bella (corsage ajusté, pinces de taille et de poitrine)',
  [
    {
      part: 'bella.back',
      panel: 'back',
      label: 'Dos',
      cut: { mode: 'double', quantity: 2, fabric: 'fabric' },
      grain: { axis: 'y', note: 'parallèle au milieu dos' },
      note: 'store.cutlist annonce onFold:true avec cut:2 ; le milieu dos est une courbe (waistCenter.x > 0) donc une couture, pas un pli : la fiche fait foi',
      edges: [
        edge('centerBack', 'milieu dos', 'seam', 'cbNeck', 'waistCenter'),
        edge('hem', 'taille', 'waistline', 'waistCenter', 'waistSide', { darts: ['waist'] }),
        edge('side', 'côté', 'seam', 'waistSide', 'armhole'),
        edge('armhole', 'emmanchure', 'seam', 'armhole', 'shoulder', { via: ['armholePitch'] }),
        edge('shoulder', 'épaule', 'seam', 'shoulder', 'hps'),
        edge('neckline', 'encolure', 'opening', 'hps', 'cbNeck'),
      ],
      targets: [{ edge: 'armhole', storeKey: 'library.sleeve.backArmholeLength', tolMm: 0.5 }],
      darts: { waist: { host: 'hem', from: 'dartBottomLeft', apex: 'dartTip', to: 'dartBottomRight', optional: true, label: 'Pince de taille dos' } },
    },
    {
      part: 'bella.frontSideDart',
      panel: 'front',
      label: 'Devant',
      cut: { mode: 'pli', quantity: 1, fabric: 'fabric' },
      grain: { axis: 'y', note: 'parallèle au pli' },
      edges: [
        edge('hem', 'taille', 'waistline', 'cfHem', 'sideHem', { darts: ['waist'] }),
        edge('side', 'côté', 'seam', 'sideHem', 'armhole', { darts: ['bust'] }),
        edge('armhole', 'emmanchure', 'seam', 'armhole', 'shoulder', { via: ['armholePitch'] }),
        edge('shoulder', 'épaule', 'seam', 'shoulder', 'hps'),
        edge('neckline', 'encolure', 'opening', 'hps', 'cfNeck'),
        edge('fold', 'pli', 'fold', 'cfNeck', 'cfHem', { position: 'milieu devant' }),
      ],
      targets: [{ edge: 'armhole', storeKey: 'library.sleeve.frontArmholeLength', tolMm: 0.5 }],
      darts: {
        waist: { host: 'hem', from: 'waistDartLeft', apex: 'waistDartTip', to: 'waistDartRight', optional: true, label: 'Pince de taille devant' },
        bust: { host: 'side', from: 'bustDartBottom', apex: 'bustDartTip', to: 'bustDartTop', optional: false, label: 'Pince de poitrine (côté)' },
      },
    },
    {
      part: 'bella.sleeve',
      panel: 'sleeve',
      label: 'Manche',
      optionalPart: 'bellaSleeve',
      cut: { mode: 'double', quantity: 2, fabric: 'fabric' },
      grain: { axis: 'y', note: 'du poignet vers le sommet de la tête' },
      edges: [
        edge('underarmLeft', 'dessous de bras', 'seam', 'bicepsLeft', 'wristLeft'),
        edge('cuff', 'poignet', 'hem', 'wristLeft', 'wristRight'),
        edge('underarmRight', 'dessous de bras', 'seam', 'wristRight', 'bicepsRight'),
        edge('cap', 'tête de manche', 'seam', 'bicepsRight', 'bicepsLeft', { via: ['capQ1', 'capQ2', 'capQ3', 'capQ4'] }),
      ],
      targets: [{ edge: 'cap', storeKey: 'library.sleeve.sleevecapLength', tolMm: 0.5 }],
    },
  ],
  [
    { id: 'cote', role: 'côté', label: 'Côté dos / devant (hors pince de poitrine)', a: ['bella.back#side'], b: ['bella.frontSideDart#side'], align: 'same' },
    { id: 'epaule', role: 'épaule', label: 'Épaule dos / devant', a: ['bella.back#shoulder'], b: ['bella.frontSideDart#shoulder'], align: 'same' },
    {
      id: 'emmanchure',
      role: 'tête de manche',
      kind: 'embu',
      label: 'Tête de manche / emmanchures devant + dos',
      a: ['bella.sleeve#cap'],
      b: ['bella.frontSideDart#armhole', '~bella.back#armhole'],
      align: 'same',
      expected: { easeStoreKey: 'library.sleeve.sleevecapEase' },
    },
    { id: 'dessous-de-bras', role: 'dessous de bras', label: 'Dessous de bras (gauche / droite de la manche)', a: ['bella.sleeve#underarmLeft'], b: ['bella.sleeve#underarmRight'], align: 'opposite' },
    { id: 'milieu-dos', role: 'milieu dos', kind: 'miroir', label: 'Milieu dos (cousu à sa copie en miroir)', a: ['bella.back#centerBack'], b: ['bella.back#centerBack'], align: 'same' },
  ],
  { garmentType: 'bodice' },
)

// ---------------------------------------------------------------- Titan (pantalon, bloc de base)
const titan = base(
  'titan',
  'Titan (pantalon, bloc de base)',
  [
    {
      part: 'titan.back',
      panel: 'back',
      label: 'Dos (jambe)',
      cut: { mode: 'double', quantity: 2, fabric: 'fabric' },
      grain: { axis: 'y', note: 'parallèle au pli de jambe' },
      edges: [
        edge('inseam', 'entrejambe', 'seam', 'fork', 'floorIn', { via: ['kneeIn'] }),
        edge('hem', 'ourlet', 'hem', 'floorIn', 'floorOut'),
        edge('outseam', 'côté', 'seam', 'floorOut', 'styleWaistOut', { via: ['kneeOut', 'seatOut'] }),
        edge('waist', 'taille', 'waistline', 'styleWaistOut', 'styleWaistIn'),
        edge('rise', 'montant', 'seam', 'styleWaistIn', 'fork', { via: ['crossSeamCurveStart'] }),
      ],
      targets: [
        // le contour est abaissé de la hauteur de ceinture : on remplace le tronçon droit du montant par celui de la taille non abaissée
        { edge: 'rise', measurement: 'crossSeamBack', tolMm: 2, adjust: [{ minus: ['crossSeamCurveStart', 'styleWaistIn'] }, { plus: ['crossSeamCurveStart', 'waistIn'] }] },
        { edge: 'inseam', storeKey: 'inseamBack', tolMm: 1 },
      ],
    },
    {
      part: 'titan.front',
      panel: 'front',
      label: 'Devant (jambe)',
      cut: { mode: 'double', quantity: 2, fabric: 'fabric' },
      grain: { axis: 'y', note: 'parallèle au pli de jambe' },
      edges: [
        edge('outseam', 'côté', 'seam', 'styleWaistOut', 'floorOut', { via: ['seatOut', 'kneeOut'] }),
        edge('hem', 'ourlet', 'hem', 'floorOut', 'floorIn'),
        edge('inseam', 'entrejambe', 'seam', 'floorIn', 'fork', { via: ['kneeIn'] }),
        edge('rise', 'montant', 'seam', 'fork', 'styleWaistIn', { via: ['crotchSeamCurveStart'] }),
        edge('waist', 'taille', 'waistline', 'styleWaistIn', 'styleWaistOut'),
      ],
      targets: [{ edge: 'rise', measurement: 'crossSeamFront', tolMm: 2, adjust: [{ minus: ['crotchSeamCurveStart', 'styleWaistIn'] }, { plus: ['crotchSeamCurveStart', 'waistIn'] }] }],
    },
  ],
  [
    { id: 'cote', role: 'côté', label: 'Côté (couture extérieure) devant / dos', a: ['titan.front#outseam'], b: ['titan.back#outseam'], align: 'opposite' },
    { id: 'entrejambe', role: 'entrejambe', label: 'Entrejambe (couture intérieure) devant / dos', a: ['titan.front#inseam'], b: ['titan.back#inseam'], align: 'opposite' },
    { id: 'montant-dos', role: 'montant', kind: 'miroir', label: 'Montant dos (cousu à la jambe opposée)', a: ['titan.back#rise'], b: ['titan.back#rise'], align: 'same' },
    { id: 'montant-devant', role: 'montant', kind: 'miroir', label: 'Montant devant (cousu à la jambe opposée)', a: ['titan.front#rise'], b: ['titan.front#rise'], align: 'same' },
  ],
  { garmentType: 'trousers' },
)

mkdirSync('fiches', { recursive: true })
for (const f of [teagan, bella, titan]) writeFileSync(`fiches/${f.design}.json`, JSON.stringify(f, null, 2) + '\n')
console.log('fiches écrites :', [teagan, bella, titan].map((f) => f.design).join(', '))
