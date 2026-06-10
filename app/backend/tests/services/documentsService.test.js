import { describe, test, expect } from "@jest/globals";
import {
  getDocument,
  hashDocument,
  listDocTypes,
  DOCUMENTS,
} from "../../services/documentsService.js";

describe("documentsService", () => {
  test("every document type resolves with a version, body, roles, and hash", () => {
    for (const docType of listDocTypes()) {
      const doc = getDocument(docType);
      expect(doc).toBeTruthy();
      expect(doc.version).toBeTruthy();
      expect(doc.body.length).toBeGreaterThan(0);
      expect(Array.isArray(doc.roles)).toBe(true);
      expect(doc.contentHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("unknown document type returns null", () => {
    expect(getDocument("nope")).toBeNull();
  });

  test("hash is deterministic for the same version + body", () => {
    const a = hashDocument("v1", "hello");
    const b = hashDocument("v1", "hello");
    expect(a).toBe(b);
  });

  test("hash changes when version or body changes (re-sign on update)", () => {
    const base = hashDocument("v1", "hello");
    expect(hashDocument("v2", "hello")).not.toBe(base);
    expect(hashDocument("v1", "hello!")).not.toBe(base);
  });

  test("client_waiver is restricted to the client role", () => {
    expect(DOCUMENTS.client_waiver.roles).toEqual(["client"]);
  });
});
