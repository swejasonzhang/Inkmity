import SignedDocument from "../models/SignedDocument.js";
import { DOCUMENTS } from "./documentsService.js";

export async function hasSignedCurrentDocument(clerkId, docType) {
  if (!clerkId) return false;
  const def = DOCUMENTS[docType];
  if (!def) return false;
  const sig = await SignedDocument.findOne({
    docType,
    version: def.version,
    signerClerkId: String(clerkId),
  })
    .select("_id")
    .lean();
  return Boolean(sig);
}
