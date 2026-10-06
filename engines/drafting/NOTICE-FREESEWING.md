# Avis de licence : FreeSewing

`@atelier/drafting` trace les patrons avec FreeSewing 4.10.2 (ADR 0019). FreeSewing est publié sous licence MIT, qui
demande que son avis de copyright et son texte accompagnent toute copie substantielle : ce fichier est livré avec le
moteur (`files` de `package.json`) et avec tout paquet qui l'embarque, studio compris.

Les paquets `@freesewing/*` publiés sur npm ne contiennent pas de fichier de licence. Ils déclarent
`"license": "MIT"` et `"author": "Joost De Cock <joost@joost.at> (https://codeberg.org/joostdecock)"` dans leur
`package.json`, et leur `README.md` annonce « License: MIT » et « © Joost De Cock », en renvoyant au fichier de licence
du dépôt du projet (https://codeberg.org/freesewing/freesewing). Le copyright et le texte ci-dessous sont ceux qu'ils
déclarent. Les modèles restent attribués à leurs auteurs : Brian, conception et code de Joost De Cock (`about.json` du
paquet `@freesewing/brian`).

## Paquets concernés

Tous en version 4.10.2, licence MIT : `@freesewing/core`, `@freesewing/brian`, `@freesewing/library`,
`@freesewing/models`, `@freesewing/config`, `@freesewing/core-plugins`, `@freesewing/plugin-annotations`,
`@freesewing/plugin-bin-pack`, `@freesewing/plugin-bust`, `@freesewing/plugin-measurements`,
`@freesewing/plugin-mirror`, `@freesewing/plugin-round`, `@freesewing/plugin-sprinkle` et
`@freesewing/plugin-transform`.

## Licence MIT de FreeSewing

Copyright (c) Joost De Cock

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Dépendances de FreeSewing

`@freesewing/core` s'appuie sur des paquets sous licence MIT déclarée, qui portent chacun leurs mentions
(`package.json`, README ou fichier `LICENSE`) :

| Paquet             | Version | Auteur déclaré    |
| ------------------ | ------- | ----------------- |
| `bezier-js`        | 6.1.4   | Pomax             |
| `hooks`            | 0.3.2   | Brian Noguchi     |
| `lodash.get`       | 4.4.2   | John-David Dalton |
| `lodash.set`       | 4.3.2   | John-David Dalton |
| `lodash.unset`     | 4.5.2   | John-David Dalton |
| `lodash.clonedeep` | 4.5.0   | John-David Dalton |
