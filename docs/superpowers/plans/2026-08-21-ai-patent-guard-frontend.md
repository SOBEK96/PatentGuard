# AI-PatentGuard Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive React dashboard that visualizes AI patent protection, connects to the verified GenLayer contract, validates submissions, and communicates live consensus progress.

**Architecture:** A Vite React TypeScript single-page application owns presentation, wallet connection, read polling, and transaction lifecycle state. `genlayer-js` owns RPC and wallet-backed contract interactions. React Three Fiber renders one full-bleed security lattice behind a restrained glass command deck, with a static CSS fallback for reduced motion and WebGL failure.

**Tech Stack:** React 19, Vite 8, TypeScript 7, Tailwind CSS 4, Three.js, React Three Fiber, Drei, Lucide React, GenLayer JS 1.1.8, Vitest, Testing Library, Playwright.

## Global Constraints

- Every authored file must contain English ASCII only.
- The frontend lives entirely under `frontend/` except this implementation plan.
- Contract methods and limits must match `contracts/ai_patent_guard.py` exactly.
- The 3D scene must remain full-bleed, responsive, nonblank, and optional under reduced motion.
- Missing wallet or contract configuration must produce an explicit demo mode, never fabricated live state.
- No private keys or secrets may be embedded in browser code.

---

### Task 1: Application Foundation

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/eslint.config.js`
- Create: `frontend/.env.example`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/vite-env.d.ts`

**Interfaces:**
- Produces: Vite commands `dev`, `build`, `lint`, `test`, and `test:e2e`.
- Produces: `VITE_GENLAYER_NETWORK` and `VITE_CONTRACT_ADDRESS` browser configuration.

- [ ] **Step 1: Create the package and toolchain configuration**

Pin the framework, 3D, SDK, lint, test, and browser-test dependencies listed in the tech stack. Configure Vite with the React and Tailwind plugins and strict TypeScript options.

- [ ] **Step 2: Create the browser entry point**

Mount `<App />` inside `#root`, import the global stylesheet, and wrap development rendering in `StrictMode`.

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: a generated `package-lock.json` and no installation error.

### Task 2: Contract and Domain Layer

**Files:**
- Create: `frontend/src/types/patent.ts`
- Create: `frontend/src/lib/validation.ts`
- Create: `frontend/src/lib/genlayer.ts`
- Create: `frontend/src/lib/demo-data.ts`
- Create: `frontend/src/lib/format.ts`
- Test: `frontend/src/lib/validation.test.ts`

**Interfaces:**
- Produces: `validatePatentDraft(draft: PatentDraft): ValidationResult`.
- Produces: `getRegistrySnapshot()`, `connectWallet()`, and `registerPatent(draft, account, onStatus)`.
- Produces: contract-aligned `RegistryStats`, `PatentRecord`, `AuditPhase`, and `NetworkMode` types.

- [ ] **Step 1: Write validation tests**

Cover empty, maximum, oversized, control-character, and non-ASCII title/specification values using the contract limits of 160 and 4,000 characters.

- [ ] **Step 2: Run the tests to verify the module is missing**

Run: `npm test -- --run src/lib/validation.test.ts`

Expected: failure because `validation.ts` has not been implemented.

- [ ] **Step 3: Implement contract-aligned validation and formatting**

Return field errors and remaining character counts without mutating the draft. Add address and integer formatters that safely handle SDK bigint values.

- [ ] **Step 4: Implement the GenLayer adapter**

Create a read client for the configured chain, request wallet accounts through `window.ethereum`, create a provider-backed write client, submit `register_and_audit_patent`, wait for `FINALIZED`, verify `FINISHED_WITH_RETURN`, and refresh contract stats. Return demo data only when configuration is absent.

- [ ] **Step 5: Run unit tests**

Run: `npm test -- --run`

Expected: all validation tests pass.

### Task 3: Holographic Security Scene

**Files:**
- Create: `frontend/src/components/scene/SecurityScene.tsx`
- Create: `frontend/src/components/scene/HolographicShield.tsx`
- Create: `frontend/src/components/scene/ValidatorLattice.tsx`
- Create: `frontend/src/components/scene/ParticleField.tsx`

**Interfaces:**
- Consumes: `AuditPhase` and `prefersReducedMotion`.
- Produces: `<SecurityScene phase={phase} />`, a full-viewport noninteractive canvas.

- [ ] **Step 1: Build the shield core**

Use an extruded shield shape, wireframe shell, translucent emissive core, and phase-driven color and pulse speed. Keep geometry stable and dispose generated geometry on unmount.

- [ ] **Step 2: Build the validator lattice**

Place five validator nodes in an orbital ring, draw animated connections to the shield, and change node state from idle to scanning to agreement based on `AuditPhase`.

- [ ] **Step 3: Add the data field and fallbacks**

Render deterministic particles and scan rings without runtime randomness. Disable expensive motion for reduced-motion users and expose a CSS fallback if WebGL creation fails.

### Task 4: Dashboard Command Deck

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/layout/AppHeader.tsx`
- Create: `frontend/src/components/dashboard/MetricRail.tsx`
- Create: `frontend/src/components/dashboard/RegistryPulse.tsx`
- Create: `frontend/src/components/dashboard/RecentRecords.tsx`
- Create: `frontend/src/components/consensus/ConsensusVisualizer.tsx`
- Create: `frontend/src/components/registration/PatentRegistrationForm.tsx`
- Create: `frontend/src/hooks/usePatentGuard.ts`
- Create: `frontend/src/hooks/useReducedMotion.ts`
- Create: `frontend/src/styles.css`

**Interfaces:**
- Consumes: all domain services from Task 2 and `<SecurityScene>` from Task 3.
- Produces: the complete dashboard, wallet workflow, submission flow, visible status/error states, and mobile navigation.

- [ ] **Step 1: Implement the application controller hook**

Load contract stats and recent records, track wallet and network state, expose refresh/connect/submit actions, and map transaction lifecycle updates into the visual audit phases.

- [ ] **Step 2: Implement the shell and metric rail**

Use an offset editorial command-deck layout with a compact header, registry totals, approval ratio, client-side live queue count, and network state. Label demo values unambiguously.

- [ ] **Step 3: Implement the registration form**

Show inline contract-exact validation, character budgets, remaining attempts when connected, disabled and loading states, and an explicit final transaction result.

- [ ] **Step 4: Implement consensus and records views**

Visualize receipt phases as leader analysis, validator replay, vote reveal, and finality. Show approved and rejected records with readable reasons and stable timestamps.

- [ ] **Step 5: Implement responsive visual styling**

Define graphite, cyan, ultraviolet, amber, and signal-red tokens; use Space Grotesk, IBM Plex Sans, and IBM Plex Mono; keep glass surfaces square and thin; preserve keyboard focus, contrast, and mobile text fit.

### Task 5: Verification and Browser Quality

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: production build and local Vite preview.
- Produces: automated desktop/mobile rendering, interaction, overlap, and canvas-pixel evidence.

- [ ] **Step 1: Add browser checks**

Open desktop and mobile viewports, verify the dashboard and form are visible, assert there is no horizontal overflow, submit an invalid draft, and sample canvas pixels to prove the WebGL scene is nonblank.

- [ ] **Step 2: Run static verification**

Run: `npm run lint && npm test -- --run && npm run build`

Expected: zero lint errors, all tests pass, and Vite emits `dist/` successfully.

- [ ] **Step 3: Run browser verification**

Run: `npm run test:e2e`

Expected: desktop and mobile tests pass with nonblank canvas samples and no incoherent overlap.

- [ ] **Step 4: Audit ASCII and generated artifacts**

Scan authored frontend files for bytes above `0x7f`. Remove screenshots, reports, and caches while retaining `package-lock.json` and ignoring dependency contents.
