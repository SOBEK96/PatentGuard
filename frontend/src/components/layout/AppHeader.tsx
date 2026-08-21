import { CircleDot, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";

import { shortAddress } from "../../lib/format";
import type { GenLayerNetwork, NetworkMode, WalletConnection } from "../../types/patent";

interface AppHeaderProps {
  wallet: WalletConnection | null;
  network: GenLayerNetwork;
  mode: NetworkMode;
  paused: boolean;
  isConnecting: boolean;
  isRefreshing: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

export function AppHeader({
  wallet,
  network,
  mode,
  paused,
  isConnecting,
  isRefreshing,
  onConnect,
  onRefresh,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand-lockup" href="#overview" aria-label="AI-PatentGuard home">
        <span className="brand-mark" aria-hidden="true">
          <ShieldCheck size={19} strokeWidth={1.6} />
        </span>
        <span className="brand-name">
          AI-PATENT<span>GUARD</span>
        </span>
      </a>

      <nav className="primary-nav" aria-label="Primary navigation">
        <a href="#overview">Overview</a>
        <a href="#register">Register</a>
        <a href="#registry">Registry</a>
      </nav>

      <div className="header-actions">
        <div className={`network-chip ${paused ? "is-paused" : ""}`}>
          <CircleDot size={12} strokeWidth={2.4} />
          <span>{paused ? "Registry paused" : `${network} / ${mode}`}</span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Refresh registry"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={isRefreshing ? "is-spinning" : ""} size={17} />
        </button>
        <button className="wallet-button" type="button" onClick={onConnect} disabled={isConnecting}>
          <WalletCards size={17} strokeWidth={1.7} />
          <span>{isConnecting ? "Connecting" : shortAddress(wallet?.address ?? null)}</span>
        </button>
      </div>
    </header>
  );
}
