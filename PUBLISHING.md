# Publishing `@inandu-solutions/grid-angular`

Maintainer runbook. Releases are cut **manually from a maintainer's machine** (see
[Cutting a release](#cutting-a-release)); an optional GitHub Actions path exists but is not
in use.

## Package naming

This library publishes as **`@inandu-solutions/grid-angular`**. The bare **`@inandu-solutions/grid`** name is
deliberately **left unpublished**, reserved as a future framework-neutral umbrella —
a React port would ship as `@inandu-solutions/grid-react`, sharing this repo's framework-agnostic
core (`projects/inandu-grid/src/lib/core/`, no `@angular/*` dependency). See
[Future: a React package](#future-a-react-package) below.

The Angular **build-target** name stays `inandu-grid` (`angular.json` project key,
`ng build inandu-grid`, `dist/inandu-grid`, `ng-package.json` `dest`) — that's an internal
alias, never published. So is the `<inandu-grid>` / `<inandu-column>` selector and every
`.inandu-*` CSS hook — unchanged by the package rename.

## Repo layout

This repo is the **MIT core**: the `@inandu-solutions/grid-angular` library
(`projects/inandu-grid/`) plus a demo / test app (`src/`). Library and demo development
happens here directly — PRs, issues, CI, releases.

Commercial add-ons ship separately as **`@inandu-solutions/grid-pro`** (proprietary, its
own private repo), which peer-depends on this package. Nothing about grid-pro lives here.

A future React port (`@inandu-solutions/grid-react`) would live in this same repo as a
second package — see [Future: a React package](#future-a-react-package).

## Project identifiers

| | |
| --- | --- |
| npm scope | `@inandu-solutions` — package `@inandu-solutions/grid-angular` (bare `@inandu-solutions/grid` reserved, unpublished) |
| GitHub | `inandusolutions/inandu-grid` |
| Copyright holder | `Inandu SAS` (`https://inandu.com`) |
| Security / conduct contact | `https://www.inandu.com/contact/` (company contact form) |

If any of these ever change, the strings live in: `projects/inandu-grid/package.json`
(`name`, `homepage`, `repository.url`, `bugs.url`); `projects/inandu-grid/README.md`;
`LICENSE` and `projects/inandu-grid/LICENSE` (copyright line); `tsconfig.json` (`paths`
key); `src/app/app.component.ts` (import specifier); `README.md`, `CHANGELOG.md`,
`CONTRIBUTING.md`, `PUBLISHING.md`, `docs/manual.html`; `.github/**`; and the workspace
`package.json`. Quick sweep: `git grep -n inandu-solutions`.

## One-time setup

Done for `@inandu-solutions/grid-angular`: the npm org `@inandu-solutions` exists and
`1.0.0` is published. Still open (optional):

- Enable **GitHub Discussions** (referenced by `.github/ISSUE_TEMPLATE/config.yml`) or
  remove that link.
- Deploy the demo **and `docs/manual.html`** to GitHub Pages; link the hosted manual URL
  from both READMEs (they currently link the file path).

## Cutting a release

Published **manually** from a maintainer's machine — an npm account that is an **Owner**
of the `@inandu-solutions` org, with an authenticator app for the 2FA prompt.

1. **Bump the version** in `projects/inandu-grid/package.json` (SemVer — a breaking change
   to a selector or the public API is a major).
2. **Update `CHANGELOG.md`**: move `## [Unreleased]` items under `## [x.y.z] - YYYY-MM-DD`;
   fix the compare links at the bottom.
3. **Commit** (`chore(release): vX.Y.Z`) and **tag**:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```
4. **Build and publish:**
   ```bash
   npm ci
   npm run lint
   npm run test:lib -- --watch=false --browsers=ChromeHeadless
   npm run build:lib
   cd dist/inandu-grid
   npm pkg get name version        # must be @inandu-solutions/grid-angular + the new version
   npm publish --access public     # enter the 2FA OTP when prompted
   ```
5. **GitHub Release:** GitHub → Releases → *Draft new release* → pick the `vX.Y.Z` tag →
   *Generate release notes* → publish. Nothing automated creates it.

### Gotchas (all hit on the 1.0.0 release)

- **Publish from `dist/inandu-grid`, never the repo root.** The root `package.json` is the
  workspace (`grid-app`, `private: true`) → publishing there fails with `EPRIVATE`. Confirm
  with `npm pkg get name` in `dist/inandu-grid`.
- **`--access public` is required on a first publish** of the scoped package (it's also set
  as `publishConfig.access`, but pass the flag). Without it npm publishes *restricted*.
- **A first publish of a new package must be done by an org Owner.** A token or member
  without package-create rights in the `@inandu-solutions` scope gets a misleading
  `E404 Not Found` on the `PUT`. Once the package exists, any account with *write* on it
  can publish updates.
- **2FA:** an interactive `npm login` session prompts for the OTP at publish time. A classic
  "Publish" access token can't satisfy 2FA-for-writes (`EOTP` / `E403`) — only an
  **Automation** token or a granular token with "bypass 2FA" can.
- **Stale `~/.npmrc`:** a leftover `//registry.npmjs.org/:_authToken=…` line shadows your
  `npm login` session. If auth misbehaves: `del "$env:USERPROFILE\.npmrc"`, then `npm login`.
- **`--provenance`** needs the GitHub Actions OIDC token, so it's not part of the manual
  command. (There used to be a tag-triggered `release.yml` workflow; it was removed after
  the 1.0.0 attempt against it kept failing on token/2FA issues — manual is the flow now.)

## Package managers: npm, pnpm, yarn, bun

**Nothing to do.** `pnpm`, `yarn` and `bun` are not separate registries — they all
install from the public npm registry (`registry.npmjs.org`). One `npm publish` makes
the package installable as `pnpm add @inandu-solutions/grid-angular`, `yarn add
@inandu-solutions/grid-angular`, `bun add @inandu-solutions/grid-angular`. The package is plain ESM +
`.d.ts` produced by `ng-packagr` with no install scripts, so there is no
manager-specific packaging, config, or lockfile to ship.

Optional extra registries (only if there's a concrete reason):

- **GitHub Packages** (`npm.pkg.github.com`) — a *second* place to publish the same
  tarball, scoped to the GitHub org. Would mean a second `npm publish` against a
  `publishConfig.registry` override. Rarely worth it for a public MIT package that's
  already on npm.
- **JSR** (`jsr.io`) — TS-native registry. Would need a `jsr.json` and `npx jsr
  publish`. Nice-to-have, not required; skip unless asked.

## Future: a React package

**A React port lives in the same public repo** (decided 2026-08-31), which then becomes a
small multi-package monorepo:

| Package | Source | Build | Depends on |
| --- | --- | --- | --- |
| `@inandu-solutions/grid-angular` | `projects/inandu-grid/` (current) | `ng-packagr` → `dist/inandu-grid` | Angular peer deps; core source (bundled in) |
| `@inandu-solutions/grid-react` *(future)* | new `projects/inandu-grid-react/` | `vite build --lib` or `tsup` → `dist/inandu-grid-react` | `react`/`react-dom` peer deps; core source (bundled in) |

**The shared core is NOT a separately published package** (decided 2026-08-31). `lib/core/`
is ~15–20 KB of pure TS (sort / filter / format / parse / aggregate / export helpers + the
5 i18n dictionaries, zero `@angular/*`). Each framework package **bundles the core source
into its own build** — sharing is at the *source* level in the monorepo, not a runtime
dependency. This avoids a three-package version dance (a core change would otherwise mean
publish core → bump angular → bump react). Downside: an app that installs *both* framework
packages gets two copies of the core (~a non-issue for a grid — nobody does that). Publish
`@inandu-solutions/grid-core` as its own package only if a third consumer appears (Vue, a web
component, or someone wanting the headless core standalone).

Guidance for that work:

- **Where the core lives.** For now it stays at `projects/inandu-grid/src/lib/core/`
  (already `@angular/*`-free). When the React package lands, move it to a neutral
  top-level location (e.g. `packages/core/`) so neither framework "owns" it. **Do not
  fork it.**
- **Workspace restructure.** The repo is currently an *Angular CLI workspace*
  (`angular.json`, `ng build`), which can't manage a non-Angular project. Adding
  `projects/inandu-grid-react/` means evolving the repo into an **npm/pnpm workspace**
  with the Angular CLI workspace as one member, the React package as another, and the
  core. Do this when the React package is actually being built, not before.
- **Number formatting** already goes through an injected `NumberFormatter`
  (`lib/core/format.ts`). The Angular package injects one backed by `@angular/common`'s
  `formatNumber`; a React package would inject one over `Intl.NumberFormat`
  (`defaultNumberFormatter`, shipped in core, is exactly that) or the host app's i18n lib.
- **Selectors / DOM contract stay shared**: same `<inandu-grid>`-era CSS hook classes
  (`.inandu-grid`, `.inandu-row`, `.inandu-column`, …), same `--inandu-*` custom
  properties, same `Msg*` i18n keys, same `inandu-grid-state:` `localStorage` prefix.
  The React component is `<InanduGrid>` (a JS identifier, not a custom-element tag), so
  there is no tag-name collision to design around.
- **What each package rebuilds**: the reactive shell only — Angular
  `signal`/`computed`/`effect`/templates/`@HostListener`/CDK virtual scroll ↔ React
  `useState`/`useMemo`/`useEffect`/JSX/`@tanstack/react-virtual`. `<inandu-column>`
  (content-projected config) becomes a `columns` prop or `<Column>` children parsed via
  `React.Children`.
- **Release**: give each package its own version and its own tag prefix
  (`angular-vX.Y.Z`, `react-vX.Y.Z`), and publish each manually from its own `dist/` dir
  (see [Cutting a release](#cutting-a-release)). `CHANGELOG.md` either grows per-package sections or
  splits into per-package files.
