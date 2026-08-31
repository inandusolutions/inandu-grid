# Contributing to inandu-grid

Thanks for taking the time to contribute.

## Ground rules

- Be respectful — see the [Code of Conduct](.github/CODE_OF_CONDUCT.md).
- For anything non-trivial, open an issue first so we can agree on the approach
  before you write code.
- Security issues: **do not** open a public issue — see
  [`.github/SECURITY.md`](.github/SECURITY.md).

## Project layout

Angular CLI multi-project workspace:

- **`projects/inandu-grid/`** — the library (`@inandu-solutions/grid-angular`). This is the only
  thing that ships. Public API is `projects/inandu-grid/src/public-api.ts`. Its pure,
  framework-agnostic logic lives in `src/lib/core/` (no `@angular/*` imports).
- **`src/`** — the demo app (`grid-app`). Exists only to exercise the library; keep
  it a thin usage example.

Selector prefix is `inandu` for the library, `app` for the demo. `tsconfig.json`
(workspace root) is strict, and template type-checking is enforced.

## Setup

Requires Node `^20.19 || ^22.12 || >=24` (see [`.nvmrc`](.nvmrc)) and npm 10+.

```bash
npm install
```

## The build-order gotcha

The demo app's `tsconfig.json` maps the `@inandu-solutions/grid-angular` import specifier to the
**built** output in `dist/inandu-grid`, not to the library's TS source. So:

**Any time you change files under `projects/inandu-grid/src/`, run
`npm run build:lib` before building/serving/testing the demo app** — otherwise you
are testing stale code (or get a "cannot find module" error on a clean checkout).

`npm start`, `npm run build`, and the e2e config build the library first for you.

## Commands

```bash
npm start            # build lib + ng serve — http://localhost:4200
npm run build:lib    # build the library only
npm run build        # build library + demo app
npm run lint         # lint both projects
npm run test:lib     # library unit tests (Karma/Jasmine, headless Chrome)
npm test             # demo app unit tests
npm run e2e          # Playwright e2e against the built demo (auto-serves on :4202)
```

One-shot headless unit run (no watch, no interactive Chrome):

```bash
npx ng test inandu-grid --watch=false --browsers=ChromeHeadless
```

To focus a single spec, use Jasmine's `fdescribe` / `fit` (Karma has no CLI file
filter), then run the command above.

### Cross-browser unit tests

Each project has its own `karma.conf.js` that registers the Firefox/Safari
launchers (Angular's built-in karma config only wires up Chrome).

- Chrome: `--browsers=ChromeHeadless` (default)
- Firefox: `--browsers=FirefoxHeadless` — needs Firefox installed
- Safari: `--browsers=Safari` — real Safari on macOS only, no headless mode

## Before you open a PR

Run and make sure all pass:

```bash
npm run lint
npm run build:lib
npm run test:lib -- --watch=false --browsers=ChromeHeadless
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

- Add or update unit tests for any behavior change (library specs live in
  `projects/inandu-grid/src/lib/**/*.spec.ts`).
- Update [`CHANGELOG.md`](CHANGELOG.md) under `## [Unreleased]`.
- If you change the public API, update `projects/inandu-grid/README.md` too.
- Keep the demo app a minimal usage example — don't accrete app logic there.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(inandu-grid): add column pinning to the right edge
fix(inandu-grid): clamp requestedPage after data() shrinks
docs(readme): document the paging options object
```

Scope is usually `inandu-grid` (library) or `grid-app` (demo).

## Pull requests

- One logical change per PR.
- Fill in the PR template.
- CI must be green (lint, unit tests, build, e2e).
- A maintainer will review; squash-merge is the default.
