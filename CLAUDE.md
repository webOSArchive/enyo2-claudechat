# Claude Chat for webOS — Project Context

## What This Is
A Claude AI chat app for the HP TouchPad (webOS 3.x, 2011). Built with Enyo 2.5.1 + Onyx UI. ES5 only — no arrow functions, const/let, template literals, or fetch.

## Key Constraints
- Old WebKit (~534.x), no CORS enforcement on device
- SSL handled externally by a Squid ssl-bump proxy (causes status-0 on first XHR — handled with auto-retry in claude-api.js)
- All persistence via localStorage
- XHR only (non-streaming), Anthropic Messages API
- Must include `anthropic-dangerous-direct-browser-access: true` header
- App ID: `org.webosarchive.claudechat`

## Project Structure
```
enyo-app/
  appinfo.json               — webOS app manifest (includes universalSearch)
  source/
    app.js                   — App.Application, JustType launch handling
    data/credentials.js      — localStorage wrapper for API key/model/system prompt
    data/conversation.js     — Message history, archive (up to 10), rolling 20-turn API window
    services/claude-api.js   — XHR to Anthropic API, auto-retry on status-0
    views/views.js           — All UI kinds
    style/chat.css           — Dark theme styles
cordova-webos.js             — Cordova webOS plugin (DO NOT MODIFY)
build.sh                     — Build script: `./build.sh webos [install]` or `./build.sh clean`
proxy.js                     — Optional desktop CORS proxy on :8283 (for dev only)
```

## Build & Dev
- Dev server (serves source directly): `cd enyo-app && npm run serve` → http://localhost:8282
- Use `debug.html` (not `index.html`) in browser — index.html loads built files from `build/`
- Build .ipk: `./build.sh webos`
- Build + install to device: `./build.sh webos install`
- Output: `bin/org.webosarchive.claudechat_1.0.0_all.ipk` (~244K)

## Architecture Notes
- `App.RootView` is `enyo.Panels` with `CardArranger` — switches between chat/settings/history via `setIndex(0/1/2)`. Do NOT use `setShowing(true/false)` on sibling views inside a FittableRows — this causes FittableRows to calculate heights as 0px for hidden panels.
- `App.ChatView` owns the `conversation`, `credentials`, and `api` objects.
- Settings and History receive the `conversation` object from ChatView via events when opened.

## Known Gotchas
- `enyo.Panels` + `CardArranger` for multi-panel navigation — NOT `setShowing` on FittableRows children
- `item.render()` works for dynamic list items (proven by `appendMessage` in ChatView)
- Published property change handlers in Enyo 2 may fire before `initComponents()` — use `create()` override pattern (see `App.MessageItem`, `App.HistoryItem`)
- `enyo.Application.rendered()` needs a 150ms setTimeout before dispatching resize so FittableRows gets correct clientHeight
- `appinfo.json` must not have `"noWindow": "true"` (crashes Luna — that's for background services)
- Model select uses raw `<select>` tag + `innerHTML` to set options (Enyo's `{attributes: {value:...}}` on option children doesn't work)

## JustType Integration — IN PROGRESS (not working yet)

### What's implemented
**appinfo.json** has:
```json
"universalSearch": {
    "search": {
        "displayName": "Ask Claude",
        "url": "org.webosarchive.claudechat",
        "launchParam": "query"
    }
}
```
(Note: user changed "action" to "search" — "search" type works for registration)

**app.js** has module-level `deviceready` handler (registered before `enyo.ready()`) that:
1. Reads `PalmSystem.launchParams` for cold-start case
2. Chains onto `window.Mojo.relaunch` for warm-start (already-running) case
3. Uses `App._appView` / `App._justTypeQuery` to bridge the `deviceready` vs `rendered()` timing gap

**views.js** has `handleJustTypeQuery(query)` on both `App.RootView` and `App.ChatView`. ChatView navigates to index 0, pre-fills the input, and calls `sendMessage()`.

### What happens
App launches from JustType correctly, but the query never reaches the UI. The previous conversation loads normally — no message is sent and the input is not pre-filled.

### What we know about webOS launch lifecycle
- `cordova-webos.js` sets up `window.Mojo.relaunch` inside its own `deviceready` handler
- LunaSysMgr calls `window.Mojo.relaunch()` whenever an app is "launched" — comment in cordova-webos.js says this includes fresh launches, not just relaunches
- `PalmSystem.launchParams` is the JSON string of launch params
- Our `deviceready` handler should fire AFTER cordova-webos.js's (registered later), so `Mojo.relaunch` should be chainable

### Theories to investigate next
1. **`PalmSystem.launchParams` format** — maybe the "search" type passes params differently than expected. Add temporary logging to see the raw value of `PalmSystem.launchParams` on launch. Try: `alert(PalmSystem.launchParams)` in the deviceready handler to see what's actually there.

2. **`deviceready` timing** — maybe it never fires on webOS 3.x with this Cordova version. Try reading `PalmSystem.launchParams` directly in `rendered()` without waiting for `deviceready`.

3. **`Mojo.relaunch` not called for "search" type** — maybe webOS always does a fresh launch for JustType "search", meaning only the `PalmSystem.launchParams` path matters (not the relaunch path).

4. **`App._appView` not set** — maybe `enyo.Application.view` is not the RootView instance. Try `enyo.$['app_rootView']` instead (Enyo's global component registry), or use a direct DOM query approach.

5. **launchParam key mismatch** — maybe webOS uses a different key than "query" in the launch params object. The docs say with `"launchParam": "query"`, the params should be `{"query": "text"}` — but this should be verified with the alert approach.

### Simplest next debugging step
Add a temporary `alert()` in the `deviceready` handler to verify it fires and show the raw `PalmSystem.launchParams`:
```javascript
document.addEventListener('deviceready', function() {
    alert('deviceready: ' + (window.PalmSystem ? PalmSystem.launchParams : 'no PalmSystem'));
    ...
}, false);
```
This will immediately tell us: (a) does deviceready fire, (b) what are the actual launch params.

## Reference Apps (same author, proven patterns)
- CheckMate HD: https://github.com/codepoet80/enyo2-checkmate
- FeedSpider2: https://github.com/codepoet80/webos-feedspider
- Neither implements JustType, so no direct reference for that pattern
