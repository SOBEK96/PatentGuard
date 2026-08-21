import type { PatentRecord, RegistrySnapshot } from "../types/patent";

export const DEMO_INVENTOR = "0x71cB...92F4";

export const demoRecords: PatentRecord[] = [
  {
    patentId: 48,
    inventor: "0x8a31...c912",
    title: "Adaptive Agent Route Graph",
    specificationText:
      "A bounded agent routing graph that reassigns tasks using verified intent deltas.",
    timestamp: 1787286840,
    isApproved: true,
    auditReason:
      "The routing sequence and verification gates are independently expressed.",
  },
  {
    patentId: 47,
    inventor: "0x1d80...a0e7",
    title: "Recursive Prompt Memory Mesh",
    specificationText:
      "A prompt memory design using weighted semantic checkpoints and controlled replay.",
    timestamp: 1787282100,
    isApproved: false,
    auditReason:
      "The candidate reproduces the protected checkpoint sequence of an approved record.",
  },
  {
    patentId: 46,
    inventor: "0xb920...31ca",
    title: "Consensus-Bound Model Escrow",
    specificationText:
      "A release protocol that binds model artifacts to validator-confirmed delivery criteria.",
    timestamp: 1787274900,
    isApproved: true,
    auditReason:
      "No approved patent contains the same settlement architecture or control sequence.",
  },
];

export const demoSnapshot: RegistrySnapshot = {
  stats: {
    totalRecords: 49,
    totalAttempts: 61,
    approvedRecords: 42,
    rejectedRecords: 7,
  },
  recentRecords: demoRecords,
  owner: "0x42f6...a913",
  paused: false,
  mode: "demo",
};
