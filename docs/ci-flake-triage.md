# CI Flake Triage

CI on this repo goes red "here and there." Most of those reds are **not** the change under test —
they're transient infrastructure (a registry timing out, a CI runner without the right simulator) or
a **real bug wearing a flake costume** (a native data race that only trips under load). Without a
system, every red is triaged from scratch, nobody knows how often a given failure actually happens,
and hard-won knowledge evaporates.

This document is that system. It is deliberately lightweight: a shared vocabulary (the **signature
catalog**), a decision procedure (the **loop** + **playbooks**), and a durable ledger (**closed
GitHub issues** labeled `ci-flake`) that a scheduled agent keeps up to date.

## Principle

Every red is one of two things:

1. an **infra flake** — the code is fine; the environment failed. Fix is *build/CI resilience*.
2. a **real bug wearing a flake costume** — the code is wrong, but only intermittently. Fix is a
   *code fix + a permanent regression guard*.

The whole game is telling these apart **fast**, then driving each to a **permanent guard** so the
same red can never silently return. Two rules:

- **Record before you re-run.** A green-on-retry is data, not a resolution. Log the occurrence
  first; a signature that fails 1-in-3 is a different problem than 1-in-100.
- **A flake isn't "fixed" because it stopped appearing.** It's fixed when a guard exists (a
  regression test, a runner pin, or a build-resilience change). Until then it is `active`.

## The loop

**Collect → Classify → Reproduce → Accumulate → Mitigate → Guard.**

1. **Collect** — pull the failed jobs' logs (`gh run view <run-id> --log-failed`).
2. **Classify** — match the log against the [signature catalog](#signature-catalog). Known signature
   → append to its ledger issue. No match → open a `needs-triage` issue.
3. **Reproduce** — for anything that isn't obviously transient infra, reproduce locally (see
   [Local reproduction toolkit](#local-reproduction-toolkit)) and **quantify the rate**.
4. **Accumulate** — every occurrence and every finding lands on the signature's ledger issue, so the
   picture sharpens over time instead of resetting each incident.
5. **Mitigate** — apply the category [playbook](#categories--playbooks).
6. **Guard** — land the permanent guard, then flip the issue to `ci-flake:resolved`.

## Signature catalog

The heart of the system. Each recurring failure gets a stable **signature id** and a regex that
identifies it in a failed job's log. The scheduled sweep matches every failed job against this table;
maintainers extend it whenever a new signature earns a `needs-triage` issue.

| id | match (regex over failed-job logs) | category | status |
|----|------------------------------------|----------|--------|
| `sonatype-504` | `oss\.sonatype\.org` **and** `504` | infra-transient | active — mitigation proposed |
| `ios-no-devices` | `No devices found for the matching requirements` | infra-runner | active — fix in flight (#300 / #303) |
| `android-harness-native-crash` | (`SIGSEGV`\|`bridge disconnected`\|`global reference table overflow`) in the harness **test** step | product-bug | active — partial fix (#297 / #298) |
| `rive-trigger-rerender` | `expected 2 to be greater than or equal to 3` | test-timing | resolved — guarded by #303 |
| `needs-triage` | *(fallback — nothing above matched)* | needs-triage | — |

Notes on the seeds:
- **`sonatype-504`** — a build-time dependency (`app.rive:rive-android`, or a Google artifact like
  `aapt2`) is resolved against `https://oss.sonatype.org/content/repositories/snapshots`, which
  returns `504 Gateway Time-out`. Gradle treats a `5xx` as a **hard failure** for that artifact
  rather than falling through to `google()` / `mavenCentral()`, so the whole build dies. The
  snapshots repo is **not declared in this project** — it's injected transitively (via
  `com.facebook.react.settings` / autolinking). Confirm the injector with
  `grep -rn "oss.sonatype" node_modules/@react-native example/android`.
- **`android-harness-native-crash`** — the Android data-binding native SIGSEGV / heap corruption
  from off-main-thread access to the Rive runtime. #298 fixed only the Java listener-map
  `ConcurrentModificationException`, not the underlying off-thread native access. Reproduces locally
  ~1-in-10 runs. **This is a real bug**, not infra — do not just re-run it.

## Categories → playbooks

| category | what it means | playbook |
|----------|---------------|----------|
| **infra-transient** | network / registry hiccup (e.g. a `504`) | Fix *build resilience*, not code. Retry-wrap the affected step and/or remove the fragile dependency path. No local repro needed. |
| **infra-runner** | CI runner lacks the right OS / simulator | Pin the runner, OS, Xcode, and simulator to a known-good combination. |
| **test-timing** | test races a wall-clock (`setInterval`, `waitFor` with zero margin) | Make it **deterministic** (drive the state change directly instead of racing a timer), then add a regression-guard harness test that reproduces the old failure. |
| **product-bug** | real crash / data race that only trips under load | Build a reproducer (a toggleable stress page under `example/src/reproducers/`), reproduce under **TSan** / a stress loop, fix, and keep a `*.harness.tsx` guard. |

## Ledger: closed GitHub issues labeled `ci-flake`

The ledger is a **knowledge base, not an open-work queue** — so every signature issue lives in the
**closed** state and never pollutes the open tracker (which stays for real user-facing bugs and
features). One issue per signature id. Status is carried by **label + GitHub's native close-reason**,
so "still happening" vs "actually fixed" is distinguishable without ever reopening:

| state | label | close-reason | meaning |
|-------|-------|--------------|---------|
| **active** | `ci-flake:active` | `not planned` (grey) | recurring; no permanent guard yet |
| **resolved** | `ci-flake:resolved` | `completed` (purple ✓) | a permanent guard landed |
| **regression** | `ci-flake:active` (flipped back) | `not planned` | a `resolved` signature recurred — guard failed |

A `resolved` signature that recurs is flipped back to `ci-flake:active`, gets a
`⚠️ regressed after guard` line in its occurrence log, and pings maintainers — a failed guard is
never silently buried.

**Queries:**
```
gh issue list --state closed --label ci-flake:active     # what still needs a guard
gh issue list --state closed --label ci-flake:resolved   # guarded history
gh issue list --state open   --label ci-flake            # should always be empty
```

### Issue body template

```markdown
**Signature:** `sonatype-504`
**Regex:** `oss\.sonatype\.org` and `504`
**Category:** infra-transient
**First seen:** 2026-07-01 · **Last seen:** 2026-07-01

## Occurrence log
- 2026-07-01 — build-android + test-harness-android — https://github.com/.../actions/runs/28515198582

## Hypothesis
Gradle resolves a build dep against oss.sonatype.org snapshots; a 504 there is a hard failure
(no fall-through to google()/mavenCentral()). The un-retried Gradle build step then fails the job.

## Reproduction
Not locally reproducible (server-side outage). Frequency tracked via occurrence log above.

## Mitigation
- [ ] Retry-wrap the Gradle build steps (build-android, test-harness-android "Build Android app").
- [ ] Scope/remove the injected snapshots repo via Gradle `content { }` filtering.

## Closing criterion (guard)
A build-resilience change is merged such that a Sonatype 504 can no longer fail the job → move to
`ci-flake:resolved`.
```

## Local reproduction toolkit

Reuse what's already here — don't build new harnesses.

- **Reproducer pages** — `example/src/reproducers/`. Pages are auto-discovered via `require.context`
  in `example/src/PagesList.ts`; each is a React component with a `metadata` field
  (`example/src/shared/metadata.ts`). Put work-in-progress repros under
  `example/src/reproducers/local/` (gitignored). Toggleable stress pages already exist as models:
  `Issue297ThreadRace.tsx` (concurrent data-binding access under TSan) and `AndroidGlobalRefOverflow.tsx`
  (JNI global-ref churn).
- **Regression-guard harness tests** — `example/__tests__/*.harness.tsx`, run via
  `yarn test:harness:ios` / `yarn test:harness:android` (config `example/rn-harness.config.mjs`). A
  good guard **reproduces the old failure deterministically** (see `use-rive-trigger.harness.tsx`,
  which blocks the JS thread at mount to force the starvation that #230 flaked on).
- **Quantify the rate** — run a harness test N times and record pass/fail. "1-in-100" vs "1-in-3"
  changes the priority and is the only honest way to know a fix worked (this is how #230 was measured
  at ~1%).
- **TSan for native races** — `rn-harness.config.mjs` wires `TSAN_OPTIONS` (`halt_on_error=0`) on
  iOS so races surface without aborting on the first. Use it for `product-bug` signatures.

## Collection: the scheduled sweep

A scheduled cloud agent runs the [loop](#the-loop)'s Collect + Classify + Accumulate steps daily so
the ledger stays current without anyone babysitting CI:

1. List recent failed runs — `gh run list --status failure --created "$(since 48h)"`.
2. For each, pull the failed logs — `gh run view <id> --log-failed` — and match against the
   [signature catalog](#signature-catalog).
3. For each matched signature, **create-closed or update** its `ci-flake` issue:
   - **new signature** → create the issue **already closed** with `ci-flake` + `ci-flake:active`
     (reason `not planned`), body from the [template](#issue-body-template), occurrence log seeded.
   - **known `active`** → append the run to the occurrence log, bump *Last seen* (stays closed).
   - **known `resolved` that recurred** → flip to `ci-flake:active`, append `⚠️ regressed after
     guard`, ping maintainers.
   - **no match** → open a closed `needs-triage` `ci-flake` issue for a human to classify (and add a
     new catalog row).

The agent only records/files and adjusts labels + close-reason. It **never** reopens for routine
logging, re-runs jobs, or mutates CI.

Useful commands:
```
gh issue create --label ci-flake,ci-flake:active --title "…" --body-file … && gh issue close <n> --reason "not planned"
gh issue comment <n> --body "- <date> — <jobs> — <run-url>"
gh issue edit <n> --remove-label ci-flake:resolved --add-label ci-flake:active
gh issue close <n> --reason completed   # when a guard lands
```

## Immediate recommended mitigations

Documented here as the current backlog; tracked on their ledger issues.

- **`sonatype-504`** (highest payoff — it took out two jobs in one run):
  1. **Retry-wrap the Gradle build steps that currently have no retry.** The existing iOS 5× / Android
     3× retry loops wrap only the *harness test run*, not the Gradle **build** — so a 504 during
     `build-android`'s build or `test-harness-android`'s "Build Android app" step is fatal on the
     first hit. Wrap them (shell retry loop or `nick-fields/retry`).
  2. **Root-cause fix:** locate the injected snapshots repo and add Gradle `content { }` filtering so
     `google()` / `mavenCentral()` artifacts (aapt2, AGP, …) never resolve against oss.sonatype.org.
- **`ios-no-devices`**: land the runner pinning (#300 / #303 — `macos-15`, Xcode 26.3, simulator
  `iPhone 16 Pro` on iOS `>=26.0`) and rebase open branches onto it.

## Adding a new signature

1. A `needs-triage` issue appears (or you hit a new red). Read the failed log; find a stable,
   specific substring/regex.
2. Add a row to the [signature catalog](#signature-catalog) with an id, regex, category, status.
3. Rename/relabel the `needs-triage` issue to the new signature id; set `ci-flake:active`.
4. Follow the category [playbook](#categories--playbooks) toward a guard.
