# Desktop language packs

Single source of truth for every translation of the AI Shell Desktop UI.

## Layout

- `locales.json` — the selectable locale catalog: default (`en`), display
  labels, and each added locale's fallback chain. The runtime catalog module
  and the language-row options are generated from this file.
- `GLOSSARY.md` — terminology anchor every translation must follow.
- `upstream/<locale>.json` — translations for every namespace the pinned
  upstream DSH client registers (see `scripts/desktop-locales-core.mjs` for the
  namespace table). Shape: `{ "<namespace>": { "<key>": "<text>" } }`.
- `desktop/<locale>.json` — translations for the desktop-owned
  `desktop.settings` namespace. Shape: `{ "<key>": "<text>" }`.

English and Chinese are shipped by the upstream locale service and are not
translated here.

## Workflow

1. Edit the translation JSON files (or add a locale to `locales.json`, its
   fallback, and every dictionary file).
2. Run `corepack yarn locale:sync` to regenerate
   `shell-desktop-beta/src/client/locales/generated/` and mirror the files into
   `shell-desktop/` byte-identically.
3. Run `corepack yarn check:desktop-locales` (also part of `yarn check:layout`)
   to prove coverage, freshness, and variant equality.

The upstream checkout under `deepseek-harness/` is pinned and read-only here:
the sync and verify scripts import its locale dictionaries directly (Node type
stripping) and fail when upstream adds, removes, or renames a key so the gaps
are fixed before release. Missing keys at runtime fall back through each
locale's chain (`zh-Hant → zh → en`, every other added locale → `en`), so a
stale pack degrades to English instead of breaking the UI.

## Adding a language

1. Add the locale to `locales.json` (id, self-named label, fallback to a
   registered locale whose chain ends at `en`).
2. Create `upstream/<id>.json` and `desktop/<id>.json` with every key from the
   English source; run `node scripts/desktop-locales-dump.mjs` to print the
   current reference text.
3. Run `corepack yarn locale:sync`.
