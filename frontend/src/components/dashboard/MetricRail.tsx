import { Activity, BadgeCheck, FileKey2, RadioTower } from "lucide-react";

import { approvalRate, formatRegistryCount } from "../../lib/format";
import type { NetworkMode, RegistryStats } from "../../types/patent";

interface MetricRailProps {
  stats: RegistryStats | null;
  mode: NetworkMode;
  liveQueue: number;
  isLoading: boolean;
}

export function MetricRail({ stats, mode, liveQueue, isLoading }: MetricRailProps) {
  const rate = stats ? approvalRate(stats.approvedRecords, stats.rejectedRecords) : 0;
  const metrics = [
    {
      label: "Registered claims",
      value: stats ? formatRegistryCount(stats.totalRecords) : "--",
      detail: mode === "demo" ? "Illustrative registry" : "Finalized on-chain",
      icon: FileKey2,
    },
    {
      label: "Consensus approved",
      value: stats ? formatRegistryCount(stats.approvedRecords) : "--",
      detail: "Protected corpus",
      icon: BadgeCheck,
    },
    {
      label: "Approval ratio",
      value: stats ? `${rate.toFixed(1)}%` : "--",
      detail: "Approved vs rejected",
      icon: Activity,
    },
    {
      label: "Live audit queue",
      value: String(liveQueue),
      detail: "This browser session",
      icon: RadioTower,
    },
  ];

  return (
    <section className={`metric-rail ${isLoading ? "is-loading" : ""}`} aria-label="Registry metrics">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <article className="metric-cell" key={metric.label}>
            <div className="metric-index">0{index + 1}</div>
            <Icon className="metric-icon" size={18} strokeWidth={1.5} />
            <div>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.detail}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
