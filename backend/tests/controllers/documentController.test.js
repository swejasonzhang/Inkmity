import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockSignedDocument = { findOne: jest.fn(), find: jest.fn(), create: jest.fn() };
const mockGetDocument = jest.fn();
const mockHashDocument = jest.fn();
const DOCUMENTS = {
  client_waiver: { version: "v1", body: "waiver body", roles: ["client"] },
};

jest.unstable_mockModule("../../models/SignedDocument.js", () => ({ default: mockSignedDocument }));
jest.unstable_mockModule("../../services/documentsService.js", () => ({
  getDocument: mockGetDocument,
  hashDocument: mockHashDocument,
  DOCUMENTS,
}));

const { fetchDocument, getSignatureStatus, signDocument, listMySignatures } = await import(
  "../../controllers/documentController.js"
);

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) req.auth = { userId: id };
  next();
};

const app = express();
app.use(express.json());
app.get("/documents/:docType", fetchDocument);
app.get("/documents/:docType/status", mockAuth, getSignatureStatus);
app.post("/documents/:docType/sign", mockAuth, signDocument);
app.get("/signatures", mockAuth, listMySignatures);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocument.mockReturnValue({ version: "v1", title: "Waiver", body: "waiver body" });
  mockHashDocument.mockReturnValue("hash123");
  mockSignedDocument.findOne.mockReturnValue({
    sort: () => ({ lean: () => Promise.resolve(null) }),
  });
  mockSignedDocument.find.mockReturnValue({
    sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }),
  });
  mockSignedDocument.create.mockResolvedValue({ _id: "sig1", docType: "client_waiver" });
});

describe("fetchDocument", () => {
  test("returns the document body", async () => {
    const res = await request(app).get("/documents/client_waiver");
    expect(res.status).toBe(200);
    expect(res.body.version).toBe("v1");
  });

  test("404 for an unknown document", async () => {
    mockGetDocument.mockReturnValue(null);
    const res = await request(app).get("/documents/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("unknown_document");
  });

  test("500 when the lookup throws", async () => {
    mockGetDocument.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await request(app).get("/documents/client_waiver");
    expect(res.status).toBe(500);
  });
});

describe("getSignatureStatus", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(app).get("/documents/client_waiver/status");
    expect(res.status).toBe(401);
  });

  test("404 for an unknown document", async () => {
    mockGetDocument.mockReturnValue(null);
    const res = await request(app).get("/documents/nope/status").set("x-test-user-id", "u1");
    expect(res.status).toBe(404);
  });

  test("reports signed:false when there is no signature", async () => {
    const res = await request(app).get("/documents/client_waiver/status").set("x-test-user-id", "u1");
    expect(res.body).toMatchObject({ signed: false, version: "v1" });
  });

  test("reports signed:true and scopes by bookingId when provided", async () => {
    const signedAt = new Date();
    mockSignedDocument.findOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve({ signedAt }) }),
    });
    const res = await request(app)
      .get("/documents/client_waiver/status?bookingId=bk1")
      .set("x-test-user-id", "u1");
    expect(res.body.signed).toBe(true);
    expect(mockSignedDocument.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk1", signerClerkId: "u1" })
    );
  });
});

describe("signDocument", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(app).post("/documents/client_waiver/sign").send({});
    expect(res.status).toBe(401);
  });

  test("404 for an unknown document type", async () => {
    const res = await request(app).post("/documents/nope/sign").set("x-test-user-id", "u1").send({});
    expect(res.status).toBe(404);
  });

  test("400 when no signature name is typed", async () => {
    const res = await request(app)
      .post("/documents/client_waiver/sign")
      .set("x-test-user-id", "u1")
      .send({ signerRole: "client" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("signature_required");
  });

  test("400 when the signer role isn't allowed for the document", async () => {
    const res = await request(app)
      .post("/documents/client_waiver/sign")
      .set("x-test-user-id", "u1")
      .send({ signatureName: "Jane Doe", signerRole: "artist" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("role_not_allowed");
  });

  test("records the signature with the content hash", async () => {
    const res = await request(app)
      .post("/documents/client_waiver/sign")
      .set("x-test-user-id", "u1")
      .send({ signatureName: "Jane Doe", signerRole: "client", bookingId: "bk1" });
    expect(res.status).toBe(201);
    expect(mockSignedDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "client_waiver",
        signerClerkId: "u1",
        signatureName: "Jane Doe",
        contentHash: "hash123",
        bookingId: "bk1",
      })
    );
  });

  test("500 when the write fails", async () => {
    mockSignedDocument.create.mockRejectedValue(new Error("db"));
    const res = await request(app)
      .post("/documents/client_waiver/sign")
      .set("x-test-user-id", "u1")
      .send({ signatureName: "Jane Doe", signerRole: "client" });
    expect(res.status).toBe(500);
  });
});

describe("listMySignatures", () => {
  test("401 when unauthenticated", async () => {
    const res = await request(app).get("/signatures");
    expect(res.status).toBe(401);
  });

  test("returns the signer's signatures", async () => {
    mockSignedDocument.find.mockReturnValue({
      sort: () => ({ limit: () => ({ lean: () => Promise.resolve([{ _id: "s1" }]) }) }),
    });
    const res = await request(app).get("/signatures").set("x-test-user-id", "u1");
    expect(res.body).toHaveLength(1);
    expect(mockSignedDocument.find).toHaveBeenCalledWith({ signerClerkId: "u1" });
  });

  test("500 when the query throws", async () => {
    mockSignedDocument.find.mockImplementation(() => {
      throw new Error("db");
    });
    const res = await request(app).get("/signatures").set("x-test-user-id", "u1");
    expect(res.status).toBe(500);
  });
});
