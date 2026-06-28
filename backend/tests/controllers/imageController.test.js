import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

process.env.CLOUDINARY_API_KEY = "ck_test";
process.env.CLOUDINARY_CLOUD_NAME = "inkmity";
process.env.CLOUDINARY_API_SECRET = "secret";

const mockCloudinary = {
  config: jest.fn(),
  utils: { api_sign_request: jest.fn(() => "signed123") },
  uploader: { destroy: jest.fn() },
};
const mockImage = { insertMany: jest.fn(), find: jest.fn(), findById: jest.fn(), deleteOne: jest.fn() };
const mockUser = { updateOne: jest.fn() };

jest.unstable_mockModule("cloudinary", () => ({ v2: mockCloudinary }));
jest.unstable_mockModule("../../models/Image.js", () => ({ default: mockImage }));
jest.unstable_mockModule("../../models/UserBase.js", () => ({ default: mockUser }));

const { signUpload, saveImages, listImages, deleteImage } = await import(
  "../../controllers/imageController.js"
);

function q(value) {
  const obj = {
    sort: () => obj,
    limit: () => obj,
    then: (res, rej) => Promise.resolve(value).then(res, rej),
  };
  return obj;
}

const app = express();
app.use(express.json());
app.get("/images/sign", signUpload);
app.post("/images/sign", signUpload);
app.post("/images", saveImages);
app.get("/images", listImages);
app.delete("/images/:id", deleteImage);

beforeEach(() => {
  jest.clearAllMocks();
  mockCloudinary.utils.api_sign_request.mockReturnValue("signed123");
  mockCloudinary.uploader.destroy.mockResolvedValue({});
  mockImage.insertMany.mockResolvedValue([{ url: "https://img/1" }]);
  mockImage.find.mockReturnValue(q([{ _id: "i1", url: "https://img/1" }]));
  mockImage.findById.mockResolvedValue({ _id: "i1", publicId: "pid", kind: "reference", role: "client", userId: "c1", url: "https://img/1" });
  mockImage.deleteOne.mockResolvedValue({});
  mockUser.updateOne.mockResolvedValue({});
});

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

describe("signUpload", () => {
  test("signs a portfolio upload via GET with the right folder", async () => {
    const res = await request(server).get("/images/sign?kind=artist_portfolio");
    expect(res.body.signature).toBe("signed123");
    expect(res.body.folder).toBe("inkmity/portfolio");
    expect(res.body.apiKey).toBe("ck_test");
  });
  test("signs a reference upload via POST by default", async () => {
    const res = await request(server).post("/images/sign").send({});
    expect(res.body.folder).toBe("inkmity/references");
    expect(res.body.tags).toBe("reference");
  });
});

describe("saveImages", () => {
  test("400 when required fields are missing", async () => {
    expect((await request(server).post("/images").send({ userId: "c1" })).status).toBe(400);
  });
  test("saves images and appends client reference urls", async () => {
    const res = await request(server).post("/images").send({
      userId: "c1",
      role: "client",
      kind: "client_ref",
      files: [{ public_id: "p1", secure_url: "https://img/1", width: 10, height: 10 }],
    });
    expect(res.body).toEqual({ ok: true, count: 1 });
    expect(mockUser.updateOne).toHaveBeenCalledWith(
      { clerkId: "c1" },
      expect.objectContaining({ $addToSet: expect.anything() }),
      expect.anything()
    );
  });
  test("portfolio images do not touch client references", async () => {
    await request(server).post("/images").send({
      userId: "a1",
      role: "artist",
      kind: "artist_portfolio",
      files: [{ public_id: "p1", secure_url: "https://img/1" }],
    });
    expect(mockUser.updateOne).not.toHaveBeenCalled();
  });
  test("swallows an insert failure and reports count 0", async () => {
    mockImage.insertMany.mockRejectedValue(new Error("dup"));
    const res = await request(server).post("/images").send({ userId: "c1", role: "client", kind: "client_ref", files: [{ public_id: "p" }] });
    expect(res.body).toEqual({ ok: true, count: 0 });
  });
});

describe("listImages", () => {
  test("returns items with a next cursor and applies filters", async () => {
    const res = await request(server).get("/images?userId=c1&role=client&kind=client_ref&cursor=z");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.nextCursor).toBe("i1");
  });
  test("null cursor when there are no items", async () => {
    mockImage.find.mockReturnValue(q([]));
    const res = await request(server).get("/images");
    expect(res.body.nextCursor).toBeNull();
  });
});

describe("deleteImage", () => {
  test("404 when the image is missing", async () => {
    mockImage.findById.mockResolvedValue(null);
    expect((await request(server).delete("/images/i1")).status).toBe(404);
  });
  test("destroys in Cloudinary, deletes the doc, and pulls the client reference", async () => {
    const res = await request(server).delete("/images/i1");
    expect(res.body.ok).toBe(true);
    expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith("pid", expect.anything());
    expect(mockImage.deleteOne).toHaveBeenCalledWith({ _id: "i1" });
    expect(mockUser.updateOne).toHaveBeenCalledWith({ clerkId: "c1" }, { $pull: { references: "https://img/1" } });
  });
  test("still deletes when the Cloudinary destroy fails", async () => {
    mockCloudinary.uploader.destroy.mockRejectedValue(new Error("cloud_down"));
    const res = await request(server).delete("/images/i1");
    expect(res.body.ok).toBe(true);
    expect(mockImage.deleteOne).toHaveBeenCalled();
  });
});
