import { describe, test, expect } from "@jest/globals";
import DeletedConversation from "../../models/DeletedConversation.js";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

conditionalDescribe("DeletedConversation model", () => {
  test("creates a valid document with timestamps", async () => {
    const doc = await DeletedConversation.create({
      userId: "user_1",
      participantId: "user_2",
    });

    expect(doc.userId).toBe("user_1");
    expect(doc.participantId).toBe("user_2");
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  test("requires userId", async () => {
    await expect(
      DeletedConversation.create({ participantId: "user_2" })
    ).rejects.toThrow(/userId/);
  });

  test("requires participantId", async () => {
    await expect(
      DeletedConversation.create({ userId: "user_1" })
    ).rejects.toThrow(/participantId/);
  });

  test("enforces unique (userId, participantId) compound index", async () => {
    await DeletedConversation.init();
    await DeletedConversation.create({ userId: "u", participantId: "p" });

    await expect(
      DeletedConversation.create({ userId: "u", participantId: "p" })
    ).rejects.toThrow();
  });

  test("allows same userId with different participantId", async () => {
    await DeletedConversation.init();
    await DeletedConversation.create({ userId: "u", participantId: "p1" });
    const second = await DeletedConversation.create({
      userId: "u",
      participantId: "p2",
    });
    expect(second.participantId).toBe("p2");
  });
});
