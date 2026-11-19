# AChan AI Studio

Burmese text-to-speech studio, deployed on Vercel. (The Thumbnail Maker tab was removed on 2026-11-19 at AChan's request — the app is TTS-only now.)

- **TTS** — Nara Mini v1 (free, via Hugging Face Space) + Gemini TTS (server-side key), with speaking style / speed / pitch controls for Gemini
- PWA: installable (manifest + service worker + icons)

## Layout

- `index.html` — the whole app (single file)
- `api/tts-nara.js`, `api/tts-nara-status.js` — Nara Mini proxy functions
- `api/tts-gemini.js` — Gemini TTS function; key comes from the `GEMINI_API_KEY`
  environment variable (Production), never from client code

Pushes to `main` auto-deploy on Vercel.
