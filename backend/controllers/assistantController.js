import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/index.js";

const MODEL = "claude-opus-4-8";
const MAX_HISTORY = 20;
const MAX_CHARS_PER_MESSAGE = 4000;

const SYSTEM_PROMPT = `You are the Inkmity assistant. Inkmity is a tattoo booking marketplace that connects clients with tattoo artists — clients browse artists by style, budget, and location, message them, and book with a deposit; artists get paid out when a session is completed.

Your job is to remove friction from getting a tattoo. Help clients:
- Turn a vague idea into a clear, send-ready brief (subject/concept, style, placement, approximate size, color vs. black & grey, budget range, reference notes, timing).
- Suggest styles, placements, and what to consider for their idea.
- Explain how Inkmity works: searching artists, messaging, deposits, the platform fee ($10 + 5% of the price, capped at $50), and that nothing is charged until a session is complete.
- Give sensible general tattoo and aftercare guidance.

Rules:
- You do NOT have live access to artists, prices, availability, or any user's account or bookings. Never invent specific artists, handles, prices, or open slots. When a client wants a specific artist or live availability, guide them to browse and search artists in the app.
- Not medical advice. For health concerns (allergies, skin conditions, healing problems), tell them to consult their artist and a medical professional.
- Brand voice: confident, direct, a little edgy/industrial — never cutesy, no emoji.
- Be concise. Use short paragraphs or tight bullet lists. Respond directly with your answer; do not narrate your reasoning or restate the question.`;

let client = null;
function getClient() {
  if (!config.anthropic?.apiKey) return null;
  if (!client) client = new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS_PER_MESSAGE) }))
    .slice(-MAX_HISTORY);
  // Trim any leading assistant turns — the API requires the first message to be a user turn.
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  return cleaned;
}

export async function chatAssistant(req, res) {
  const anthropic = getClient();
  if (!anthropic) {
    return res
      .status(503)
      .json({ error: "assistant_unavailable", message: "The assistant isn't configured yet." });
  }

  const messages = sanitizeMessages(req.body?.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "invalid_messages", message: "Send at least one user message." });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Stop streaming if the client disconnects mid-response.
    const onClose = () => stream.abort();
    res.on("close", onClose);

    stream.on("text", (delta) => res.write(delta));
    await stream.finalMessage();

    res.off("close", onClose);
    res.end();
  } catch (err) {
    console.error("chatAssistant error:", err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: "assistant_failed", message: "Something went wrong — try again." });
    } else {
      res.end();
    }
  }
}
