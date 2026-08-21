export type GenLayerNetwork =
  | "localnet"
  | "studionet"
  | "testnetAsimov"
  | "testnetBradbury";

export type NetworkMode = "demo" | "live";

export type AuditPhase =
  | "idle"
  | "preparing"
  | "leader-analysis"
  | "validator-replay"
  | "vote-reveal"
  | "finalized"
  | "failed";

export interface AuditProgress {
  phase: AuditPhase;
  label: string;
  detail: string;
}

export interface PatentDraft {
  title: string;
  specification: string;
}

export interface PatentRecord {
  patentId: number;
  inventor: string;
  title: string;
  specificationText: string;
  timestamp: number;
  isApproved: boolean;
  auditReason: string;
}

export interface RegistryStats {
  totalRecords: number;
  totalAttempts: number;
  approvedRecords: number;
  rejectedRecords: number;
}

export interface RegistrySnapshot {
  stats: RegistryStats;
  recentRecords: PatentRecord[];
  owner: string | null;
  paused: boolean;
  mode: NetworkMode;
}

export interface WalletConnection {
  address: `0x${string}`;
}

export interface SubmissionResult {
  hash: `0x${string}`;
  record: PatentRecord;
}

export interface ValidationErrors {
  title?: string;
  specification?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  normalized: PatentDraft;
  titleRemaining: number;
  specificationRemaining: number;
}
