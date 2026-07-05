# Team Git + CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) — this plan has an interactive auth gate and account-level actions; it is executed in-session, not via subagents. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Public GitHub repo with PR-gated master (admin bypass for Ryan), two-job CI (checks + browser smoke), and GitHub Pages auto-deploy.

**Architecture:** Three committed artifacts (`.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `ci/smoke.mjs`, plus `CONTRIBUTING.md`), then gh-driven account setup (repo create/push, Pages enable, branch protection), then end-to-end verification of the first runs.

**Tech Stack:** gh CLI (installed), GitHub Actions (ubuntu-latest: node 20, python 3.12, preinstalled Chrome), GitHub Pages via actions.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-team-git-cicd-design.md` (decisions: public, PRs+CI required, 0 approvals, enforce_admins false).
- Local suite baseline is green (verified 2026-07-05); CI must not add suites beyond the six verified ones.
- Nothing local-only gets pushed accidentally: `armory-menus.html` WIP stays uncommitted; scratch PNGs stay untracked.
- The smoke script must be deterministic (no screenshots, generous timeouts, fail on pageerror).

---

### Task 1: Committed artifacts

- [ ] `ci/smoke.mjs` — boots the served game headless: survive.html → click NEW GAME → lesson1.html renders; then lesson1.html#1.5 → wait `#pystat` includes "python ready" (timeout 180s; CI cold-cache Pyodide is slow); collect pageerrors; exit 1 on any failure. Uses playwright-core `channel: 'chrome'`.
- [ ] `.github/workflows/ci.yml` — jobs `checks` and `smoke` per spec. `checks`: checkout, setup-node 20, setup-python 3.12, `git ls-files '*.js' '*.mjs' | xargs -n1 node --check`, then the six suite commands. `smoke`: checkout, setup-node, setup-python, `npm i playwright-core`, background `python -m http.server 8931`, `node ci/smoke.mjs`.
- [ ] `.github/workflows/pages.yml` — on push to master: configure-pages, upload-pages-artifact (path `.`), deploy-pages; `permissions: pages: write, id-token: write`.
- [ ] `CONTRIBUTING.md` — team workflow per spec (clone/run/branch/PR/CI/deploy link, lesson1.js hot-file warning, local commands for every CI check).
- [ ] Commit all four files.

### Task 2: Account setup (gh)

- [ ] Ryan authenticates: `! gh auth login` (interactive, one time).
- [ ] `gh repo create critter-forge --public --source . --remote origin --push` (pushes master).
- [ ] Enable Pages with Actions source: `gh api -X POST repos/{owner}/critter-forge/pages -f build_type=workflow` (POST may 409 if auto-enabled; then PUT).
- [ ] Branch protection: `gh api -X PUT repos/{owner}/critter-forge/branches/master/protection` with required_status_checks (contexts: checks, smoke; strict true), required_pull_request_reviews (required_approving_review_count 0), enforce_admins false, restrictions null, allow_force_pushes false.

### Task 3: Verify end to end

- [ ] `gh run watch` the first CI run on master → both jobs green.
- [ ] Pages deploy run green; fetch `https://<owner>.github.io/critter-forge/survive.html` → HTTP 200; headless load → no pageerrors.
- [ ] Read back branch protection via API; confirm contexts + 0 approvals + enforce_admins false.
- [ ] Report the repo URL, play URL, and the collaborator-invite step to Ryan.
