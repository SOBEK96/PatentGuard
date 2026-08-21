import type { GenLayerNetwork } from "../types/patent";

const supportedNetworks: GenLayerNetwork[] = [
  "localnet",
  "studionet",
  "testnetAsimov",
  "testnetBradbury",
];

function normalizeNetwork(value: string | undefined): GenLayerNetwork {
  if (supportedNetworks.includes(value as GenLayerNetwork)) {
    return value as GenLayerNetwork;
  }
  return "studionet";
}

function normalizeAddress(value: string | undefined): `0x${string}` | null {
  const address = value?.trim();
  if (!address) {
    return null;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("VITE_CONTRACT_ADDRESS must be a 20-byte hex address");
  }
  return address as `0x${string}`;
}

const contractAddress = normalizeAddress(import.meta.env.VITE_CONTRACT_ADDRESS);

export const genlayerConfig = {
  network: normalizeNetwork(import.meta.env.VITE_GENLAYER_NETWORK),
  contractAddress,
  mode: contractAddress ? "live" : "demo",
} as const;
