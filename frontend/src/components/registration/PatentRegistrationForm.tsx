import { AlertTriangle, ArrowUpRight, Check, FileLock2, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import { shortAddress } from "../../lib/format";
import { validatePatentDraft } from "../../lib/validation";
import type { NetworkMode, PatentDraft, SubmissionResult } from "../../types/patent";

interface PatentRegistrationFormProps {
  mode: NetworkMode;
  walletAddress: string | null;
  remainingAttempts: number;
  paused: boolean;
  isSubmitting: boolean;
  lastSubmission: SubmissionResult | null;
  onSubmit: (draft: PatentDraft) => Promise<void>;
}

const initialDraft: PatentDraft = {
  title: "",
  specification: "",
};

export function PatentRegistrationForm({
  mode,
  walletAddress,
  remainingAttempts,
  paused,
  isSubmitting,
  lastSubmission,
  onSubmit,
}: PatentRegistrationFormProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const validation = validatePatentDraft(draft);
  const titleError = submitted || draft.title.length > 0 ? validation.errors.title : undefined;
  const specificationError =
    submitted || draft.specification.length > 0
      ? validation.errors.specification
      : undefined;
  const liveWalletRequired = mode === "live" && !walletAddress;
  const cannotSubmit =
    paused || isSubmitting || remainingAttempts === 0 || liveWalletRequired;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.isValid || cannotSubmit) {
      return;
    }
    await onSubmit(validation.normalized);
  }

  return (
    <section className="glass-panel registration-panel" id="register">
      <header className="panel-header">
        <div>
          <span className="section-kicker">New registration</span>
          <h2>Seal original logic</h2>
        </div>
        <FileLock2 size={22} strokeWidth={1.4} />
      </header>

      <div className="attempt-readout">
        <div>
          <span>Inventor</span>
          <strong>{mode === "demo" && !walletAddress ? "Demo operator" : shortAddress(walletAddress)}</strong>
        </div>
        <div>
          <span>Attempts remaining</span>
          <div className="attempt-dots" aria-label={`${remainingAttempts} attempts remaining`}>
            {[0, 1, 2].map((attempt) => (
              <i className={attempt < remainingAttempts ? "available" : "used"} key={attempt} />
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <label className="field-group">
          <span className="field-label">
            Patent title
            <small className={validation.titleRemaining < 0 ? "over-limit" : ""}>
              {validation.titleRemaining} / 160
            </small>
          </span>
          <input
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? "title-error" : undefined}
            autoComplete="off"
            disabled={isSubmitting}
            maxLength={180}
            name="title"
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Name the protected system"
            spellCheck="true"
            type="text"
            value={draft.title}
          />
          {titleError ? <small className="field-error" id="title-error">{titleError}</small> : null}
        </label>

        <label className="field-group specification-field">
          <span className="field-label">
            Technical specification
            <small className={validation.specificationRemaining < 0 ? "over-limit" : ""}>
              {validation.specificationRemaining.toLocaleString("en-US")} / 4,000
            </small>
          </span>
          <textarea
            aria-invalid={Boolean(specificationError)}
            aria-describedby={specificationError ? "specification-error" : "specification-guidance"}
            disabled={isSubmitting}
            maxLength={4200}
            name="specification"
            onChange={(event) =>
              setDraft((current) => ({ ...current, specification: event.target.value }))
            }
            placeholder="Describe the algorithm, agent topology, decision sequence, and novel safeguards."
            rows={8}
            value={draft.specification}
          />
          {specificationError ? (
            <small className="field-error" id="specification-error">{specificationError}</small>
          ) : (
            <small className="field-guidance" id="specification-guidance">
              Public, permanent, English ASCII text only.
            </small>
          )}
        </label>

        {paused || liveWalletRequired || remainingAttempts === 0 ? (
          <div className="form-warning" role="status">
            <AlertTriangle size={16} />
            <span>
              {paused
                ? "The contract owner has paused new registrations."
                : remainingAttempts === 0
                  ? "This inventor has used all three lifetime attempts."
                  : "Connect a wallet before sending a live registration."}
            </span>
          </div>
        ) : null}

        <button className="submit-audit-button" type="submit" disabled={cannotSubmit}>
          {isSubmitting ? <LoaderCircle className="is-spinning" size={18} /> : <ArrowUpRight size={18} />}
          <span>{isSubmitting ? "Consensus in progress" : "Start consensus audit"}</span>
          <small>{mode === "demo" ? "RUN DEMO" : "WRITE CONTRACT"}</small>
        </button>
      </form>

      {lastSubmission ? (
        <div className={`submission-result ${lastSubmission.record.isApproved ? "approved" : "rejected"}`}>
          <span>{lastSubmission.record.isApproved ? <Check size={16} /> : <AlertTriangle size={16} />}</span>
          <div>
            <strong>{lastSubmission.record.isApproved ? "Registration approved" : "Registration rejected"}</strong>
            <p>{lastSubmission.record.auditReason}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
