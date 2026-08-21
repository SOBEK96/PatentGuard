import { Bot, CheckCircle2, Cpu, ScanSearch, Vote, XCircle } from "lucide-react";

import type { AuditPhase, AuditProgress, NetworkMode } from "../../types/patent";

interface ConsensusVisualizerProps {
  progress: AuditProgress;
  mode: NetworkMode;
  transactionHash: string | null;
}

const stages: { phase: AuditPhase; label: string; icon: typeof Bot }[] = [
  { phase: "preparing", label: "Seal draft", icon: Cpu },
  { phase: "leader-analysis", label: "Leader audit", icon: Bot },
  { phase: "validator-replay", label: "Node replay", icon: ScanSearch },
  { phase: "vote-reveal", label: "Vote reveal", icon: Vote },
  { phase: "finalized", label: "Finality", icon: CheckCircle2 },
];

function phaseIndex(phase: AuditPhase): number {
  if (phase === "idle" || phase === "failed") {
    return -1;
  }
  return stages.findIndex((stage) => stage.phase === phase);
}

export function ConsensusVisualizer({
  progress,
  mode,
  transactionHash,
}: ConsensusVisualizerProps) {
  const currentIndex = phaseIndex(progress.phase);
  const isFailed = progress.phase === "failed";

  return (
    <section className={`glass-panel consensus-panel phase-${progress.phase}`} aria-live="polite">
      <header className="panel-header">
        <div>
          <span className="section-kicker">LLM consensus</span>
          <h2>Audit telemetry</h2>
        </div>
        <span className={`telemetry-state ${progress.phase}`}>
          {mode === "demo" ? "Simulation" : progress.phase === "idle" ? "Ready" : "Live"}
        </span>
      </header>

      <div className="consensus-orbit" aria-hidden="true">
        <div className="orbit-ring orbit-ring-outer" />
        <div className="orbit-ring orbit-ring-inner" />
        <div className="consensus-core">
          {isFailed ? <XCircle size={28} /> : <Bot size={28} />}
          <span>{isFailed ? "HALT" : currentIndex < 0 ? "IDLE" : `${currentIndex + 1}/5`}</span>
        </div>
        {[0, 1, 2, 3, 4].map((node) => (
          <span
            className={`orbit-node node-${node + 1} ${currentIndex >= 2 ? "is-active" : ""}`}
            key={node}
          >
            {node + 1}
          </span>
        ))}
      </div>

      <div className="audit-readout">
        <span className="readout-label">Current operation</span>
        <h3>{progress.label}</h3>
        <p>{progress.detail}</p>
        {transactionHash ? (
          <code title={transactionHash}>
            TX {transactionHash.slice(0, 10)}...{transactionHash.slice(-6)}
          </code>
        ) : null}
      </div>

      <ol className="consensus-stages">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const state = isFailed
            ? "halted"
            : index < currentIndex
              ? "complete"
              : index === currentIndex
                ? "active"
                : "pending";
          return (
            <li className={state} key={stage.phase}>
              <span>
                <Icon size={15} />
              </span>
              <small>{stage.label}</small>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
