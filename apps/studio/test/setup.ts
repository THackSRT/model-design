import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest tourne sans globales : on démonte explicitement chaque rendu après son test.
afterEach(cleanup);

// La vue 3D et le banc d'essai sont chargés à la demande (React.lazy) : sous la charge de `pnpm check`, où nx
// lance plusieurs projets en parallèle, l'attente par défaut de 1 s des `findBy…` ne suffit pas toujours.
configure({ asyncUtilTimeout: 5000 });
