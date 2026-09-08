# Demo GIFs

Short screen recordings of the demo app, for the READMEs and release notes.

## Regenerating

```bash
npm run gifs
```

Runs the `promo` Playwright project (`e2e/promo-scenes.ts` — drives the demo through each
gesture, records video) then `scripts/make-gifs.mjs` (video → GIF). Needs **gifski** (preferred)
or **ffmpeg** on `PATH`. The `.webm` sources sit under the git-ignored `test-results/`; commit
the `.gif` files here.

Add a clip with another `scene(...)` block in `e2e/promo-scenes.ts` — the GIF takes its
name. Size/quality knobs (`FPS`, `WIDTH`) are at the top of `scripts/make-gifs.mjs`; keep each
GIF under ~3 MB so GitHub and npm render it inline.
