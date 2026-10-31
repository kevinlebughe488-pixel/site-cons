/** Squelette affiché immédiatement pendant le chargement d'une page. */
export default function Loading() {
  return (
    <div className="wrap page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="skeleton" style={{ height: 38, width: "min(420px, 80%)" }} />
      <div className="skeleton" style={{ height: 16, width: "min(620px, 95%)", marginTop: 16 }} />
      <div className="skeleton-grid">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
}
