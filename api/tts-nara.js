// AChan AI Studio — Nara Mini v1 TTS: start job (Vercel Function)
// POST /api/tts-nara  { text, voice, normalize }
// Starts a generation on the free Hugging Face Space
//   hugging-apps/nara-mini-v1-tts  (model: YeeNyunn/nara-mini-v1, Apache 2.0)
// and returns the Gradio event id. Poll /api/tts-nara-status?event=<id> for the result.
// No token / API key is needed for the public Space.

const SPACE_HOST = "https://hugging-apps-nara-mini-v1-tts.hf.space";
const VOICES = ["shoon", "thazin", "ko-banyar", "htet-myat"];

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD", message: "POST only" });
  }

  let input = req.body;
  if (typeof input === "string") {
    try { input = JSON.parse(input); } catch (e) { input = null; }
  }
  if (!input || typeof input !== "object") {
    return res.status(400).json({ ok: false, code: "BAD_JSON", message: "Request body သည် JSON မဟုတ်ပါ" });
  }

  const text = (input.text || "").trim();
  const voice = VOICES.includes(input.voice) ? input.voice : "shoon";
  const normalize = input.normalize !== false;

  if (!text) {
    return res.status(400).json({ ok: false, code: "NO_TEXT", message: "စာသား မပါပါ" });
  }

  let response;
  try {
    response = await fetch(`${SPACE_HOST}/gradio_api/call/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [text, voice, normalize] }),
    });
  } catch (e) {
    return res.status(502).json({
      ok: false,
      code: "SPACE_UNREACHABLE",
      message: "Nara အခမဲ့ server သို့ ချိတ်ဆက်၍ မရပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။ (" + (e && e.message ? e.message : e) + ")",
    });
  }

  if (!response.ok) {
    let detail = "";
    try { detail = (await response.text()).slice(0, 200); } catch (e) {}
    return res.status(502).json({
      ok: false,
      code: "SPACE_ERROR",
      status: response.status,
      message: `Nara server မှ အမှား ပြန်လာပါသည် (HTTP ${response.status})${detail ? ": " + detail : ""}`,
    });
  }

  const data = await response.json().catch(() => null);
  const eventId = data && data.event_id;
  if (!eventId) {
    return res.status(502).json({ ok: false, code: "NO_EVENT", message: "Nara server မှ event id ပြန်မလာပါ" });
  }

  return res.status(200).json({ ok: true, eventId });
}
