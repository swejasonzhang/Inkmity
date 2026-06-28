import { describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";
import Sketch from "../../models/Sketch.js";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const validInput = () => ({
  bookingId: new mongoose.Types.ObjectId(),
  artistId: "artist_1",
  clientId: "client_1",
});

conditionalDescribe("Sketch model", () => {
  test("applies defaults for optional fields", async () => {
    const doc = await Sketch.create(validInput());

    expect(doc.imageUrls).toEqual([]);
    expect(doc.note).toBe("");
    expect(doc.clientNote).toBe("");
    expect(doc.status).toBe("pending");
    expect(doc.respondedAt).toBeUndefined();
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  test("persists provided values", async () => {
    const doc = await Sketch.create({
      ...validInput(),
      imageUrls: ["https://cdn/a.png", "https://cdn/b.png"],
      note: "first pass",
      clientNote: "looks good",
      status: "approved",
      respondedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(doc.imageUrls).toHaveLength(2);
    expect(doc.note).toBe("first pass");
    expect(doc.clientNote).toBe("looks good");
    expect(doc.status).toBe("approved");
    expect(doc.respondedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  test("requires bookingId", async () => {
    const { bookingId: _bookingId, ...rest } = validInput();
    await expect(Sketch.create(rest)).rejects.toThrow(/bookingId/);
  });

  test("requires artistId", async () => {
    const { artistId: _artistId, ...rest } = validInput();
    await expect(Sketch.create(rest)).rejects.toThrow(/artistId/);
  });

  test("requires clientId", async () => {
    const { clientId: _clientId, ...rest } = validInput();
    await expect(Sketch.create(rest)).rejects.toThrow(/clientId/);
  });

  test("rejects invalid status enum value", async () => {
    await expect(
      Sketch.create({ ...validInput(), status: "rejected" })
    ).rejects.toThrow(/status/);
  });

  test("accepts every valid status enum value", async () => {
    for (const status of ["pending", "approved", "changes_requested"]) {
      const doc = await Sketch.create({ ...validInput(), status });
      expect(doc.status).toBe(status);
    }
  });
});
