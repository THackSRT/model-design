import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest tourne sans globales : on démonte explicitement chaque rendu après son test.
afterEach(cleanup);
