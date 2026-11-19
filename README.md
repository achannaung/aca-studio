# AChan AI Studio

Burmese text-to-speech studio + YouTube thumbnail maker, deployed on Vercel.

- **TTS tab** — Nara Mini v1 (free, via Hugging Face Space) + Gemini TTS (server-side key)
- **Thumbnail tab** — pollinations.ai background + canvas text overlay, custom fonts
- PWA: installable (manifest + service worker + icons)

## Layout

- `index.html` — the whole app (single file)
- `api/tts-nara.js`, `api/tts-nara-status.js` — Nara Mini proxy functions
- `api/tts-gemini.js` — Gemini TTS function; key comes from the `GEMINI_API_KEY`
  environment variable (Production), never from client code

Pushes to `main` auto-deploy on Vercel.
