# Claude Chat for webOS

A Claude AI chat client for the HP TouchPad running webOS 3.x. Talk to Claude on your vintage 2011 tablet.

![Claude Chat running on HP TouchPad](enyo-app/assets/icon.png)

## Features

- Chat with Claude directly from your TouchPad
- Conversation history — previous chats are archived and resumable
- Model selection — Haiku (fast) or Sonnet (more capable)
- Custom system prompt support
- Dark theme optimized for the TouchPad display
- Automatic retry on network errors (handles Squid SSL proxy cold connections)
- JustType integration — type a question in the launcher and send it to Claude *(work in progress)*

## Requirements

- HP TouchPad running webOS 3.x
- An [Anthropic API key](https://console.anthropic.com/)
- An SSL proxy (such as Squid with ssl-bump) to handle HTTPS on the TouchPad's older WebKit — see [webosarchive.org](https://www.webosarchive.org) for setup guides

## Installation

Download the latest `.ipk` from Releases and install it with [WebOS Quick Install](https://github.com/QuickInstall) or via the command line:

```
palm-install org.webosarchive.claudechat_1.0.0_all.ipk
```

On first launch, you'll be prompted to enter your Anthropic API key. The key is stored locally on the device.

## Building from Source

### Prerequisites

- webOS SDK 3.0.5b38 (`palm-package` must be on your PATH)
- Node.js

### Setup

```bash
git clone --recurse-submodules <this-repo>
cd webos-claude
```

The Enyo framework and UI libraries are included as git submodules (`enyo-app/enyo`, `enyo-app/lib/layout`, `enyo-app/lib/onyx`). If you cloned without `--recurse-submodules`, run:

```bash
git submodule update --init
```

### Build

```bash
./build.sh webos          # produces bin/org.webosarchive.claudechat_1.0.0_all.ipk
./build.sh webos install  # build + install to a connected device
./build.sh clean          # remove build artifacts
```

### Development

Serve the app locally for browser testing (no build required):

```bash
cd enyo-app
npm install
npm run serve             # http://localhost:8282
```

Open `http://localhost:8282/debug.html` in your browser — this loads source files directly so edits are reflected on refresh. The API key prompt will appear; enter a real key to test chat functionality in your browser.

For CORS issues in a modern browser during development, a local proxy is included:

```bash
node proxy.js             # proxies api.anthropic.com on localhost:8283
```

## Tech Stack

- **[Enyo 2.5.1](https://github.com/enyojs/enyo)** — JavaScript framework for webOS
- **[Onyx](https://github.com/enyojs/onyx)** — Enyo UI component library
- **[Cordova webOS](https://github.com/codepoet80/webos-cordova)** — webOS platform bridge
- ES5 JavaScript throughout (no build transpilation — the TouchPad's WebKit runs it directly)
- Anthropic [Messages API](https://docs.anthropic.com/en/api/messages)

## JustType Integration *(work in progress)*

Claude Chat registers with webOS's JustType universal search feature. The intent is that typing a question in the launcher and selecting "Ask Claude" will open the app and send the query directly. The app registration works, but passing the query text into the chat UI is not yet functional.

## Project Structure

```
enyo-app/
  appinfo.json          webOS app manifest
  source/
    app.js              Application entry point, JustType launch handling
    data/
      credentials.js    API key, model, system prompt (localStorage)
      conversation.js   Message history and archive
    services/
      claude-api.js     Anthropic API client (XHR, non-streaming)
    views/
      views.js          All UI components
    style/
      chat.css          App styles
  enyo/                 Enyo framework (submodule)
  lib/layout/           Fittable layout library (submodule)
  lib/onyx/             Onyx UI components (submodule)
build.sh                Build and packaging script
cordova-webos.js        Cordova webOS platform bridge
proxy.js                Development CORS proxy
```

## Credits

Built for [webosarchive.org](https://www.webosarchive.org). Inspired by the community keeping vintage webOS devices alive.
