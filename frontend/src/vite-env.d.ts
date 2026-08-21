/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS?: string;
  readonly VITE_GENLAYER_NETWORK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface EthereumRequest {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface EthereumProvider {
  request(request: EthereumRequest): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}
