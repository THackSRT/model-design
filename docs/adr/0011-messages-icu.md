# 0011 — Messages ICU : `intl-messageformat` (FormatJS)

**Contexte.** Le studio traduisait ses textes avec un `t()` minimal (remplacement de `{nom}`), sans pluriel, sans
sélection (genre) ni formatage des nombres et des unités. Les directives du front (`docs/directives/front-end.md`)
annoncent une bibliothèque ICU. Il faut une bibliothèque légère, maintenue, sous licence permise.

**Décision.** Utiliser `intl-messageformat` en version `^12.1.2` (FormatJS), dans `@atelier/studio` seulement.
Licence : **BSD-3-Clause** (permise) ; dépendances transitives `@formatjs/icu-messageformat-parser` et
`@formatjs/fast-memoize` : MIT. Elle s'appuie sur `Intl.PluralRules` et `Intl.NumberFormat` du navigateur : pas de
données de langue embarquées (environ 117 kB décompressés pour le paquet, le reste vient du navigateur).
`@messageformat/core` (MIT) a été écarté : plus lourd (générateur de code, données `make-plural`) pour un besoin
que le moteur `Intl` couvre déjà. Les messages de `src/i18n/fr.ts` sont au format ICU MessageFormat ; `t(key, values?)`
reste l'unique point d'entrée, typé par `keyof typeof fr` : une clé inconnue est une erreur de TypeScript.

**Conséquences.** Les pluriels s'écrivent `{count, plural, =0 {…} one {# pièce} other {# pièces}}`, les genres
`{sex, select, …}`, les longueurs `{valueMm, number, ::unit/millimeter}` (français : espace fine insécable
U+202F des milliers, virgule décimale). Frontière : `packages/features` ne connaît ni messages ni langue (il rend
des données et des clés) ; `apps/studio/src/i18n/` porte le catalogue, la langue (`fr-FR`) et le formatage. Une
apostrophe droite est un caractère de citation en ICU : le catalogue utilise l'apostrophe typographique `’`. Une
nouvelle langue ajoute un catalogue de mêmes clés. Un changement de bibliothèque passe par une nouvelle ADR.
