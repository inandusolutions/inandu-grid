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
npm run api:check    # after build:lib: the exported API matches api/public-api.txt
npm run api:update   # rewrite that snapshot (review the diff: it is the API change of the release)
npm run check:package    # after build:lib: jspdf on demand, size budgets, tarball contents, entry points
npm run smoke:package    # after build:lib: install the packed tarball in an empty project and compile a consumer
```

### Why the unit tests still run on Karma

Karma is deprecated in Angular, but it still works and the library's specs need a real browser (the CDK virtual scroller, row
measurement, `ResizeObserver`, focus). Moving to Vitest was tried on 2026-11-20 and put off on purpose:

- The Angular builder (`@angular/build:unit-test`, `runner: vitest`) runs with one change to `angular.json`; with happy-dom, the
  specs without Jasmine passed (translations 4/4, differential corpus 22/22).
- The rest do not run as they are: the specs use `spyOn`, `jasmine.createSpy`, `expectAsync`, `toBeTrue`/`toBeFalse` and
  `fakeAsync` (about 230 places to convert), the virtual-scroll and keyboard specs need real layout (so Vitest's browser mode,
  not happy-dom), and the coverage thresholds in CI would have to be set again for v8 coverage.
- Do it when Angular announces Karma's removal, or when Karma starts to get in the way. Suggested split: (1) the Vitest builder in
  browser mode with two specs that do not use Jasmine; (2) convert the specs file by file; (3) the coverage thresholds.
  The React and Vue grids already use Vitest, and the Pro Angular repo has the same Karma setup, so decide them together.

A pull request that changes the public API (an input, an export, a type) has to include the updated `api/public-api.txt`; CI
fails otherwise. Size budgets live in `scripts/check-package.mjs`: raise one there when the growth is intended.

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

## Dependency updates

Dependabot opens its pull requests on Mondays: one run for npm and one for GitHub Actions. Packages that peer-pin each other are grouped, so they move together in one pull request instead of breaking each other in separate ones:

- **angular**: `@angular/*`, `@angular-devkit/*`, `ng-packagr` and `zone.js`. The Angular build tooling peer-pins the exact `@angular/compiler` version, so these always move together.

Every other development dependency gets one grouped pull request for minor and patch updates. Major updates are never grouped: each one is its own pull request, read and decided on its own.

Rules for these pull requests:

- They need the same green checks as any other pull request, and nothing is merged with a failing or skipped check.
- A group is merged as a whole. If one package in it breaks the build, fix or hold the whole group; do not split it by hand, because the packages are grouped exactly because they cannot move apart.
- Runtime dependencies are few on purpose. A pull request that adds one needs a reason in its description.
