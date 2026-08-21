import { AlertCircle, GitFork, ShieldCheck, X } from "lucide-react";
import { lazy, Suspense } from "react";

import { ConsensusVisualizer } from "./components/consensus/ConsensusVisualizer";
import { MetricRail } from "./components/dashboard/MetricRail";
import { RecentRecords } from "./components/dashboard/RecentRecords";
import { RegistryPulse } from "./components/dashboard/RegistryPulse";
import { AppHeader } from "./components/layout/AppHeader";
import { PatentRegistrationForm } from "./components/registration/PatentRegistrationForm";
import { genlayerConfig, usePatentGuard } from "./hooks/usePatentGuard";

const SecurityScene = lazy(async () => {
  const module = await import("./components/scene/SecurityScene");
  return { default: module.SecurityScene };
});

function App() {
  const controller = usePatentGuard();
  const mode = controller.snapshot?.mode ?? genlayerConfig.mode;
  const paused = controller.snapshot?.paused ?? false;
  const stats = controller.snapshot?.stats ?? null;
  const recentRecords = controller.snapshot?.recentRecords ?? [];

  return (
    <div className="app-root">
      <Suspense fallback={<div className="security-scene scene-fallback" aria-hidden="true" />}>
        <SecurityScene phase={controller.progress.phase} />
      </Suspense>
      <div className="app-frame">
        <AppHeader
          wallet={controller.wallet}
          network={genlayerConfig.network}
          mode={mode}
          paused={paused}
          isConnecting={controller.isConnecting}
          isRefreshing={controller.isLoading}
          onConnect={() => void controller.connect()}
          onRefresh={() => void controller.refresh()}
        />

        {controller.error ? (
          <div className="global-alert" role="alert">
            <AlertCircle size={17} />
            <span>{controller.error}</span>
            <button type="button" onClick={controller.clearError} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        ) : null}

        <main>
          <div className="hero-layout">
            <RegistryPulse mode={mode} totalAttempts={stats?.totalAttempts ?? 0} />
            <div className="scene-caption" aria-hidden="true">
              <span>Validator lattice</span>
              <strong>05 nodes / semantic replay</strong>
              <i />
            </div>
          </div>

          <MetricRail
            stats={stats}
            mode={mode}
            liveQueue={controller.isSubmitting ? 1 : 0}
            isLoading={controller.isLoading}
          />

          <section className="workspace-grid" aria-label="Patent audit workspace">
            <PatentRegistrationForm
              mode={mode}
              walletAddress={controller.wallet?.address ?? null}
              remainingAttempts={controller.remainingAttempts}
              paused={paused}
              isSubmitting={controller.isSubmitting}
              lastSubmission={controller.lastSubmission}
              onSubmit={controller.submit}
            />
            <ConsensusVisualizer
              progress={controller.progress}
              mode={mode}
              transactionHash={controller.lastSubmission?.hash ?? null}
            />
          </section>

          <RecentRecords records={recentRecords} mode={mode} isLoading={controller.isLoading} />
        </main>

        <footer className="app-footer">
          <div className="footer-lockup">
            <ShieldCheck size={16} />
            <span>AI-PatentGuard</span>
          </div>
          <p>Consensus records originality claims. It does not grant legal patent rights.</p>
          <a href="https://github.com/genlayerlabs" target="_blank" rel="noreferrer">
            <GitFork size={15} />
            GenLayer
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
