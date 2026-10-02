import type { GarmentMesh } from '../mesh/garment-mesh.js';
import type { Instance } from './instances.js';
import type { PieceField } from './piece-field.js';

// Tour fini d'un vêtement à une hauteur : somme des largeurs des exemplaires du même tube (tronc, ou une jambe, ou
// un bras). Sert à élargir la courbe d'enroulement d'une pièce évasée (jupe cercle) pour que les exemplaires
// tiennent côte à côte sans se chevaucher au départ. Tronc et jambes : la largeur d'un exemplaire est la longueur de
// son isoligne (`PieceField`, pinces et creux exclus). Bras : l'étendue en x de son contour à la hauteur.

/** Un tube : le tronc pour toutes les pièces du tronc, sinon la zone et le côté. */
export function tubeKey(inst: Instance): string {
  return inst.zone === 'torso' ? 'torso' : `${inst.zone}:${inst.side}`;
}

/** Contour d'un exemplaire dans le repère du patron (x sans le décalage de pose), ordre des sommets du maillage. */
interface Contour {
  xs: Float64Array;
  ys: Float64Array;
}

function contourOf(mesh: GarmentMesh, inst: Instance): Contour {
  const { vertexStart, vertexCount, shiftXMm } = inst.piece;
  let n = 0;
  while (n < vertexCount && (mesh.vertexEdge[vertexStart + n] as number) >= 0) n++;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = (mesh.cloth.flatMm[2 * (vertexStart + i)] as number) - shiftXMm;
    ys[i] = mesh.cloth.flatMm[2 * (vertexStart + i) + 1] as number;
  }
  return { xs, ys };
}

/** Étendue en x du contour à l'ordonnée y ; 0 si le contour ne la traverse pas. */
function widthAt(c: Contour, y: number): number {
  let lo = Infinity;
  let hi = -Infinity;
  const n = c.xs.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [y0, y1] = [c.ys[i] as number, c.ys[j] as number];
    const [x0, x1] = [c.xs[i] as number, c.xs[j] as number];
    if (y < Math.min(y0, y1) || y > Math.max(y0, y1)) continue;
    const x = y1 === y0 ? [x0, x1] : [x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)];
    for (const v of x) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  return hi >= lo ? hi - lo : 0;
}

/** Tour fini (mm) du tube de `inst` à la hauteur `inst.heightMm + up` (up : mm au-dessus du niveau d'ancrage). */
export type CircumferenceAt = (inst: Instance, up: number) => number;

/** Écart de part et d'autre de la hauteur où se mesure le tour d'une pièce à isolignes, mm. */
const SIDE_MM = 1;

/**
 * Tour fini du tube à la hauteur `height`. Pièces à isolignes : somme des longueurs des isolignes ; à la jonction
 * de deux pièces superposées bout à bout (jupe et ceinture) chacune compte à son bord, d'où le maximum entre juste
 * au-dessus et juste au-dessous (un bord libre garde ainsi sa pleine longueur).
 */
function tubeTotal(
  members: readonly { inst: Instance; contour: Contour }[],
  height: number,
  fields: ReadonlyMap<Instance, PieceField>,
): number {
  let above = 0;
  let below = 0;
  for (const t of members) {
    const up = height - t.inst.heightMm;
    const field = fields.get(t.inst);
    if (field) {
      above += field.fullLength(-(up + SIDE_MM));
      below += field.fullLength(-(up - SIDE_MM));
    } else {
      const w = widthAt(t.contour, t.inst.anchorV + up);
      above += w;
      below += w;
    }
  }
  return Math.max(above, below);
}

export function circumferences(
  mesh: GarmentMesh,
  instances: readonly Instance[],
  fields: ReadonlyMap<Instance, PieceField>,
): CircumferenceAt {
  const tubes = new Map<string, { inst: Instance; contour: Contour }[]>();
  for (const inst of instances) {
    const list = tubes.get(tubeKey(inst)) ?? [];
    list.push({ inst, contour: contourOf(mesh, inst) });
    tubes.set(tubeKey(inst), list);
  }
  const memo = new Map<string, number>();
  return (inst, up) => {
    const height = inst.heightMm + up;
    const key = `${tubeKey(inst)}|${Math.round(height)}`;
    const known = memo.get(key);
    if (known !== undefined) return known;
    const total = tubeTotal(tubes.get(tubeKey(inst)) ?? [], Math.round(height), fields);
    memo.set(key, total);
    return total;
  };
}
