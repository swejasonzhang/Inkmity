import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockSignedDocument = { findOne: jest.fn() };

jest.unstable_mockModule("../../models/SignedDocument.js", () => ({
  default: mockSignedDocument,
}));

const { hasSignedCurrentDocument } = await import(
  "../../services/signatureGateService.js"
);
const { DOCUMENTS } = await import("../../services/documentsService.js");

function findOneReturns(value) {
  mockSignedDocument.findOne.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(value) }),
  });
}

beforeEach(() => jest.clearAllMocks());

describe("hasSignedCurrentDocument", () => {
  test("false when no clerkId", async () => {
    expect(await hasSignedCurrentDocument("", "client_waiver")).toBe(false);
  });

  test("false for an unknown document type", async () => {
    expect(await hasSignedCurrentDocument("u1", "nope")).toBe(false);
  });

  test("true when a signature exists for the current version", async () => {
    findOneReturns({ _id: "sig1" });
    expect(await hasSignedCurrentDocument("u1", "client_waiver")).toBe(true);
  });

  test("queries for the current template version", async () => {
    findOneReturns({ _id: "sig1" });
    await hasSignedCurrentDocument("u1", "client_waiver");
    expect(mockSignedDocument.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "client_waiver",
        version: DOCUMENTS.client_waiver.version,
        signerClerkId: "u1",
      })
    );
  });

  test("false when no signature found (gate blocks)", async () => {
    findOneReturns(null);
    expect(await hasSignedCurrentDocument("u1", "client_waiver")).toBe(false);
  });
});
