import type { ReactNode } from 'react';

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ui-panel" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Message({
  tone = 'normal',
  children,
}: {
  tone?: 'normal' | 'danger';
  children: ReactNode;
}) {
  return (
    <p className="ui-message" data-tone={tone} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
