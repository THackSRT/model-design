/**
 * Porte-à-faux pesant (élastique d'Euler) : D·θ'' = −W·(L − s)·cos θ, θ(0) = 0, θ'(L) = 0, θ compté vers le bas.
 * Unités réduites : D/W = 1, donc la longueur de flexion c = (D/W)^(1/3) vaut 1.
 */
function integrate(lengthOverC: number, slope0: number): { angle: number; slopeEnd: number } {
  const steps = 1000;
  const h = lengthOverC / steps;
  let angle = 0;
  let slope = slope0;
  for (let i = 0; i < steps; i++) {
    const rest = lengthOverC - i * h;
    const midSlope = slope - 0.5 * h * rest * Math.cos(angle);
    const midAngle = angle + 0.5 * h * slope;
    slope -= h * (rest - 0.5 * h) * Math.cos(midAngle);
    angle += h * midSlope;
  }
  return { angle, slopeEnd: slope };
}

/** Angle de la pointe (rad) d'un porte-à-faux de longueur l/c (tir sur la courbure à l'encastrement). */
export function tipAngle(lengthOverC: number): number {
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (integrate(lengthOverC, mid).slopeEnd > 0) hi = mid;
    else lo = mid;
  }
  return integrate(lengthOverC, (lo + hi) / 2).angle;
}

/** Longueur de flexion c / l déduite de l'angle de la pointe (inverse de `tipAngle`, par dichotomie). */
export function bendingLengthOverOverhang(angle: number): number {
  let lo = 0.05;
  let hi = 6;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (tipAngle(mid) < angle) lo = mid;
    else hi = mid;
  }
  return 1 / ((lo + hi) / 2);
}
