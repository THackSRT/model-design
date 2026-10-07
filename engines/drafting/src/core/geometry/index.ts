// Géométrie plane pure : polylignes et polygones en millimètres, y vers le bas (repère de FreeSewing). Publiée par
// l'entrée `@atelier/drafting/geometry` (src/geometry.ts) pour `cutting` et `flats` (ADR 0024). Feuille : aucun
// paquet, aucun fichier de `drafting` hors de ce dossier (test/geometry/entry.test.ts).
//
// Fonctions pures, sans état, qui ne modifient pas leurs entrées ; `+ − × ÷` et `Math.sqrt` seulement, donc le même
// résultat dans tous les moteurs JavaScript. Les coordonnées doivent être finies : à l'appelant de les contrôler.
//
// Reprise de docs/suivi/essais/tuniques/geom.mjs et de `offsetVar` (cut.mjs). Nom de l'essai → nom d'ici :
//   pt → point ; add, sub, mul → addPoints, subtractPoints, scalePoint ; dist → distanceMm ; lerp → lerpPoint ;
//   norm → normalize ; perp → rightNormal ; mirror, mirrorAll → mirrorPoint, mirrorPoints ; rev → reversePoints ;
//   cubic → sampleCubic ; smooth → smoothCatmullRom ; flattenOps → flattenPath ; length → polylineLengthMm ;
//   pointAt, tangentAt → les mêmes ; slice → slicePolyline ; resample → resamplePolyline ; offset → offsetPolyline ;
//   signedArea → signedAreaMm2 ; insetMiter → insetPolygonMiter ; inset → insetPolygon ; offsetVar →
//   outsetPolygonPerEdge ; segIntersect → intersectSegments ; crossings → polygonCrossings ; splitPolygon → le même ;
//   dedupe → dedupePoints ; pointInPolygon → isPointInPolygon ; bbox → boundingBox ; xAtY → boundaryXMm ;
//   arcOf et onBoundary → nearestPointOnPolyline. `f` et `d` (formats SVG) restent à `flats`.
// Écarts voulus avec l'essai :
//   - polyligne vide, pas ou nombre de segments invalide, valeurs de couture en mauvais nombre : GeometryError (l'essai
//     rendait undefined ou NaN, ou plantait) ; découpe sans croisement : GeometryError de code `no-crossing` ;
//   - insetPolygon rend le point i pour le sommet i (l'essai commençait au sommet 1) ;
//   - slicePolyline ne répète pas le dernier point quand la fin dépasse la longueur ; resamplePolyline rend exactement
//     le dernier point ; mirrorPoint ne rend jamais −0 ;
//   - sampleCubic prend la courbe en un objet (CubicMm) : cinq paramètres dépasseraient la limite du lint ;
//   - « rien » est undefined, non null ; la boîte englobante s'écrit minXMm… et non x0… ; les croisements portent
//     cutPosition, edgeIndex, edgePosition et point (s, edge, u et p dans l'essai) ;
//   - un segment nul n'ajoute rien à l'abscisse de nearestPointOnPolyline (l'essai y ajoutait 1 nm) ;
//   - Math.sqrt au lieu de Math.hypot : écarts de l'ordre de 1e-12 mm.
export type {
  BoundingBoxMm,
  CloseOpMm,
  Crossing,
  CubicMm,
  CurveOpMm,
  LineOpMm,
  MoveOpMm,
  NearestPoint,
  PathOpMm,
  PointMm,
  PolygonMm,
  PolygonSplit,
  PolylineMm,
  SegmentIntersection,
} from './types.js';
export { GeometryError } from './errors.js';
export type { GeometryErrorCode } from './errors.js';
export {
  addPoints,
  crossProduct,
  distanceMm,
  dotProduct,
  leftNormal,
  lerpPoint,
  mirrorPoint,
  mirrorPoints,
  normalize,
  point,
  rightNormal,
  scalePoint,
  subtractPoints,
} from './vector.js';
export {
  nearestPointOnPolyline,
  pointAt,
  polylineLengthMm,
  resamplePolyline,
  reversePoints,
  slicePolyline,
  tangentAt,
} from './polyline.js';
export { DEDUPE_TOLERANCE_MM, boundingBox, dedupePoints } from './point-set.js';
export {
  DEFAULT_CURVE_SEGMENTS,
  DEFAULT_SMOOTH_SEGMENTS,
  flattenPath,
  sampleCubic,
  smoothCatmullRom,
} from './bezier.js';
export { boundaryXMm, isPointInPolygon, signedAreaMm2 } from './polygon.js';
export { insetPolygon, insetPolygonMiter, offsetPolyline } from './offset.js';
export { outsetPolygonPerEdge } from './allowance.js';
export { intersectSegments, polygonCrossings } from './intersect.js';
export { splitPolygon } from './split.js';
