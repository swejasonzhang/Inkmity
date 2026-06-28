import { describe, test, expect } from "@jest/globals";
import Message from "../../models/Message.js";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

conditionalDescribe("Message model", () => {
  test("applies defaults and createdAt-only timestamps", async () => {
    const doc = await Message.create({
      senderId: "a",
      receiverId: "b",
      text: "hello",
    });

    expect(doc.type).toBe("message");
    expect(doc.requestStatus).toBeUndefined();
    expect(doc.seen).toBe(false);
    expect(doc.delivered).toBe(false);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeUndefined();
  });

  test("requires senderId, receiverId, and text", async () => {
    await expect(Message.create({})).rejects.toThrow(/senderId/);
    await expect(
      Message.create({ senderId: "a", receiverId: "b" })
    ).rejects.toThrow(/text/);
  });

  test("rejects invalid type and requestStatus enum values", async () => {
    await expect(
      Message.create({ senderId: "a", receiverId: "b", text: "x", type: "bad" })
    ).rejects.toThrow(/type/);
    await expect(
      Message.create({
        senderId: "a",
        receiverId: "b",
        text: "x",
        requestStatus: "bad",
      })
    ).rejects.toThrow(/requestStatus/);
  });

  test("pre-save hook derives a sorted threadKey", async () => {
    const doc = await Message.create({
      senderId: "zeta",
      receiverId: "alpha",
      text: "hi",
    });
    expect(doc.threadKey).toBe("alpha:zeta");
  });

  test("pre-save hook does not overwrite an explicit threadKey", async () => {
    const doc = await Message.create({
      senderId: "zeta",
      receiverId: "alpha",
      text: "hi",
      threadKey: "custom",
    });
    expect(doc.threadKey).toBe("custom");
  });

  test("persists nested meta and request fields", async () => {
    const doc = await Message.create({
      senderId: "a",
      receiverId: "b",
      text: "request",
      type: "request",
      requestStatus: "pending",
      meta: {
        budgetCents: 5000,
        style: "blackwork",
        referenceUrls: ["https://x/1.png"],
        kind: "booking",
      },
    });
    expect(doc.type).toBe("request");
    expect(doc.requestStatus).toBe("pending");
    expect(doc.meta.budgetCents).toBe(5000);
    expect(doc.meta.referenceUrls).toEqual(["https://x/1.png"]);
    expect(doc.meta.workRefs).toEqual([]);
  });

  describe("ackForPair static", () => {
    test("marks delivered and seen for messages received by the viewer", async () => {
      const viewer = "viewer";
      const other = "other";
      await Message.create({
        senderId: other,
        receiverId: viewer,
        text: "to viewer",
      });
      await Message.create({
        senderId: viewer,
        receiverId: other,
        text: "from viewer",
      });

      const [deliveredRes, seenRes] = await Message.ackForPair(viewer, other);
      expect(deliveredRes.modifiedCount).toBe(1);
      expect(seenRes.modifiedCount).toBe(1);

      const inbound = await Message.findOne({
        senderId: other,
        receiverId: viewer,
      });
      expect(inbound.delivered).toBe(true);
      expect(inbound.seen).toBe(true);
      expect(inbound.deliveredAt).toBeInstanceOf(Date);
      expect(inbound.seenAt).toBeInstanceOf(Date);

      const outbound = await Message.findOne({
        senderId: viewer,
        receiverId: other,
      });
      expect(outbound.delivered).toBe(false);
      expect(outbound.seen).toBe(false);
    });

    test("is a no-op when there is nothing to acknowledge", async () => {
      const [deliveredRes, seenRes] = await Message.ackForPair("x", "y");
      expect(deliveredRes.modifiedCount).toBe(0);
      expect(seenRes.modifiedCount).toBe(0);
    });
  });
});
