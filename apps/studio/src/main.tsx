import '@atelier/design-tokens/tokens.css';
import '@atelier/ui-web/ui.css';
import './app.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PatternStudioScreen } from './screens/pattern-studio/screen.js';

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root absent de index.html');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <PatternStudioScreen />
    </QueryClientProvider>
  </StrictMode>,
);
