# AI-PatentGuard

AI-PatentGuard is a GenLayer intelligent contract for registering AI prompts,
multi-agent architectures, and algorithm descriptions after an LLM-backed
semantic originality audit. The contract stores the submitted work and the
Chief Judge decision on chain. Validators independently rerun the audit and
must agree on the substantive decision before the state transition completes.

The originality verdict is deliberately **bounded**: it is a deterministic,
gas-optimized semantic check over a *sampled sliding window of the 64 most
recent approved registry entries*, not a claim of global prior art or
authorship. See [Originality Scope](#originality-scope-sampled-sliding-window)
for the exact guarantee this window provides and why it is the correct trade-off
for decentralized GenVM consensus.

## Protocol Goals

- Establish a public, timestamped registry of AI intellectual property claims.
- Detect substantial semantic copying and paraphrased protected logic.
- Keep the final decision and reason auditable on chain.
- Limit each inventor to three lifetime submission attempts.
- Preserve deterministic state changes around the nondeterministic audit.
- Provide owner-controlled emergency pause and ownership transfer controls.

This protocol records registration claims and consensus decisions. It does not
create legal patent rights, replace a patent office, prove authorship, or
adjudicate outside prior art. Each verdict is scoped strictly to the sampled
on-chain corpus described below and to the evidence supplied to the contract.

## Originality Scope: Sampled Sliding Window

The originality verdict is **not** a global prior-art search and **cannot**
verify authorship or detect copying of work that lives outside this contract.
It is a deterministic, gas-optimized semantic comparison against a bounded
**sampled sliding window** of the registry.

### What the audit actually compares

At audit time the contract assembles the corpus in `_build_approved_corpus()`:

- It scans stored patents **newest-first**.
- It includes only records with `is_approved == true` (rejected records are
  never used as evidence).
- It stops once it has collected `MAX_CORPUS_PATENTS = 64` approved entries.
- The selected window is re-sorted into ascending patent-id order and serialized
  as compact, ASCII-only JSON.

So the Chief Judge and every validator compare the candidate against **at most
the 64 most recent approved patents** — a moving window that slides forward as
new approvals are appended. Anything older than the 64th most recent approval,
any rejected submission, and any work that was never registered here are all
outside the verdict's field of view **by design**.

### Why the window is bounded (GenVM calldata + consensus reliability)

GenLayer finalizes a write only when the leader's result and every validator's
independent re-execution agree. That places three hard constraints on the audit
prompt, and the 64-entry window satisfies all three deterministically:

- **Bounded GenVM calldata / prompt size.** An unbounded corpus would grow the
  serialized prompt linearly with the registry. A fixed 64-entry cap keeps the
  calldata and the model context window inside a predictable ceiling
  (`64 x (160-char title + 4,000-char spec)` upper bound), regardless of how
  large the registry becomes.
- **Consensus reliability.** Smaller, stable prompts keep the leader and
  validators evaluating the *same* bounded evidence set, which is what makes the
  nondeterministic LLM step reproducible enough to reach `MAJORITY_AGREE`.
  An ever-growing prompt raises latency, cost, and the probability of validator
  divergence — the opposite of what a consensus system needs.
- **Bounded prompt-injection surface.** Every extra stored string is untrusted,
  attacker-influenced input. Capping the corpus caps how much hostile text can
  ever reach the model in one audit.

### The resulting claim (narrowed)

> A record's `is_approved` verdict certifies only that, at registration time, an
> LLM-backed validator quorum found it semantically original **relative to the
> sampled window of up to 64 most recent approved entries in this registry**.
> It is not evidence of global novelty, first authorship, or non-infringement of
> any work outside that sampled corpus.

This narrowing is the intentional response to the Steward review: rather than
overstate the guarantee, the documentation, the on-chain audit prompt, and the
`MAX_CORPUS_PATENTS` contract comment now describe the exact bounded scope the
implementation delivers. A future phase can widen the guarantee via verifiable
provenance and a challenge/appeal path (see
[Roadmap: Verifiable Provenance](#roadmap-verifiable-provenance-and-challenge-path)).

## Repository Layout

```text
contracts/
  ai_patent_guard.py
tests/
  direct/
    test_ai_patent_guard.py
pytest.ini
README.md
```

## Architecture

### Persistent State

`AIPatentGuard` uses GenLayer storage-native types:

- `owner: Address` identifies the administrative account.
- `patents: DynArray[PatentRecord]` stores every finalized audit record.
- `submission_attempts: TreeMap[Address, u256]` tracks lifetime attempts per inventor.
- `total_submission_attempts: u256` tracks all consumed attempts.
- `approved_patent_count: u256` tracks approved records.
- `rejected_patent_count: u256` tracks rejected records.
- `paused: bool` stops new registrations during an operational incident.

Each `PatentRecord` contains:

- `inventor`
- `title`
- `specification_text`
- `timestamp`
- `is_approved`
- `audit_reason`

Rejected records remain in the registry so the protocol retains a complete
audit trail. Rejected records are not sent back to the LLM as plagiarism corpus
entries for later submissions.

### State Machine

```text
READY
  |
  | valid title, specification, sender, and remaining attempt
  v
RESERVED
  |
  | increment inventor and global attempt counters
  v
AUDITING
  |
  | leader calls gl.nondet.exec_prompt with sampled 64-entry approved window
  v
CONSENSUS_CHECK
  |                         |
  | validators agree        | invalid output or disagreement
  v                         v
FINALIZED                 UNDETERMINED
  |                         |
  | append approved or      | no post-audit record is written
  | rejected PatentRecord   | and the transaction must retry
  v
READY
```

The `RESERVED` state is logical rather than a stored enum. It is represented by
the attempt counter update before the nondeterministic call. GenLayer rolls
back the entire transaction if consensus fails or the leader raises an error,
so a failed transaction does not permanently consume an attempt.

## Registration Flow

The public write method is:

```python
register_and_audit_patent(title: str, specification_text: str) -> u256
```

The returned `u256` is the newly appended patent record ID.

### Checks

Before any state mutation, the contract verifies:

- Registration is not paused.
- Title is non-empty, printable ASCII, and at most 160 characters.
- Specification is non-empty, ASCII, and at most 4,000 characters.
- The inventor has fewer than `MAX_ATTEMPTS = 3` previous attempts.
- Existing approved records can be assembled into the audit corpus.

### Effects

The contract captures the timestamp and increments both:

- `submission_attempts[inventor]`
- `total_submission_attempts`

These updates happen before the LLM call. No storage write occurs inside a
nondeterministic function.

### Interactions

The contract creates a prompt containing:

- The sampled window of up to 64 most recent approved titles and
  specifications (see [Originality Scope](#originality-scope-sampled-sliding-window)).
- The candidate title and specification.
- Explicit instructions to treat all submitted text as untrusted evidence.
- A strict JSON response contract:

```json
{
  "decision": "APPROVED",
  "reason": "Concise printable English ASCII explanation."
}
```

Only `APPROVED` and `REJECTED` decisions are accepted. The validator reruns the
same audit independently and compares the decision field. Reason text is
validated for ASCII and length but is intentionally not required to match
verbatim because LLM explanations can differ while reaching the same decision.

After consensus, the deterministic execution path appends the final record and
increments exactly one of `approved_patent_count` or
`rejected_patent_count`.

## Anti-Grinding Controls

`MAX_ATTEMPTS` is a lifetime limit of three attempts per inventor address.

- Invalid input fails before an attempt is consumed.
- A finalized approval or rejection consumes one attempt.
- A consensus failure reverts the complete transaction atomically.
- Attempt counters are isolated by inventor address.
- A fourth finalized attempt is rejected before the LLM interaction.

This limit is intentionally lifetime-based. There is no time-window reset in
the current phase, which prevents repeated identity grinding from being hidden
behind a rate-window boundary.

## Administrative Controls

Only `owner` can call:

- `set_paused(bool)` to stop or resume registration.
- `transfer_ownership(Address)` to replace the owner.

The zero address is rejected as a new owner. Read methods are available for the
owner, inventors, indexers, and auditors:

- `get_patent_record(patent_id)`
- `get_registry_stats()`
- `get_submission_attempts(inventor)`
- `get_remaining_attempts(inventor)`
- `get_owner()`
- `is_registration_paused()`

## Testing

The direct suite contains more than 15 tests and covers:

- Initial state and ownership.
- Approved and rejected records.
- Timestamp and field persistence.
- Whitespace normalization.
- Empty and oversized inputs.
- ASCII and control-character enforcement.
- Three-attempt anti-grinding limit.
- Per-inventor isolation.
- Pause and resume behavior.
- Owner authorization and ownership transfer.
- Zero-address rejection.
- Unknown record handling.
- LLM response normalization and malformed responses.
- Atomic rollback on invalid LLM output.
- Approved versus rejected corpus inclusion.
- Mixed-decision registry invariants.

Run the full suite with:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
  pytest -p gltest.direct.pytest_plugin -p no:cacheprovider -v
```

The environment currently contains an unrelated Hydra pytest plugin that is not
compatible with Python 3.14 because it imports the removed `typing.io` module.
The command above disables third-party auto-loading and explicitly enables the
GenLayer direct plugin. `pytest.ini` also disables the Hydra plugin when normal
plugin loading is available.

Direct mode executes the leader path and mocks `gl.nondet.exec_prompt`. It does
not exercise real multi-validator agreement or automatically roll back earlier
in-memory storage writes when a mocked interaction raises. Malformed-response
tests therefore assert that no final record was appended and use VM snapshots
to restore the pre-call state. Run an integration test against a GenLayer
environment before deployment to validate transaction rollback, validator
behavior, and network-level consensus.

## Contract Validation

Run the GenLayer static and SDK checks:

```bash
genvm-lint check contracts/ai_patent_guard.py
genvm-lint schema contracts/ai_patent_guard.py --json
genvm-lint typecheck contracts/ai_patent_guard.py
```

The contract uses a pinned `py-genlayer` runner dependency. Do not replace it
with `py-genlayer:test`, `py-genlayer:latest`, or an unversioned dependency for
network deployment.

## Active Deployment (Studionet)

The current live instance on GenLayer Studionet:

| Field | Value |
| --- | --- |
| Network | `studionet` (chainId `61999`, `https://studio.genlayer.com/api`) |
| Contract address | `0x36036f497a07B5b8E03759F681A0214Bc5e7F0f9` |
| Deploy tx hash | `0x18c7260d76daeb76ad00677a5c0643bad14205b3b143cadd97da5ff4fa57e570` |
| Deployer / owner | `0x50695B75CaBe031CD4cfaD1F16dA338b658D3b48` |
| Deployed | 2026-08-22 |
| Explorer | https://genlayer-explorer.vercel.app |

The canonical machine-readable record lives in
[`deployments/studionet.json`](deployments/studionet.json). The frontend reads
this address from `VITE_CONTRACT_ADDRESS` (see `frontend/.env.local`); the
deployer credentials live in the gitignored root `.env`.

```bash
# Verify the live deployment
genlayer receipt 0x18c7260d76daeb76ad00677a5c0643bad14205b3b143cadd97da5ff4fa57e570
genlayer call    0x36036f497a07B5b8E03759F681A0214Bc5e7F0f9 get_owner
genlayer schema  0x36036f497a07B5b8E03759F681A0214Bc5e7F0f9
```

## Deployment Guide

1. Install the GenLayer CLI and authenticate with a deployment account.
2. Run the lint, schema, typecheck, and direct test commands above.
3. Start or select the target GenLayer network.
4. Deploy the contract source:

```bash
genlayer deploy --contract contracts/ai_patent_guard.py
```

5. Save the deployed contract address and inspect its schema:

```bash
genlayer schema <CONTRACT_ADDRESS>
```

6. Confirm the owner address and pause state with read calls.
7. Fund the submitting account according to the target network requirements.
8. Submit a small ASCII-only registration through the write interface.
9. Wait for consensus and finality, then read the returned patent record.
10. Monitor receipts and traces for nondeterministic audit failures before
    accepting production traffic.

The contract has no registration fee or bond in this phase. A future fee
mechanism should be added only with an explicit payable interface, accounting
rules, and a tested refund or treasury policy.

## Security and Operational Notes

- Submitted text is included in an LLM prompt and must be treated as hostile
  prompt-injection material.
- The audit is semantic and probabilistic; consensus validates agreement among
  validators, not legal ownership.
- The verdict scope is bounded to a sampled sliding window of the 64 most recent
  approved entries (`MAX_CORPUS_PATENTS`). It is not global prior art and does
  not verify authorship — see
  [Originality Scope](#originality-scope-sampled-sliding-window). Do not present
  an approval as proof of global novelty.
- The sampled window keeps prompt size, GenVM calldata, and validator workload
  bounded as the registry grows. Widening the guarantee (deeper or full-corpus
  retrieval) requires a separately verified indexing layer plus the provenance
  and challenge mechanisms outlined in the roadmap below.
- The owner pause switch is an emergency control, not a plagiarism override.
- Do not add storage fields in the middle of an already deployed layout.
  Append-only storage evolution is required for upgrade-safe deployments.
- Real network deployment should include integration tests for validator
  rotation, malformed model responses, and consensus timeout behavior.

## Roadmap: Verifiable Provenance and Challenge Path

The current phase intentionally ships the narrowed, bounded-window guarantee
described in [Originality Scope](#originality-scope-sampled-sliding-window). The
following extensions would let a later phase make a stronger originality claim
without sacrificing GenVM determinism:

- **Verifiable provenance.** Bind each submission to a signed authorship
  attestation (inventor signature and/or content hash committed at a known
  block) so a record carries evidence of *who* submitted *what*, and *when*,
  independent of the LLM verdict.
- **Deeper / full-corpus retrieval.** Replace the flat 64-entry scan with a
  separately verified indexing or embedding layer that can surface the most
  relevant prior entries beyond the recency window while still handing the model
  a bounded, deterministic evidence set.
- **Challenge and appeal path.** Add a bonded challenge window in which a third
  party can contest an approval by submitting a colliding prior entry, triggering
  a re-audit and, on success, flipping the record and slashing the challenged
  bond. This gives the registry a corrective mechanism for prior art the sampled
  window could not see.

Each of these is additive and append-only with respect to the deployed storage
layout, consistent with the upgrade-safety rules in
[Security and Operational Notes](#security-and-operational-notes).

## License

No license has been selected for this phase. Add an explicit license before
public distribution.
# PatentGuard
