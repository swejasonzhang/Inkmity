import { timingSafeEqual } from "crypto";
import { runRetentionTick } from "../services/retentionService.js";
import { config } from "../config/index.js";
import { logger } from "../lib/logger.js";

function secretMatches(provided) {
  const expected = config.internal.cronSecret;
  if (!expected || !provided) return false; // fail closed when unset
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// POST /internal/retention/tick — manual trigger for one retention cycle; guarded by a shared secret.
export async function retentionTick(req, res) {
  if (!secretMatches(req.get("x-internal-secret"))) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const result = await runRetentionTick();
    logger.info(result, "retention tick");
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err: err.message }, "retention tick failed");
    return res.status(500).json({ error: "retention_failed" });
  }
}
