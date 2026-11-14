---
title: "WeatherMeter security audit: static CSP headers and AI-context files excluded"
author: Rhuan
date: 2026-11-14
branch: main
cost: { minutes: 7, tokens: 1467069 }
id: l-f1fdfdd9
scope: repo
status: active
src: agent
touches:
  - README.md
  - serve.py
  - tests/public-surface.test.js
  - ".github/copilot-instructions.md"
  - index.html
  - package.json
  - js/app.js
  - js/openmeteo.js
---

## Decided
WeatherMeter is a fully static client page: no server, no auth, no database, no API key. The browser calls Open-Meteo directly (api/marine/archive/geocoding-api.open-meteo.com) plus a Google Maps iframe for the pin. All data is public weather/sea state, non-sensitive. Recommended CSP confines connect-src to those four Open-Meteo hosts and frame-src to www.google.com; script-src/style-src are 'self' with no inline scripts or styles; object-src 'none', frame-ancestors 'none'. Open-Meteo attribution (CC BY 4.0, non-commercial) kept in page footer and CSV/PDF exports. .ai-memory.toml joins .mcp.json and opencode.json in .gitignore as AI session context to exclude from version control; it was rm --cached from the index. serve.py already binds loopback by default and rejects /.git/ paths with 404 — documented as local preview only.

## Tried and ruled out
- Adding an API key or secret to the repo: none needed; Open-Meteo free tier requires no key.
- Hosting serve.py in production: not the production host; it is loopback-only local preview.
- Allowing inline script/style in CSP: not needed; page has none.

## Watch out
The public-surface test (tests/public-surface.test.js) still fails pre-existing and unrelated to this audit: it flags .trail/ and graphify-out/ cache files that contain the marker strings it scans for (e.g. "rhuan-lab"). That is local cache, not app source; do not treat it as a secret leak or edit app code to fix it.

In the code:
- .gitignore: added /.ai-memory.toml
- README.md: new Deploy (static hosting) section with CSP snippet
- Commit ffba90e pushed to origin/main; .github/copilot-instructions.md graft->trail rename left uncommitted as unrelated
