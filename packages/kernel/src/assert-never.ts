/** Rend un `switch` exhaustif : le compilateur refuse un cas oublié. */
export function assertNever(value: never): never {
  throw new Error(`Cas non traité : ${JSON.stringify(value)}`);
}
