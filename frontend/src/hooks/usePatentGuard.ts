import { useEffect, useState } from "react";

import { genlayerConfig } from "../lib/config";
import { errorMessage } from "../lib/format";
import type {
  AuditPhase,
  AuditProgress,
  PatentDraft,
  RegistrySnapshot,
  SubmissionResult,
  WalletConnection,
} from "../types/patent";

const idleProgress: AuditProgress = {
  phase: "idle",
  label: "Audit standby",
  detail: "Submit a candidate to begin a validator-backed originality check.",
};

export interface PatentGuardController {
  snapshot: RegistrySnapshot | null;
  wallet: WalletConnection | null;
  remainingAttempts: number;
  progress: AuditProgress;
  isLoading: boolean;
  isConnecting: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastSubmission: SubmissionResult | null;
  refresh: () => Promise<void>;
  connect: () => Promise<void>;
  submit: (draft: PatentDraft) => Promise<void>;
  clearError: () => void;
}

export function usePatentGuard(): PatentGuardController {
  const [snapshot, setSnapshot] = useState<RegistrySnapshot | null>(null);
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [progress, setProgress] = useState<AuditProgress>(idleProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<SubmissionResult | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    void import("../lib/genlayer")
      .then(({ getRegistrySnapshot }) => getRegistrySnapshot())
      .then((nextSnapshot) => {
        if (active) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function refresh(): Promise<void> {
    setIsLoading(true);
    try {
      const { getRegistrySnapshot, getRemainingAttempts } = await import("../lib/genlayer");
      const nextSnapshot = await getRegistrySnapshot();
      setSnapshot(nextSnapshot);
      if (wallet) {
        setRemainingAttempts(await getRemainingAttempts(wallet.address));
      }
      setError(null);
    } catch (refreshError: unknown) {
      setError(errorMessage(refreshError));
    } finally {
      setIsLoading(false);
    }
  }

  async function connect(): Promise<void> {
    setIsConnecting(true);
    try {
      const { connectWallet, getRemainingAttempts } = await import("../lib/genlayer");
      const nextWallet = await connectWallet();
      setWallet(nextWallet);
      setRemainingAttempts(await getRemainingAttempts(nextWallet.address));
      setError(null);
    } catch (connectionError: unknown) {
      setError(errorMessage(connectionError));
    } finally {
      setIsConnecting(false);
    }
  }

  async function submit(draft: PatentDraft): Promise<void> {
    setIsSubmitting(true);
    setLastSubmission(null);
    setError(null);
    try {
      const { registerPatent } = await import("../lib/genlayer");
      const result = await registerPatent(
        draft,
        wallet?.address ?? null,
        setProgress,
      );
      setLastSubmission(result);
      if (snapshot?.mode === "demo") {
        setSnapshot((currentSnapshot) => {
          if (!currentSnapshot) {
            return currentSnapshot;
          }
          return {
            ...currentSnapshot,
            stats: {
              ...currentSnapshot.stats,
              totalRecords: currentSnapshot.stats.totalRecords + 1,
              totalAttempts: currentSnapshot.stats.totalAttempts + 1,
              approvedRecords:
                currentSnapshot.stats.approvedRecords +
                (result.record.isApproved ? 1 : 0),
              rejectedRecords:
                currentSnapshot.stats.rejectedRecords +
                (result.record.isApproved ? 0 : 1),
            },
            recentRecords: [
              result.record,
              ...currentSnapshot.recentRecords,
            ].slice(0, 3),
          };
        });
        setRemainingAttempts((attempts) => Math.max(0, attempts - 1));
      } else {
        await refresh();
      }
      if (!result.record.isApproved) {
        setProgress((currentProgress) => ({
          ...currentProgress,
          phase: "finalized" as AuditPhase,
          label: "Patent rejected",
        }));
      }
    } catch (submissionError: unknown) {
      setProgress({
        phase: "failed",
        label: "Audit halted",
        detail: errorMessage(submissionError),
      });
      setError(errorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearError(): void {
    setError(null);
  }

  return {
    snapshot,
    wallet,
    remainingAttempts,
    progress,
    isLoading,
    isConnecting,
    isSubmitting,
    error,
    lastSubmission,
    refresh,
    connect,
    submit,
    clearError,
  };
}

export { genlayerConfig };
