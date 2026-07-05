# Team Git + CI/CD Setup — Design

Turn critter-forge into a team project: public GitHub hosting, branch/PR
workflow, CI on every PR, and auto-deploy of the playable game to GitHub
Pages on merge. Approved by Ryan 2026-07-05.

## Decisions (Ryan's)

- **Public repo + GitHub Pages** for CD (free; playable link for the team).
- **PRs + green CI required to merge; no reviewer-approval requirement.**
- **Ryan (admin) may push master directly** (`enforce_admins: false`);
  the teammate (write access, non-admin) goes through PRs.
- **CI depth:** syntax checks + all existing verify suites + a headless
  browser smoke of the real game.

## Components

1. **GitHub repo** `critter-forge`, public, under Ryan's account; current
   `master` pushed as-is (local WIP `armory-menus.html` and untracked
   scratch PNGs stay local). Requires `gh` CLI (winget) and a one-time
   interactive `gh auth login` by Ryan.
2. **CI workflow** `.github/workflows/ci.yml`, on `pull_request` and
   `push` to master, two jobs:
   - `checks` (ubuntu, ~1 min): setup-node 20 + setup-python 3.12;
     `node --check` over every tracked `.js`/`.mjs`; then
     `node verify.mjs`, `node tower-verify.mjs`, `node trials-verify.mjs`
     (system python), `node docs/superpowers/plans/_savetest.mjs`,
     `_gradetest.mjs`, `_keeptest.mjs`. Baseline confirmed green locally
     2026-07-05 (35 levels, tower, 8 trials, 31+16 logic tests, keep
     logic).
   - `smoke` (ubuntu, ~3-5 min): npm i playwright-core (no browser
     download; runner's preinstalled Chrome via `channel: 'chrome'`),
     `python -m http.server 8931` in background, run `ci/smoke.mjs`:
     loads `survive.html` (clicks NEW GAME, asserts lesson1 loads) and
     `lesson1.html#1.5` (waits for `#pystat` "python ready"), fails on
     any pageerror.
3. **Smoke script** `ci/smoke.mjs`, committed (adapted from the local
   drive patterns; deterministic, no screenshots).
4. **Pages workflow** `.github/workflows/pages.yml`: on push to master,
   `actions/upload-pages-artifact` (repo root, no build) +
   `actions/deploy-pages`. Pages source set to GitHub Actions. Game URL:
   `https://<user>.github.io/critter-forge/survive.html`.
5. **Branch protection** on `master` via gh api: require status checks
   `checks` and `smoke`, require PRs (0 approvals), enforce_admins
   false, no force pushes.
6. **CONTRIBUTING.md**: clone + local run (`python -m http.server 8931`),
   branch naming (`name/short-topic`), PR flow, what CI runs and how to
   run it locally, the deploy link, and the hot-file warning: lesson1.js
   is one large file; coordinate by scene/area to avoid merge conflicts
   (file split is future work). Specs/plans live in docs/superpowers.

## Verification

- First Actions run green on both jobs (watched via `gh run watch`).
- Pages URL loads the title screen in a real fetch (HTTP 200 on
  survive.html and a headless load with no pageerrors).
- Branch protection verified by API read-back
  (`gh api repos/:owner/critter-forge/branches/master/protection`).

## Out of scope

- Splitting lesson1.js into modules (future work; noted in docs).
- Adding the teammate as collaborator (Ryan's one-click action; steps
  documented in CONTRIBUTING.md).
- Custom domain, issue templates, release tagging.
