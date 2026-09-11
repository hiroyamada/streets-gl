# CLAUDE.md

## Model usage

**Rule: use the session's default model (Fable) only for planning, coordination, and review.** All code reading (exploration, searching, file reading) and all code writing (edits, new files, tests, running checks) must be delegated to Sonnet subagents via the Agent tool with `model: "sonnet"` (or the `coder` agent defined in `.claude/agents/coder.md`). Do not read or edit source files directly from the main session, except for trivial one-line lookups.

## Project overview

Streets GL is a real-time 3D OpenStreetMap renderer built on a custom WebGL2 renderer and render graph, written in TypeScript and bundled with webpack 5. The UI is React 18 + Recoil, under `src/app/ui`.

- Entry point: `src/app/App.ts`
- Core systems live in `src/app/systems`
- Kart mini-game (entered with `KeyC`): `src/app/kart`
  - `KartSystem.ts` — main loop
  - `RaceState.ts` — race state machine
  - `RaceAudio.ts` / `RaceMusic.ts` — synthesized Web Audio (no sample files)
  - Tests in `src/app/kart/tests`
- Settings are schema-driven: add entries to `Config.SettingsSchema` in `src/app/Config.ts`; they persist to `localStorage` and render generically via `src/app/ui/components/SettingsModalPanel`.
- Static assets live in `src/resources` and are copied verbatim by webpack's CopyPlugin.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — lint
- `npm run lint:fix` — lint with autofix
- `npm run typecheck` — TypeScript type checking
- `npm test` — run tests

**Always run `npm run typecheck`, `npm run lint`, and `npm test` before committing.**

## Conventions

- Indentation: tabs (see `.eslintrc`, `"indent": ["off", "tab", ...]`; existing source files use tabs).
- No audio sample files — all audio is synthesized at runtime with Web Audio.
- No copyrighted assets of any kind.
