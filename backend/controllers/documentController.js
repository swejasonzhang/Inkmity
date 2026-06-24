import SignedDocument from "../models/SignedDocument.js";
import { getActorId } from "../lib/auth.js";
import { getDocument, hashDocument, DOCUMENTS } from "../services/documentsService.js";

export async function fetchDocument(req, res) {
  try {
    const doc = getDocument(req.params.docType);
    if (!doc) return res.status(404).json({ error: "unknown_document" });
    res.json(doc);
  } catch (err) {
    console.error("fetchDocument error:", err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
}

export async function getSignatureStatus(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { docType } = req.params;
    const doc = getDocument(docType);
    if (!doc) return res.status(404).json({ error: "unknown_document" });

    const query = {
      docType,
      version: doc.version,
      signerClerkId: actorId,
    };
    if (req.query.bookingId) query.bookingId = req.query.bookingId;

    const signature = await SignedDocument.findOne(query).sort({ signedAt: -1 }).lean();
    res.json({
      docType,
      version: doc.version,
      signed: Boolean(signature),
      signedAt: signature?.signedAt || null,
    });
  } catch (err) {
    console.error("getSignatureStatus error:", err);
    res.status(500).json({ error: "Failed to fetch signature status" });
  }
}

export async function signDocument(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { docType } = req.params;
    const definition = DOCUMENTS[docType];
    if (!definition) return res.status(404).json({ error: "unknown_document" });

    const signatureName = String(req.body?.signatureName || "").trim();
    if (!signatureName)
      return res.status(400).json({ error: "signature_required", message: "Type your full name to sign." });

    const signerRole = req.body?.signerRole;
    if (!definition.roles.includes(signerRole))
      return res.status(400).json({
        error: "role_not_allowed",
        message: `This document is for: ${definition.roles.join(", ")}.`,
      });

    const contentHash = hashDocument(definition.version, definition.body);

    const record = await SignedDocument.create({
      docType,
      version: definition.version,
      signerClerkId: actorId,
      signerRole,
      bookingId: req.body?.bookingId || undefined,
      studioId: req.body?.studioId || undefined,
      signatureName,
      contentHash,
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
      provider: "in_house",
      signedAt: new Date(),
    });

    res.status(201).json(record);
  } catch (err) {
    console.error("signDocument error:", err);
    res.status(500).json({ error: "Failed to record signature" });
  }
}

export async function listMySignatures(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const signatures = await SignedDocument.find({ signerClerkId: actorId })
      .sort({ signedAt: -1 })
      .limit(100)
      .lean();
    res.json(signatures);
  } catch (err) {
    console.error("listMySignatures error:", err);
    res.status(500).json({ error: "Failed to list signatures" });
  }
}
