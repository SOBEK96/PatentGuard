import { ArrowDownRight, Braces, Fingerprint, Orbit } from "lucide-react";

import type { NetworkMode } from "../../types/patent";

interface RegistryPulseProps {
  mode: NetworkMode;
  totalAttempts: number;
}

export function RegistryPulse({ mode, totalAttempts }: RegistryPulseProps) {
  return (
    <section className="hero-copy" id="overview">
      <div className="eyebrow">
        <span className="eyebrow-line" />
        Originality firewall / GenLayer
      </div>
      <h1>
        Secure the
        <span>logic.</span>
      </h1>
      <p className="hero-lede">
        Register AI architectures against an approved on-chain corpus. Independent
        validators replay the semantic audit before your claim becomes permanent.
      </p>
      <div className="hero-actions">
        <a className="primary-action" href="#register">
          Register a patent
          <ArrowDownRight size={17} />
        </a>
        <span className="mode-note">
          <span className={`mode-dot ${mode}`} />
          {mode === "live" ? "Contract telemetry live" : "Safe demo telemetry"}
        </span>
      </div>
      <div className="protocol-strip" aria-label="Protocol protections">
        <div>
          <Fingerprint size={16} />
          <span>3 lifetime attempts</span>
        </div>
        <div>
          <Orbit size={16} />
          <span>Independent replay</span>
        </div>
        <div>
          <Braces size={16} />
          <span>{totalAttempts} audits observed</span>
        </div>
      </div>
    </section>
  );
}
