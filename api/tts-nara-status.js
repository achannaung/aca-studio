// AChan AI Studio — Nara Mini v1 TTS: poll job (Vercel Function)
// GET /api/tts-nara-status?event=<eventId>
// Reads the Gradio SSE stream for the event:
//   "event: complete" -> fetch the WAV server-side and return it as base64
//   "event: error"    -> error
//   anything else     -> still processing

const SPACE_HOST = "https://hugging-apps-nara-mini-v1-tts.hf.space";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const eventId = req.query && req.query.event;

  if (!eventId) {
    return res.status(400).json({ ok: false, status: "error", code: "NO_EVENT", message: "event မပါပါ" });
  }

  let sseText;
  try {
    const r = await fetch(`${SPACE_HOST}/gradio_api/call/generate/${encodeURIComponent(eventId)}`);
    if (!r.ok) {
      return res.status(502).json({
        ok: false, status: "error", code: "SPACE_ERROR",
        message: `Nara server မှ အမှား (HTTP ${r.status})`,
      });
    }
    sseText = await r.text();
  } catch (e) {
    return res.status(502).json({
      ok: false, status: "error", code: "SPACE_UNREACHABLE",
      message: "Nara အခမဲ့ server သို့ ချိတ်ဆက်၍ မရပါ။ (" + (e && e.message ? e.message : e) + ")",
    });
  }

  if (sseText.includes("event: error")) {
    return res.status(200).json({
      ok: false, status: "error", code: "GENERATION_FAILED",
      message: "Nara အသံဖန်တီးမှု ကျရှုံးပါသည်။ စာသား တိုတိုခွဲပြီး ပြန်ကြိုးစားကြည့်ပါ။",
    });
  }

  if (!sseText.includes("event: complete")) {
    return res.status(200).json({ ok: true, status: "processing" });
  }

  // Parse the data payload that follows the "event: complete" line.
  let audioUrl = null;
  try {
    const marker = "event: complete";
    const after = sseText.slice(sseText.indexOf(marker));
    const dataLine = after.split("\n").find((l) => l.startsWith("data:"));
    if (dataLine) {
      const parsed = JSON.parse(dataLine.slice(5).trim());
      if (Array.isArray(parsed) && parsed[0] && parsed[0].url) {
        audioUrl = parsed[0].url;
      }
    }
  } catch (e) {}

  if (!audioUrl) {
    return res.status(200).json({
      ok: false, status: "error", code: "NO_AUDIO_URL",
      message: "Nara server မှ အသံဖိုင် လိပ်စာ မရပါ",
    });
  }

  let audioBytes;
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return res.status(502).json({
        ok: false, status: "error", code: "AUDIO_FETCH_FAILED",
        message: `အသံဖိုင် ဒေါင်းလုဒ် မရပါ (HTTP ${audioRes.status})`,
      });
    }
    audioBytes = Buffer.from(await audioRes.arrayBuffer());
  } catch (e) {
    return res.status(502).json({
      ok: false, status: "error", code: "AUDIO_FETCH_FAILED",
      message: "အသံဖိုင် ဒေါင်းလုဒ် မရပါ။ (" + (e && e.message ? e.message : e) + ")",
    });
  }

  return res.status(200).json({ ok: true, status: "done", audioBase64: audioBytes.toString("base64") });
}
