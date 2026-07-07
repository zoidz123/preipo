export type AppView = "upcoming" | "public";

const VIEWS: Array<{ id: AppView; label: string }> = [
  { id: "upcoming", label: "Upcoming IPOs" },
  { id: "public", label: "Went Public" },
];

type SiteHeaderProps = {
  view: AppView;
  onViewChange: (view: AppView) => void;
};

export function SiteHeader({ view, onViewChange }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-chrome">
        <span>PREIPO</span>
        <b>PREIPO.fyi</b>
      </div>
      <div className="preipo-explainer">
        <p>
          PREIPO tracks the hottest pre-listing companies through 24/7 cash-settled perpetual futures trading on
          Hyperliquid.
        </p>
      </div>
      <div className="view-tabs" role="tablist" aria-label="Dashboard views">
        {VIEWS.map(({ id, label }) => (
          <button
            aria-selected={view === id}
            className={view === id ? "active" : ""}
            key={id}
            role="tab"
            type="button"
            onClick={() => onViewChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
