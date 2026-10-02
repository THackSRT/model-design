import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

export interface TabsProps {
  /** Nom accessible de la liste d'onglets, déjà traduit. */
  label: string;
  tabs: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  /**
   * Garde monté, mais masqué, un panneau déjà visité : sa saisie survit au changement d'onglet.
   * Un panneau jamais visité n'est pas monté (chargement différé possible).
   */
  keepMounted?: boolean;
}

function targetIndex(key: string, current: number, count: number): number | undefined {
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return undefined;
}

interface TabButtonProps {
  base: string;
  tab: TabItem;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  setRef: (el: HTMLButtonElement | null) => void;
}

function TabButton({ base, tab, selected, onSelect, onKeyDown, setRef }: TabButtonProps) {
  return (
    <button
      ref={setRef}
      type="button"
      role="tab"
      id={`${base}-tab-${tab.id}`}
      aria-selected={selected}
      aria-controls={`${base}-panel-${tab.id}`}
      tabIndex={selected ? 0 : -1}
      className="ui-tab"
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {tab.label}
    </button>
  );
}

interface TabPanelProps {
  base: string;
  tab: TabItem;
  active: boolean;
  mounted: boolean;
}

function TabPanel({ base, tab, active, mounted }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={`${base}-panel-${tab.id}`}
      aria-labelledby={`${base}-tab-${tab.id}`}
      hidden={!active}
      className="ui-tabpanel"
    >
      {mounted ? tab.panel : null}
    </div>
  );
}

function moveByKey(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  tabs: readonly TabItem[],
  move: (next: number) => void,
): void {
  const next = targetIndex(event.key, index, tabs.length);
  if (next === undefined || tabs[next] === undefined) return;
  event.preventDefault();
  move(next);
}

/** Identifiants des onglets déjà actifs (ajout pendant le rendu : pas de rendu intermédiaire sans lui). */
function useVisited(activeId: string | undefined): ReadonlySet<string> {
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());
  if (activeId !== undefined && !visited.has(activeId)) {
    setVisited(new Set(visited).add(activeId));
  }
  return visited;
}

export function Tabs({ label, tabs, value, onChange, keepMounted = false }: TabsProps) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const found = tabs.findIndex((t) => t.id === value);
  const activeIndex = Math.max(0, found);
  const visited = useVisited(keepMounted ? tabs[activeIndex]?.id : undefined);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) =>
    moveByKey(event, index, tabs, (next) => {
      onChange(tabs[next]?.id ?? '');
      refs.current[next]?.focus();
    });

  return (
    <div className="ui-tabs">
      <div role="tablist" aria-label={label} className="ui-tablist">
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            base={base}
            tab={tab}
            selected={index === activeIndex}
            onSelect={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            setRef={(el) => {
              refs.current[index] = el;
            }}
          />
        ))}
      </div>
      {tabs.map((tab, index) => (
        <TabPanel
          key={tab.id}
          base={base}
          tab={tab}
          active={index === activeIndex}
          mounted={index === activeIndex || visited.has(tab.id)}
        />
      ))}
    </div>
  );
}
