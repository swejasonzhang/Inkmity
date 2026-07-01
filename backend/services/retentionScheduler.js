import { runRetentionTick } from "./retentionService.js";
import { logger } from "../lib/logger.js";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

let timer = null;

async function tick() {
  try {
    const result = await runRetentionTick();
    if (result.reminders || result.aftercare || result.rebook) {
      logger.info(result, "retention tick");
    }
  } catch (err) {
    logger.error({ err: err.message }, "retention tick failed");
  }
}

export function startRetentionScheduler({ intervalMs } = {}) {
  if (timer) return timer;
  if (process.env.RETENTION_SCHEDULER === "off") {
    logger.info("retention scheduler disabled (RETENTION_SCHEDULER=off)");
    return null;
  }
  const ms = intervalMs || Number(process.env.RETENTION_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  timer = setInterval(tick, ms);
  timer.unref?.();
  logger.info({ intervalMs: ms }, "retention scheduler started");
  return timer;
}

export function stopRetentionScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
