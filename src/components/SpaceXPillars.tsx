import { useState } from "react";

type Pillar = {
  id: string;
  name: string;
  activated: string;
  description: string;
  firsts: Array<{ year: string; text: string }>;
  highlights: Array<{ label: string; value: string }>;
};

const pillars: Pillar[] = [
  {
    id: "space",
    name: "Space",
    activated: "2002",
    description: "Launch services, Dragon spacecraft, and the Starship program SpaceX is funding as its next-generation vehicle.",
    firsts: [
      { year: "2008", text: "First private liquid-fuel rocket to reach orbit" },
      { year: "2012", text: "First private spacecraft to dock with the ISS" },
      { year: "2015", text: "First propulsive landing of an orbital-class booster" },
      { year: "2017", text: "First reflight of an orbital-class booster" },
    ],
    highlights: [
      { label: "2025 revenue", value: "$4.1B" },
      { label: "2025 operating loss", value: "($657M)" },
      { label: "2025 Starship R&D", value: "$3.0B" },
      { label: "2025 capex", value: "$3.8B" },
    ],
  },
  {
    id: "connectivity",
    name: "Connectivity",
    activated: "2020",
    description: "Starlink broadband, direct-to-cell service, user terminals, and the low-Earth-orbit satellite network.",
    firsts: [
      { year: "2019", text: "First large-scale low-Earth-orbit broadband constellation" },
      { year: "2022", text: "First globally available low-latency LEO network" },
      { year: "2022", text: "First consumer phased-array user terminals at scale" },
      { year: "2025", text: "First large-scale satellite-to-mobile constellation" },
    ],
    highlights: [
      { label: "2025 revenue", value: "$11.4B" },
      { label: "2025 operating income", value: "$4.4B" },
      { label: "Segment adj. EBITDA", value: "$7.2B" },
      { label: "Starlink subscribers", value: "10.3M" },
    ],
  },
  {
    id: "ai",
    name: "AI",
    activated: "2023",
    description: "xAI, Grok models, X distribution, large-scale compute infrastructure, and the orbital AI compute roadmap.",
    firsts: [
      { year: "2026", text: "Gigawatt-scale AI training cluster" },
      { year: "2026", text: "Gigawatt-scale Megapack battery installation" },
    ],
    highlights: [
      { label: "2025 revenue", value: "$3.2B" },
      { label: "2025 operating loss", value: "($6.4B)" },
      { label: "2025 capex", value: "$12.7B" },
      { label: "Q1 2026 capex", value: "$7.7B" },
    ],
  },
];

export function SpaceXPillars() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = pillars[activeIndex];

  return (
    <section className={`pillar-section pillar-${active.id}`}>
      <div className="pillar-shell">
        <div className="pillar-intro">
          <h2>What is SpaceX?</h2>
          <p>
            SpaceX builds reusable rockets, operates Starlink internet, and now includes xAI and X. The profile below
            breaks the company into the three operating pillars described in the filing: Space, Connectivity, and AI.
          </p>
        </div>

        <div className="pillar-selector" aria-label="SPCX business segments">
          {pillars.map((pillar, index) => (
            <button
              className={index === activeIndex ? "active" : ""}
              key={pillar.id}
              type="button"
              onClick={() => setActiveIndex(index)}
            >
              {pillar.name}
            </button>
          ))}
        </div>

        <article className="pillar-card">
          <div className="pillar-identity">
            <span className="pillar-square" />
            <h2>{active.name}</h2>
            <p>Since {active.activated}</p>
          </div>

          <div className="pillar-firsts">
            <p className="pillar-description">{active.description}</p>
            <h3>Milestones</h3>
            <div className="first-list">
              {active.firsts.map((first) => (
                <div className="first-row" key={`${active.id}-${first.year}-${first.text}`}>
                  <span>{first.year}</span>
                  <p>{first.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pillar-highlights">
            <h3>By the numbers</h3>
            <div className="highlight-grid">
              {active.highlights.map((highlight) => (
                <div key={`${active.id}-${highlight.label}`}>
                  <span>{highlight.label}</span>
                  <strong>{highlight.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <p className="pillar-footnote">Figures as of March 31, 2026.</p>
      </div>
    </section>
  );
}
