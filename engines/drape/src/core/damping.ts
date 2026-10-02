// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;

/** Centre de masse, vitesse du centre de masse : out[0..2], out[3..5]. */
function centerOfMass(
  x: Float64Array,
  v: Float64Array,
  mass: Float64Array,
  out: Float64Array,
): void {
  let total = 0;
  out.fill(0);
  for (let i = 0; i < mass.length; i++) {
    const m = f(mass, i);
    total += m;
    for (let k = 0; k < 3; k++) {
      out[k] = f(out, k) + m * f(x, 3 * i + k);
      out[3 + k] = f(out, 3 + k) + m * f(v, 3 * i + k);
    }
  }
  for (let k = 0; k < 6; k++) out[k] = total > 0 ? f(out, k) / total : 0;
}

/** Résout I·ω = L (I symétrique : xx, yy, zz, xy, xz, yz) par les cofacteurs ; ω nul si I est singulière. */
function solveInertia(i6: number[], l: number[], omega: Float64Array): void {
  const [xx, yy, zz, xy, xz, yz] = i6 as [number, number, number, number, number, number];
  const c0 = yy * zz - yz * yz;
  const c1 = xz * yz - xy * zz;
  const c2 = xy * yz - xz * yy;
  const det = xx * c0 + xy * c1 + xz * c2;
  const trace = xx + yy + zz;
  if (!(det > 1e-12 * trace * trace * trace)) {
    omega.fill(0);
    return;
  }
  const [lx, ly, lz] = l as [number, number, number];
  omega[0] = (c0 * lx + c1 * ly + c2 * lz) / det;
  omega[1] = (c1 * lx + (xx * zz - xz * xz) * ly + (xy * xz - xx * yz) * lz) / det;
  omega[2] = (c2 * lx + (xy * xz - xx * yz) * ly + (xx * yy - xy * xy) * lz) / det;
}

/** Vitesse angulaire du mouvement rigide : rigid[6..8], d'après le moment cinétique et l'inertie. */
function angularVelocity(
  x: Float64Array,
  v: Float64Array,
  mass: Float64Array,
  rigid: Float64Array,
): void {
  const l = [0, 0, 0];
  const inertia = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < mass.length; i++) {
    const m = f(mass, i);
    const rx = f(x, 3 * i) - f(rigid, 0);
    const ry = f(x, 3 * i + 1) - f(rigid, 1);
    const rz = f(x, 3 * i + 2) - f(rigid, 2);
    const wx = f(v, 3 * i) - f(rigid, 3);
    const wy = f(v, 3 * i + 1) - f(rigid, 4);
    const wz = f(v, 3 * i + 2) - f(rigid, 5);
    l[0] = (l[0] as number) + m * (ry * wz - rz * wy);
    l[1] = (l[1] as number) + m * (rz * wx - rx * wz);
    l[2] = (l[2] as number) + m * (rx * wy - ry * wx);
    const sq = rx * rx + ry * ry + rz * rz;
    inertia[0] = (inertia[0] as number) + m * (sq - rx * rx);
    inertia[1] = (inertia[1] as number) + m * (sq - ry * ry);
    inertia[2] = (inertia[2] as number) + m * (sq - rz * rz);
    inertia[3] = (inertia[3] as number) - m * rx * ry;
    inertia[4] = (inertia[4] as number) - m * rx * rz;
    inertia[5] = (inertia[5] as number) - m * ry * rz;
  }
  solveInertia(inertia, l, rigid.subarray(6, 9));
}

export interface DampingState {
  x: Float64Array;
  v: Float64Array;
  /** Masses réelles (les sommets fixes y comptent, à vitesse nulle). */
  mass: Float64Array;
  invMass: Float64Array;
}

/**
 * Amortit les modes non rigides (Müller et al., PBD) : chaque vitesse tend vers celle du mouvement rigide
 * d'ensemble (translation + rotation) avec la fraction `factor` (0 à 1). Une chute libre n'est pas freinée ;
 * un tissu retenu par des sommets fixes l'est, car ceux-ci immobilisent le mouvement d'ensemble.
 */
export function dampNonRigid(s: DampingState, factor: number): void {
  const { x, v, mass, invMass } = s;
  const rigid = new Float64Array(9);
  centerOfMass(x, v, mass, rigid);
  angularVelocity(x, v, mass, rigid);
  const [wx, wy, wz] = [f(rigid, 6), f(rigid, 7), f(rigid, 8)];
  for (let i = 0; i < invMass.length; i++) {
    if (f(invMass, i) <= 0) continue;
    const rx = f(x, 3 * i) - f(rigid, 0);
    const ry = f(x, 3 * i + 1) - f(rigid, 1);
    const rz = f(x, 3 * i + 2) - f(rigid, 2);
    v[3 * i] = f(v, 3 * i) + factor * (f(rigid, 3) + wy * rz - wz * ry - f(v, 3 * i));
    v[3 * i + 1] = f(v, 3 * i + 1) + factor * (f(rigid, 4) + wz * rx - wx * rz - f(v, 3 * i + 1));
    v[3 * i + 2] = f(v, 3 * i + 2) + factor * (f(rigid, 5) + wx * ry - wy * rx - f(v, 3 * i + 2));
  }
}
