import { Tabs } from '@atelier/ui-web';
import { Suspense, useEffect, useState } from 'react';
import { t } from './i18n/t.js';
import { LazyFabricBench } from './screens/fabric-bench/lazy-fabric-bench.js';
import { PatternStudioScreen } from './screens/pattern-studio/screen.js';

export type AppTab = 'pattern' | 'fabrics';

const FABRICS_HASH = '#tissus';

/** Onglet désigné par le fragment d'adresse : `#tissus` ouvre les tissus, tout le reste le patron. */
export const tabFromHash = (hash: string): AppTab =>
  hash === FABRICS_HASH ? 'fabrics' : 'pattern';

function reflectInHash(tab: AppTab): void {
  const { pathname, search } = window.location;
  window.history.replaceState(null, '', tab === 'fabrics' ? FABRICS_HASH : `${pathname}${search}`);
}

/** Les deux onglets du studio ; l'onglet choisi se retrouve dans l'adresse (rechargement, lien). */
export function AppTabs() {
  const [tab, setTab] = useState<AppTab>(() => tabFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const choose = (id: string) => {
    const next: AppTab = id === 'fabrics' ? 'fabrics' : 'pattern';
    setTab(next);
    reflectInHash(next);
  };

  return (
    <Tabs
      label={t('tabs.label')}
      value={tab}
      onChange={choose}
      keepMounted
      tabs={[
        { id: 'pattern', label: t('tabs.pattern'), panel: <PatternStudioScreen /> },
        {
          id: 'fabrics',
          label: t('tabs.fabrics'),
          panel: (
            <Suspense fallback={<p role="status">{t('fabricBench.loading')}</p>}>
              <LazyFabricBench />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
