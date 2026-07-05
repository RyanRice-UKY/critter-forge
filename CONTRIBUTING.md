# Contributing to Survive the Stack / Critter Forge

## Run it locally

No build step. Pyodide needs HTTP (not file://):

```
python -m http.server 8931
```

Then open http://localhost:8931/survive.html (campaign) or
http://localhost:8931/index.html (critter prototype). The lesson pages have a
DEV bar: number buttons jump between checkpoints, Tab skips the current step.

## Workflow

1. Branch off `master`: `git checkout -b yourname/short-topic`
2. Make your change, commit, push: `git push -u origin yourname/short-topic`
3. Open a PR: `gh pr create` (or the GitHub UI)
4. CI must be green to merge. Merge your own PR when it is.
5. Merging to `master` auto-deploys the playable game to GitHub Pages.

`master` is protected: changes go through PRs with passing CI (the repo owner
can push directly for hotfixes).

## What CI runs (and how to run it yourself before pushing)

| Check | Command |
| --- | --- |
| Syntax on every JS file | `git ls-files '*.js' '*.mjs' \| xargs -n1 node --check` |
| Critter levels regression | `node verify.mjs` |
| Tower levels regression | `node tower-verify.mjs` |
| Trials (needs system `python`) | `node trials-verify.mjs` |
| Save/XP logic | `node docs/superpowers/plans/_savetest.mjs` |
| Trial grader logic | `node docs/superpowers/plans/_gradetest.mjs` |
| Keep questline logic | `node docs/superpowers/plans/_keeptest.mjs` |
| Boot the real game headless | `npm i playwright-core` then serve + `node ci/smoke.mjs` |

If your change breaks a suite, fix the change or update the suite in the same
PR with a note saying why.

## The one file to be careful with

`lesson1.js` holds the entire campaign (scenes, sprites, script, validators)
in one large file. Two people editing it at the same time WILL merge-conflict.
Coordinate by scene or beat before you both open it ("I'm in the workshop
rounds, stay out of playTypesArc"). Splitting it into modules is planned
future work.

## Where design lives

- `docs/superpowers/specs/` — approved feature designs
- `docs/superpowers/plans/` — implementation plans for those designs
- Mockup boards (pick-a-design pages) live in the repo root as
  `*-styles.html` / `*-design.html` and are kept for reference.

## Copy rules

Player-facing text uses plain punctuation: no em dashes. Error messages and
lesson copy stay in the craftsman's/narrator's voice; look at neighboring
strings before adding your own.
