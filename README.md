# JFam

Our family app: chores become quests, quests become pocket money, and the family's week, lists and prayer wall live in one place.
Made for iPhone and iPad. Open it in Safari and tap Share, then Add to Home Screen.

Live: https://ajthereal.github.io/JFam/

## How it works
- Plain HTML, CSS and JS. No build step. Hosted on GitHub Pages.
- Data lives in the HQ Data Google Sheet, tab `jflog`, through the same Apps Script web app as HQ and Worship. No new script to set up.
- `jflog` is an append-only log (id, ts, by, k, d). Nothing is ever edited or deleted there; the app rebuilds the current state from it.
- Each device keeps its own copy and syncs every minute, when opened and after every change. Rows a device writes stay "to sync" until a read shows them in the Sheet, so two devices saving at the same moment never lose anything.
- No names, photos or family data in this repo. It is public.

## Files
- `js/core.js` pure logic (levels, streaks, coins, quests for a day, agenda). Tested by `node tests/core.test.js`.
- `js/seed.js` starter quests and rewards, and the sample family for "Look around".
- `js/store.js` device storage, connection and sync.
- `js/ui.js` sheets, toasts, sound, confetti.
- `js/app.js` screens and actions.
