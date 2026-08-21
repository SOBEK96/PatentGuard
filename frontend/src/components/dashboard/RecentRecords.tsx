import { Check, FileSearch, X } from "lucide-react";

import { formatTimestamp, shortAddress } from "../../lib/format";
import type { NetworkMode, PatentRecord } from "../../types/patent";

interface RecentRecordsProps {
  records: PatentRecord[];
  mode: NetworkMode;
  isLoading: boolean;
}

export function RecentRecords({ records, mode, isLoading }: RecentRecordsProps) {
  return (
    <section className="registry-section" id="registry">
      <header className="section-header">
        <div>
          <span className="section-kicker">Protected corpus</span>
          <h2>Latest decisions</h2>
        </div>
        <div className="registry-mode">
          <span>{mode === "demo" ? "Demo feed" : "On-chain feed"}</span>
          <FileSearch size={17} />
        </div>
      </header>

      <div className="record-list" aria-live="polite" aria-busy={isLoading}>
        {isLoading && records.length === 0
          ? [0, 1, 2].map((index) => <div className="record-row record-skeleton" key={index} />)
          : records.map((record) => (
              <article className="record-row" key={record.patentId}>
                <div className={`decision-mark ${record.isApproved ? "approved" : "rejected"}`}>
                  {record.isApproved ? <Check size={17} /> : <X size={17} />}
                </div>
                <div className="record-identity">
                  <span>PG-{String(record.patentId).padStart(4, "0")}</span>
                  <small>{shortAddress(record.inventor, 4)}</small>
                </div>
                <div className="record-copy">
                  <h3>{record.title}</h3>
                  <p>{record.auditReason}</p>
                </div>
                <div className="record-meta">
                  <span className={record.isApproved ? "approved" : "rejected"}>
                    {record.isApproved ? "Approved" : "Rejected"}
                  </span>
                  <time dateTime={new Date(record.timestamp * 1000).toISOString()}>
                    {formatTimestamp(record.timestamp)}
                  </time>
                </div>
              </article>
            ))}
        {!isLoading && records.length === 0 ? (
          <div className="empty-registry">
            <FileSearch size={21} />
            <p>No finalized patent records exist yet.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
