import type { CutPattern } from '@atelier/contracts-ts';

/** Pièces de coupe synthétiques : une pièce sur la pliure avec un cran double, une pièce entière. */
export const cutPattern: CutPattern = {
  unit: 'mm',
  engine: { name: 'manufacturing', version: '0.1.0' },
  specEngine: { name: 'patterning', version: '0.1.0' },
  garment: { type: 'straight-skirt' },
  pieces: [
    {
      panelId: 'front',
      name: 'Devant',
      quantity: 1,
      cutOnFold: true,
      cutLine: [
        [0, -30],
        [260, -30],
        [190, 610],
        [0, 610],
      ],
      seamLine: [
        {
          edgeId: 'hem',
          role: 'hem',
          allowanceMm: 30,
          points: [
            [0, 0],
            [250, 0],
          ],
        },
        {
          edgeId: 'side',
          role: 'seam',
          allowanceMm: 10,
          points: [
            [250, 0],
            [180, 600],
          ],
        },
        {
          edgeId: 'fold',
          role: 'fold',
          allowanceMm: 0,
          points: [
            [180, 600],
            [0, 0],
          ],
        },
      ],
      notches: [
        {
          edgeId: 'side',
          distanceMm: 300,
          count: 2,
          position: [215, 300],
          segments: [
            [
              [220, 300],
              [210, 300],
            ],
            [
              [221, 310],
              [211, 310],
            ],
          ],
        },
      ],
      grainline: [
        [100, 100],
        [100, 500],
      ],
      foldLine: [
        [0, 600],
        [0, 0],
      ],
      labelAnchor: [100, 300],
      bounds: { min: [0, -30], max: [260, 610] },
      cutAreaMm2: 100000,
    },
    {
      panelId: 'back',
      name: 'Dos',
      quantity: 2,
      cutOnFold: false,
      cutLine: [
        [0, 0],
        [200, 0],
        [100, 400],
      ],
      seamLine: [
        {
          edgeId: 'a',
          role: 'seam',
          allowanceMm: 10,
          points: [
            [0, 0],
            [200, 0],
          ],
        },
        {
          edgeId: 'b',
          role: 'seam',
          allowanceMm: 10,
          points: [
            [200, 0],
            [100, 400],
          ],
        },
        {
          edgeId: 'c',
          role: 'seam',
          allowanceMm: 10,
          points: [
            [100, 400],
            [0, 0],
          ],
        },
      ],
      notches: [],
      grainline: [
        [100, 50],
        [100, 300],
      ],
      labelAnchor: [100, 150],
      bounds: { min: [0, 0], max: [200, 400] },
      cutAreaMm2: 40000,
    },
  ],
};
