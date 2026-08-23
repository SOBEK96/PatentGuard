import { createClient } from "genlayer-js";
import {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
} from "genlayer-js/chains";
import {
  ExecutionResult,
  TransactionStatus,
  type Network,
  type TransactionHash,
} from "genlayer-js/types";

import { genlayerConfig } from "./config";
import { demoSnapshot } from "./demo-data";
import { asSafeNumber } from "./format";
import type {
  AuditProgress,
  PatentDraft,
  PatentRecord,
  RegistrySnapshot,
  RegistryStats,
  SubmissionResult,
  WalletConnection,
} from "../types/patent";

type ClientConfig = NonNullable<Parameters<typeof createClient>[0]>;
type ProgressListener = (progress: AuditProgress) => void;
type JsonRecord = Record<string, unknown>;

const chains = {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
} as const;

const configuredNetwork = genlayerConfig.network;
const configuredAddress = genlayerConfig.contractAddress;
const readClient = createClient({ chain: chains[configuredNetwork] });

function asRecord(value: unknown): JsonRecord {
  if (value instanceof Map) {
    return Object.fromEntries(value) as JsonRecord;
  }
  if (value && typeof value === "object") {
    return value as JsonRecord;
  }
  return {};
}

function normalizeStats(value: unknown): RegistryStats {
  const stats = asRecord(value);
  return {
    totalRecords: asSafeNumber(stats.total_records),
    totalAttempts: asSafeNumber(stats.total_attempts),
    approvedRecords: asSafeNumber(stats.approved_records),
    rejectedRecords: asSafeNumber(stats.rejected_records),
  };
}

function normalizePatent(value: unknown, patentId: number): PatentRecord {
  const record = asRecord(value);
  return {
    patentId,
    inventor: String(record.inventor ?? "Unknown inventor"),
    title: String(record.title ?? "Untitled patent"),
    specificationText: String(record.specification_text ?? ""),
    timestamp: asSafeNumber(record.timestamp),
    isApproved: Boolean(record.is_approved),
    auditReason: String(record.audit_reason ?? "No audit reason returned."),
  };
}

function requireContractAddress(): `0x${string}` {
  if (!configuredAddress) {
    throw new Error("Set VITE_CONTRACT_ADDRESS to enable live contract access.");
  }
  return configuredAddress;
}

function normalizeWalletAddress(value: string): `0x${string}` | null {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    return null;
  }
  return value as `0x${string}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function getRegistrySnapshot(): Promise<RegistrySnapshot> {
  if (!configuredAddress) {
    await delay(250);
    return structuredClone(demoSnapshot);
  }

  const [rawStats, rawOwner, rawPaused] = await Promise.all([
    readClient.readContract({
      address: configuredAddress,
      functionName: "get_registry_stats",
      args: [],
    }),
    readClient.readContract({
      address: configuredAddress,
      functionName: "get_owner",
      args: [],
    }),
    readClient.readContract({
      address: configuredAddress,
      functionName: "is_registration_paused",
      args: [],
    }),
  ]);

  const stats = normalizeStats(rawStats);
  const firstPatentId = Math.max(0, stats.totalRecords - 3);
  const patentIds = Array.from(
    { length: stats.totalRecords - firstPatentId },
    (_, index) => firstPatentId + index,
  ).reverse();
  const recentRecords = await Promise.all(
    patentIds.map(async (patentId) => {
      const result = await readClient.readContract({
        address: configuredAddress,
        functionName: "get_patent_record",
        args: [BigInt(patentId)],
      });
      return normalizePatent(result, patentId);
    }),
  );

  return {
    stats,
    recentRecords,
    owner: typeof rawOwner === "string" ? rawOwner : String(rawOwner),
    paused: Boolean(rawPaused),
    mode: "live",
  };
}

export async function getRemainingAttempts(address: string): Promise<number> {
  if (!configuredAddress) {
    return 3;
  }
  const result = await readClient.readContract({
    address: configuredAddress,
    functionName: "get_remaining_attempts",
    args: [address],
  });
  return asSafeNumber(result);
}

export async function connectWallet(): Promise<WalletConnection> {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("Install an EIP-1193 wallet to connect to GenLayer.");
  }
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("The wallet did not return an account.");
  }
  const address = normalizeWalletAddress(accounts[0]);
  if (!address) {
    throw new Error("The wallet returned an invalid account.");
  }
  return { address };
}

function scheduleLiveProgress(onProgress: ProgressListener): () => void {
  const validatorTimer = window.setTimeout(() => {
    onProgress({
      phase: "validator-replay",
      label: "Validators replaying audit",
      detail: "Independent nodes are re-evaluating semantic originality.",
    });
  }, 1400);
  const voteTimer = window.setTimeout(() => {
    onProgress({
      phase: "vote-reveal",
      label: "Consensus votes revealing",
      detail: "The network is comparing validator decisions.",
    });
  }, 3600);

  return () => {
    window.clearTimeout(validatorTimer);
    window.clearTimeout(voteTimer);
  };
}

async function simulateRegistration(
  draft: PatentDraft,
  account: string | null,
  onProgress: ProgressListener,
): Promise<SubmissionResult> {
  onProgress({
    phase: "leader-analysis",
    label: "Chief Judge analyzing",
    detail: "The candidate is being compared with a sampled window of the 64 most recent approved records.",
  });
  await delay(700);
  onProgress({
    phase: "validator-replay",
    label: "Validators replaying audit",
    detail: "Five simulated validators are testing the same originality decision.",
  });
  await delay(850);
  onProgress({
    phase: "vote-reveal",
    label: "Consensus votes revealing",
    detail: "Validator decisions agree on an original architecture.",
  });
  await delay(700);

  const patentId = demoSnapshot.stats.totalRecords;
  const record: PatentRecord = {
    patentId,
    inventor: account ?? "Demo operator",
    title: draft.title,
    specificationText: draft.specification,
    timestamp: Math.floor(Date.now() / 1000),
    isApproved: true,
    auditReason:
      "Demo consensus found independently expressed core logic and no protected semantic match.",
  };
  const hash = `0x${"d".repeat(62)}${patentId.toString(16).padStart(2, "0")}` as `0x${string}`;
  onProgress({
    phase: "finalized",
    label: "Demo audit finalized",
    detail: "This result is local. Configure a contract address for network finality.",
  });
  return { hash, record };
}

export async function registerPatent(
  draft: PatentDraft,
  account: string | null,
  onProgress: ProgressListener,
): Promise<SubmissionResult> {
  if (!configuredAddress) {
    return simulateRegistration(draft, account, onProgress);
  }
  if (!account) {
    throw new Error("Connect a wallet before registering a patent.");
  }
  if (!window.ethereum) {
    throw new Error("The connected wallet provider is no longer available.");
  }

  const address = requireContractAddress();
  const provider = window.ethereum as ClientConfig["provider"];
  const writeClient = createClient({
    chain: chains[configuredNetwork],
    account: account as `0x${string}`,
    provider,
  });

  onProgress({
    phase: "preparing",
    label: "Confirm in wallet",
    detail: "Review the public registration transaction before signing.",
  });
  await writeClient.connect(configuredNetwork as Network);
  const hash = (await writeClient.writeContract({
    address,
    functionName: "register_and_audit_patent",
    args: [draft.title, draft.specification],
    value: 0n,
    consensusMaxRotations: 3,
  })) as TransactionHash;

  onProgress({
    phase: "leader-analysis",
    label: "Chief Judge analyzing",
    detail: "The transaction is active and the leader is evaluating originality.",
  });
  const clearProgressTimers = scheduleLiveProgress(onProgress);

  try {
    const receipt = await readClient.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      interval: 2500,
      retries: 240,
    });
    if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
      throw new Error(
        `The network finalized with ${receipt.txExecutionResultName ?? "an unknown execution result"}.`,
      );
    }

    const snapshot = await getRegistrySnapshot();
    const record = snapshot.recentRecords[0];
    if (!record) {
      throw new Error("The transaction finalized but the patent record was not found.");
    }
    onProgress({
      phase: "finalized",
      label: record.isApproved ? "Patent approved" : "Patent rejected",
      detail: record.auditReason,
    });
    return { hash, record };
  } finally {
    clearProgressTimers();
  }
}
