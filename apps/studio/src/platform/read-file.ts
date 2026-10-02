/**
 * Lit le texte d'un fichier choisi par l'utilisateur, sans en lire plus de `maxBytes` octets : un fichier plus
 * long donne un texte qui dépasse `maxBytes`, et l'appelant le refuse (fichier non fiable).
 */
export function readFileText(file: File, maxBytes: number): Promise<string> {
  return file.slice(0, maxBytes + 1).text();
}
