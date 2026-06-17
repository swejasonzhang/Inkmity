import Report from "../models/Report.js";
import { config } from "../config/index.js";

const TARGET_TYPES = ["artwork", "message", "artist", "profile"];
const REASONS = ["spam", "inappropriate", "harassment", "copyright", "impersonation", "other"];

function actorId(req) {
  return String(req.user?.clerkId || req.auth?.userId || "").trim();
}

export async function createReport(req, res) {
  try {
    const reporterClerkId = actorId(req);
    if (!reporterClerkId) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const targetType = String(body.targetType || "").trim();
    const targetRef = String(body.targetRef || "").trim();
    const reason = String(body.reason || "").trim();
    const details = String(body.details || "").trim().slice(0, 1000);
    const targetOwnerClerkId = String(body.targetOwnerClerkId || "").trim();

    if (!TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({ error: "invalid_target_type" });
    }
    if (!targetRef) return res.status(400).json({ error: "target_required" });
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ error: "invalid_reason" });
    }

    const dupe = await Report.findOne({
      reporterClerkId,
      targetType,
      targetRef,
      status: "open",
    }).lean();
    if (dupe) return res.status(200).json({ ok: true, deduped: true });

    await Report.create({
      reporterClerkId,
      targetType,
      targetRef,
      targetOwnerClerkId,
      reason,
      details,
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error("createReport error:", e.message);
    res.status(500).json({ error: "report_failed" });
  }
}

export async function updateReportStatus(req, res) {
  try {
    const me = actorId(req);
    if (!me || !config.admin.clerkIds.includes(me)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { id } = req.params;
    const status = String(req.body?.status || "").trim();
    if (!["open", "reviewed", "actioned", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "invalid_status" });
    }
    const report = await Report.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!report) return res.status(404).json({ error: "not_found" });
    res.json(report);
  } catch (e) {
    console.error("updateReportStatus error:", e.message);
    res.status(500).json({ error: "update_failed" });
  }
}

export async function listReports(req, res) {
  try {
    const me = actorId(req);
    if (!me || !config.admin.clerkIds.includes(me)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const status = req.query.status ? String(req.query.status) : undefined;
    const filter = status ? { status } : {};
    const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ reports });
  } catch (e) {
    console.error("listReports error:", e.message);
    res.status(500).json({ error: "list_failed" });
  }
}
