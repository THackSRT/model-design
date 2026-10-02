import { buildBodyGrid, type BodyGrid } from './body-grid.js';
import {
  collideCloth,
  createCollisionScratch,
  maxPenetration,
  type CollisionScratch,
} from './collision.js';
import {
  createLambdas,
  resetLambdas,
  solveBending,
  solveStitches,
  solveStretch,
  type Lambdas,
} from './constraints.js';
import {
  CAPTURE_RANGE_MM,
  ANCHORED_DAMPING_PER_S,
  CONTACT_MARGIN_MM,
  DAMPING_PER_S,
  GRAVITY_MM_PER_S2,
  REST_STEPS,
  SEWING_FINAL_RATIO,
  SEWING_GRAVITY_SCALE,
  SEWING_SOFTNESS_START,
} from './constants.js';
import { dampNonRigid } from './damping.js';
import { toXpbdParams } from './fabric.js';
import { buildClothModel, type ClothModel } from './topology.js';
import { validateBody, validateCloth, validateSettings } from './validate.js';
import type {
  BodyMesh,
  ClothMesh,
  FabricPhysics,
  SimulationResult,
  SimulationSettings,
} from './types.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;
const u = (a: Uint32Array, i: number): number => a[i] as number;

interface Context {
  model: ClothModel;
  lambdas: Lambdas;
  grid: BodyGrid | null;
  scratch: CollisionScratch;
  x: Float64Array;
  v: Float64Array;
  prev: Float64Array;
  dtS: number;
  iterations: number;
  anchored: boolean;
  offsetMm: number;
  friction: number;
}

/** Intégration explicite : gravité, puis positions prédites (sommets fixes immobiles). */
function predict(c: Context, gravityScale: number): void {
  const { x, v, prev, model, dtS } = c;
  prev.set(x);
  for (let i = 0; i < model.vertexCount; i++) {
    if (f(model.invMass, i) <= 0) continue;
    v[3 * i + 1] = f(v, 3 * i + 1) - GRAVITY_MM_PER_S2 * gravityScale * dtS;
    for (let k = 0; k < 3; k++) x[3 * i + k] = f(x, 3 * i + k) + f(v, 3 * i + k) * dtS;
  }
}

/** Vitesses déduites du déplacement ; rend la vitesse maximale (mm/s). */
function updateVelocities(c: Context): number {
  const { x, v, prev, model, dtS } = c;
  let fastest = 0;
  for (let i = 0; i < model.vertexCount; i++) {
    if (f(model.invMass, i) <= 0) continue;
    let s2 = 0;
    for (let k = 0; k < 3; k++) {
      const d = (f(x, 3 * i + k) - f(prev, 3 * i + k)) / dtS;
      v[3 * i + k] = d;
      s2 += d * d;
    }
    fastest = Math.max(fastest, s2);
  }
  return Math.sqrt(fastest);
}

function dampWorld(c: Context, factor: number): void {
  for (let i = 0; i < c.model.vertexCount; i++) {
    if (f(c.model.invMass, i) <= 0) continue;
    for (let k = 0; k < 3; k++) c.v[3 * i + k] = f(c.v, 3 * i + k) * (1 - factor);
  }
}

function substep(c: Context, gravityScale: number, stitchCompliance: number): number {
  const invDt2 = 1 / (c.dtS * c.dtS);
  predict(c, gravityScale);
  resetLambdas(c.lambdas);
  const soft = { compliance: stitchCompliance, invDt2 };
  for (let it = 0; it < c.iterations; it++) {
    solveStretch(c.model, c.x, invDt2, c.lambdas.stretch);
    solveBending(c.model, c.x, invDt2, c.lambdas.bending);
    solveStitches(c.model, c.x, soft, c.lambdas.stitches); // en dernier : la couture se ferme
  }
  let touching = false;
  if (c.grid) {
    const contact = { offsetMm: c.offsetMm, friction: c.friction };
    touching =
      collideCloth(c.grid, { x: c.x, prev: c.prev }, c.model.invMass, {
        scratch: c.scratch,
        contact,
      }) > 0;
  }
  const speed = updateVelocities(c);
  const { x, v, model } = c;
  dampNonRigid(
    { x, v, mass: model.mass, invMass: model.invMass },
    Math.min(1, DAMPING_PER_S * c.dtS),
  );
  // Tissu retenu (sommets fixes ou contact) : dissipation de l'oscillation d'ensemble, que l'amortissement des
  // modes non rigides ne voit pas. En vol libre rien n'est dissipé : la chute reste ½·g·t².
  if (c.anchored || touching) dampWorld(c, Math.min(1, ANCHORED_DAMPING_PER_S * c.dtS));
  return speed;
}

/** Souplesse des coutures : décroît de SEWING_SOFTNESS_START fois celle d'une arête à SEWING_FINAL_RATIO fois. */
function stitchCompliance(model: ClothModel, progress: number): number {
  const left = Math.max(0, 1 - progress);
  return model.meanEdgeCompliance * (SEWING_FINAL_RATIO + SEWING_SOFTNESS_START * left * left);
}

function maxStitchGap(model: ClothModel, x: Float64Array): number {
  let gap = 0;
  for (let s = 0; s < model.stitches.length / 2; s++) {
    const a = u(model.stitches, 2 * s);
    const b = u(model.stitches, 2 * s + 1);
    const dx = f(x, 3 * a) - f(x, 3 * b);
    const dy = f(x, 3 * a + 1) - f(x, 3 * b + 1);
    const dz = f(x, 3 * a + 2) - f(x, 3 * b + 2);
    gap = Math.max(gap, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  return gap;
}

function createContext(
  cloth: ClothMesh,
  body: BodyMesh,
  fabric: FabricPhysics,
  settings: SimulationSettings,
): Context {
  const params = toXpbdParams(fabric);
  const offsetMm = params.thicknessMm + CONTACT_MARGIN_MM;
  const hasBody = body.triangles.length >= 3;
  const model = buildClothModel(cloth, params);
  return {
    model,
    lambdas: createLambdas(model),
    grid: hasBody ? buildBodyGrid(body, offsetMm + CAPTURE_RANGE_MM) : null,
    scratch: createCollisionScratch(cloth.positionsMm.length / 3),
    x: Float64Array.from(cloth.positionsMm),
    v: new Float64Array(cloth.positionsMm.length),
    prev: new Float64Array(cloth.positionsMm.length),
    dtS: settings.stepS / settings.substeps,
    iterations: settings.iterations ?? 1,
    anchored: (cloth.pinned?.length ?? 0) > 0,
    offsetMm,
    friction: params.frictionCoefficient,
  };
}

/** Un pas (plusieurs sous-pas) ; rend la vitesse maximale du dernier sous-pas. */
function runStep(c: Context, step: number, settings: SimulationSettings): number {
  const sewing = step < settings.sewingSteps;
  let speed = 0;
  for (let s = 0; s < settings.substeps; s++) {
    const progress = sewing ? (step + s / settings.substeps) / settings.sewingSteps : 1;
    speed = substep(c, sewing ? SEWING_GRAVITY_SCALE : 1, stitchCompliance(c.model, progress));
  }
  return speed;
}

/**
 * Fait tomber le tissu sur le corps (XPBD à petits pas, Macklin et al. 2016 et 2019). Axe Y vers le haut.
 * Déterministe : même entrée, même sortie au bit près. S'arrête au bout de `maxSteps` pas, ou quand la vitesse
 * maximale reste sous `restSpeedMmPerS` pendant 10 pas consécutifs après la couture.
 */
export function simulate(
  cloth: ClothMesh,
  body: BodyMesh,
  fabric: FabricPhysics,
  settings: SimulationSettings,
): SimulationResult {
  validateCloth(cloth);
  validateBody(body);
  validateSettings(settings);
  const c = createContext(cloth, body, fabric, settings);
  let steps = 0;
  let calm = 0;
  while (steps < settings.maxSteps && calm < REST_STEPS) {
    const speed = runStep(c, steps, settings);
    calm = steps >= settings.sewingSteps && speed < settings.restSpeedMmPerS ? calm + 1 : 0;
    steps++;
  }
  return {
    positionsMm: c.x,
    steps,
    converged: calm >= REST_STEPS,
    maxStitchGapMm: maxStitchGap(c.model, c.x),
    maxPenetrationMm: c.grid ? maxPenetration(c.grid, c.x, c.scratch) : 0,
  };
}
