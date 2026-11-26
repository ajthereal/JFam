# JFam: rules for Claude sessions

Family app for AJ, his wife and their two kids. They use only iPhone and iPad, touch only.
The repo is public: never put names, birthdays, photos, tokens or any family data in it. Family data lives only in the HQ Data Sheet, tab `jflog`.

- Plain HTML, CSS and JS, no framework, no build step. Bump `?v=N` in index.html and `V` in sw.js on every change.
- All UI text in English, short and plain, kid-friendly. No AI-sounding copy, no colon setups.
- Never fail silently: anything that can fail says why in plain words.
- `jflog` is append-only. Never write code that edits or removes rows; changes are new events, deletes are `del: 1` records.
- Kids must not be able to approve their own quests: approvals only in a parent profile, parents protected by a PIN (stored hashed).
- Tap targets at least 44 px, safe areas respected, works on iPhone portrait and iPad portrait and landscape.
- Run `node tests/core.test.js` before pushing.
- Small commits with plain messages.
