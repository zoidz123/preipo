import { buildCompanyRanking, type RankedCompany } from "../lib/equities";
import { formatValuation } from "../lib/spcx";

type ResearchSectionsProps = {
  companies: RankedCompany[];
  impliedValuation: number | null;
};

export function ResearchSections({ companies, impliedValuation }: ResearchSectionsProps) {
  const rankRows = buildCompanyRanking(companies, impliedValuation).slice(0, 10);

  return (
    <section className="rank-section" id="rank">
      <article className="research-panel angular">
        <div className="rank-copy">
          <h2>Where would SpaceX rank?</h2>
          <p>
            At the current implied valuation, SpaceX would sit among the largest actively traded U.S. equities.
          </p>
        </div>
        <div className="rank-table">
          {rankRows.map((row, index) => (
            <div className={row.isSpaceX ? "rank-row active" : "rank-row"} key={row.symbol}>
              <span>#{index + 1}</span>
              <b>{row.name}</b>
              <em>{formatValuation(row.marketCap)}</em>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
