// AChan AI Studio — Gemini TTS (Vercel Function)
// POST /api/tts-gemini  { text, voice, instruction }
// The Gemini API key is read ONLY from the server-side env var GEMINI_API_KEY.
// It never appears in client code or responses.

const MODELS = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
];

const VOICES = ["Charon", "Fenrir", "Kore", "Aoede", "Orus", "Leda"];

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
  const voice = VOICES.includes(input.voice) ? input.voice : "Charon";
  const instruction = typeof input.instruction === "string" ? input.instruction.trim() : "";

  if (!text) {
    return res.status(400).json({ ok: false, code: "NO_TEXT", message: "စာသား မပါပါ" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      code: "NO_KEY",
      message: "Server မှာ GEMINI_API_KEY မသတ်မှတ်ရသေးပါ။",
    });
  }

  const fullText = instruction ? instruction + "\n" + text : text;
  const payload = {
    contents: [{ parts: [{ text: fullText }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  };

  let lastError = null;

  for (const model of MODELS) {
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(payload),
        }
      );
    } catch (e) {
      // Network-level failure reaching Google — treat like a 5xx and try the next model.
      lastError = { status: 502, message: "Google သို့ ချိတ်ဆက်၍ မရပါ: " + (e && e.message ? e.message : e) };
      continue;
    }

    if (response.ok) {
      const data = await response.json();
      const parts =
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts
          ? data.candidates[0].content.parts
          : [];
      const audioPart = parts.find((p) => p.inlineData && p.inlineData.data);
      if (audioPart) {
        return res.status(200).json({
          ok: true,
          model,
          audioBase64: audioPart.inlineData.data,
          sampleRate: 24000,
        });
      }
      return res.status(502).json(
        { ok: false, code: "NO_AUDIO", status: response.status, message: `Model ${model} မှ အသံ ပြန်မလာပါ` }
      );
    }

    // Not OK — read Google's error message.
    let detail = "";
    try {
      const ej = await response.json();
      detail = ej && ej.error && ej.error.message ? ej.error.message : "";
    } catch (e) {
      try { detail = await response.text(); } catch (e2) {}
    }
    lastError = {
      status: response.status,
      message: `HTTP ${response.status}${detail ? ": " + String(detail).slice(0, 300) : ""} (model: ${model})`,
    };

    const s = response.status;
    if (s === 404 || s === 429 || s >= 500) {
      continue; // try the next model
    }
    // Key / config errors — don't waste calls on the other models.
    return res.status(s).json({ ok: false, code: "GOOGLE_ERROR", status: s, message: lastError.message });
  }

  return res.status(lastError && lastError.status ? lastError.status : 502).json({
    ok: false,
    code: "ALL_MODELS_FAILED",
    status: lastError ? lastError.status : 502,
    message: lastError ? lastError.message : "Model အားလုံး ကျရှုံးပါသည်",
  });
}
