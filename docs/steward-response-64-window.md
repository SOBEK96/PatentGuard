# Steward Response — Originality Verdict Scope (64-Registry Window)

**To:** Pavel Kolosov, Steward
**Re:** AI-PatentGuard — originality verdict scope and provenance
**From:** AI-PatentGuard maintainers

---

Hi Pavel,

Thank you for the precise review — your read of the mechanism is exactly right,
and it identified a real gap between what the contract *did* and what the
documentation *claimed*. The originality verdict does compare a candidate only
against the 64 most recent approved registry entries, and it does not attempt to
verify authorship or reach outside prior art. We agree with the finding and have
taken the first of the two paths you offered: **we narrowed the claim to the
sampled corpus**, and made that scope explicit and consistent everywhere it is
asserted.

**What changed:**

1. **Documentation.** The README now leads with the bounded framing and adds a
   dedicated *Originality Scope: Sampled Sliding Window* section. It states the
   narrowed claim verbatim: an `is_approved` verdict certifies only that a
   validator quorum found the work semantically original **relative to the
   sampled window of up to 64 most recent approved entries in this registry** —
   not global novelty, first authorship, or non-infringement of anything outside
   that corpus. The state-machine diagram, the prompt-contents description, and
   the operational notes were corrected to match.

2. **On-chain audit prompt.** The Chief Judge instruction previously told the
   model to judge originality "relative to every approved patent in the
   registry." That wording overstated the evidence the model actually receives,
   so we changed it: the prompt now states that the listed set is "a bounded,
   sampled sliding window of the most recent approved entries and is not the
   entire registry or any outside prior art," and instructs the model to judge
   only against the provided evidence. The `MAX_CORPUS_PATENTS` constant now
   carries a scope-of-verdict comment for future auditors.

**Why the window is bounded — an intentional architectural trade-off, not an
oversight.** GenLayer finalizes a write only when the leader's result and every
validator's independent re-execution agree. That makes prompt determinism a
first-class correctness property, not a performance nicety:

- **Bounded GenVM calldata and model context.** An unbounded corpus grows the
  serialized prompt linearly with the registry. The fixed 64-entry cap holds
  calldata and context inside a predictable ceiling no matter how large the
  registry grows.
- **Consensus reliability.** A stable, bounded evidence set is what keeps the
  leader and validators evaluating the *same* input, which is what makes the
  nondeterministic LLM step reproducible enough to reach `MAJORITY_AGREE`. An
  ever-growing prompt raises latency, cost, and the probability of validator
  divergence — precisely the failure mode a consensus protocol must avoid.
- **Bounded prompt-injection surface.** Every stored string is untrusted,
  attacker-influenced input; capping the corpus caps how much hostile text can
  reach the model in any single audit.

So the sampled window is the design that makes decentralized AI consensus
tractable here. We think the right response to your feedback is to make the
guarantee *honest and precise* rather than to trade away that determinism.

**On the stronger claim you pointed to.** We've documented a roadmap for the
second path — verifiable provenance (signed authorship attestations bound to a
committed content hash and block), deeper indexed/embedding-based retrieval that
still hands the model a bounded evidence set, and a bonded challenge/appeal path
that lets a third party contest an approval with colliding prior art and trigger
a re-audit. Each extension is additive and append-only against the deployed
storage layout, so it can land without breaking upgrade safety. We'd welcome
your input on prioritizing those for the next phase.

**Fresh deployment.** A new Studionet instance carrying the updated, narrowed
audit prompt is now live (the previous instance predates the wording change):

| Field | Value |
| --- | --- |
| Network | `studionet` (chainId `61999`) |
| Contract address | `0x880B741C6Ba006F0B3Dc57a9536449D27C9Df024` |
| Deploy tx hash | `0xfd61a86a179c9178821b82093f2a82c3b98c8a4492378dc741fa0641289be8e0` |
| Owner | `0x50695B75CaBe031CD4cfaD1F16dA338b658D3b48` |
| Deployed | 2026-08-23 |

You can confirm the deployed source carries the narrowed scope wording with
`genlayer code 0x880B741C6Ba006F0B3Dc57a9536449D27C9Df024`.

Pointers for re-review:

- `README.md` → *Originality Scope: Sampled Sliding Window* and *Roadmap:
  Verifiable Provenance and Challenge Path*
- `contracts/ai_patent_guard.py` → `MAX_CORPUS_PATENTS` comment and the
  `audit_prompt` scope wording in `register_and_audit_patent`
- `deployments/studionet.json` → canonical machine-readable deployment record

Thanks again for the careful and actionable review.

— AI-PatentGuard maintainers
