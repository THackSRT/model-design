/**
 * Point du plan, en millimètres. Repère de FreeSewing : x vers la droite, y vers le bas. Même forme que `PointMm` de
 * l'entrée `.` : les deux types sont interchangeables, mais cette entrée-ci ne dépend d'aucun autre fichier.
 */
export interface PointMm {
  readonly xMm: number;
  readonly yMm: number;
}

/** Suite ouverte de points reliés dans l'ordre. L'abscisse curviligne d'un point est la longueur parcourue depuis le premier. */
export type PolylineMm = readonly PointMm[];

/** Contour fermé : le dernier point se relie au premier, qui n'est pas répété à la fin. */
export type PolygonMm = readonly PointMm[];

/** Boîte englobante, côtés parallèles aux axes. */
export interface BoundingBoxMm {
  readonly minXMm: number;
  readonly minYMm: number;
  readonly maxXMm: number;
  readonly maxYMm: number;
}

/** Intersection de deux segments `[a, b]` et `[c, d]`. */
export interface SegmentIntersection {
  /** Position sur le premier segment : 0 en `a`, 1 en `b`. */
  readonly t: number;
  /** Position sur le second segment : 0 en `c`, 1 en `d`. */
  readonly u: number;
  readonly point: PointMm;
}

/** Croisement d'une polyligne de découpe avec le contour d'un polygone. */
export interface Crossing {
  /** Place sur la découpe : indice du segment croisé, plus la position (0 à 1) sur ce segment. */
  readonly cutPosition: number;
  /** Arête du polygone croisée : l'arête `j` va du point `j` au point `j + 1` (le dernier se relie au premier). */
  readonly edgeIndex: number;
  /** Position sur cette arête : 0 au point `j`, 1 au point `j + 1`. */
  readonly edgePosition: number;
  readonly point: PointMm;
}

/** Résultat de la découpe d'un polygone par une polyligne. */
export interface PolygonSplit {
  /** Morceau qui suit le contour du premier au dernier croisement, puis revient par la découpe. */
  readonly a: PointMm[];
  /** Autre morceau : du dernier croisement au premier, puis par la découpe. */
  readonly b: PointMm[];
  /** Ligne de couture : la portion de la découpe entre le premier et le dernier croisement. */
  readonly seam: PointMm[];
}

/** Point d'une polyligne le plus proche d'un point donné. */
export interface NearestPoint {
  readonly point: PointMm;
  /** Distance du point donné au point trouvé. */
  readonly distanceMm: number;
  /** Abscisse curviligne du point trouvé, depuis le premier point de la polyligne. */
  readonly lengthMm: number;
}

/** Courbe de Bézier cubique : point de départ, deux points de contrôle, point d'arrivée. */
export interface CubicMm {
  readonly from: PointMm;
  readonly cp1: PointMm;
  readonly cp2: PointMm;
  readonly to: PointMm;
}

/** Déplacement du crayon vers `to` : début d'un tracé. */
export interface MoveOpMm {
  readonly type: 'move';
  readonly to: PointMm;
}

/** Ligne droite jusqu'à `to`. */
export interface LineOpMm {
  readonly type: 'line';
  readonly to: PointMm;
}

/** Courbe de Bézier cubique jusqu'à `to`, de points de contrôle `cp1` et `cp2`. */
export interface CurveOpMm {
  readonly type: 'curve';
  readonly cp1: PointMm;
  readonly cp2: PointMm;
  readonly to: PointMm;
}

/** Fermeture du tracé. */
export interface CloseOpMm {
  readonly type: 'close';
}

/** Opération d'un tracé, comme FreeSewing les décrit (mêmes formes que les opérations de l'entrée `.`). */
export type PathOpMm = MoveOpMm | LineOpMm | CurveOpMm | CloseOpMm;
