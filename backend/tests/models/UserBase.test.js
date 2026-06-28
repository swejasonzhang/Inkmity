import { describe, test, expect } from "@jest/globals";
import UserBase from "../../models/UserBase.js";

const conditionalDescribe =
  process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

let seq = 0;
const validInput = (overrides = {}) => {
  seq += 1;
  return {
    clerkId: `clerk_${seq}`,
    email: `user${seq}@example.com`,
    handle: `handle_${seq}`,
    role: "client",
    ...overrides,
  };
};

conditionalDescribe("UserBase model", () => {
  test("applies defaults for optional fields", async () => {
    const doc = await UserBase.create(validInput());

    expect(doc.username).toBe("user");
    expect(doc.location).toBe("");
    expect(doc.bio).toBe("");
    expect(doc.visible).toBe(true);
    expect(doc.visibility).toBe("online");
    expect(doc.onboardingComplete).toBe(false);
    expect(doc.lastActive).toBeInstanceOf(Date);
    expect(doc.createdAt).toBeInstanceOf(Date);
  });

  test("requires clerkId, email, handle, and role", async () => {
    await expect(UserBase.create({})).rejects.toThrow();
    await expect(
      UserBase.create({ clerkId: "c", email: "e@e.com", role: "client" })
    ).rejects.toThrow(/handle/);
  });

  test("rejects invalid role enum value", async () => {
    await expect(
      UserBase.create(validInput({ role: "wizard" }))
    ).rejects.toThrow(/role/);
  });

  test("rejects invalid visibility enum value", async () => {
    await expect(
      UserBase.create(validInput({ visibility: "ghost" }))
    ).rejects.toThrow(/visibility/);
  });

  test("enforces bio maxlength", async () => {
    await expect(
      UserBase.create(validInput({ bio: "x".repeat(601) }))
    ).rejects.toThrow(/bio/);
  });

  describe("pre-validate username normalization", () => {
    test("blank username falls back to 'user'", async () => {
      const doc = await UserBase.create(validInput({ username: "   " }));
      expect(doc.username).toBe("user");
    });

    test("keeps a provided username", async () => {
      const doc = await UserBase.create(validInput({ username: "inkfan" }));
      expect(doc.username).toBe("inkfan");
    });
  });

  describe("getAvatarUrl method", () => {
    test("returns the avatar url when set", async () => {
      const doc = await UserBase.create(
        validInput({ avatar: { url: "https://cdn/me.png" } })
      );
      expect(doc.getAvatarUrl()).toBe("https://cdn/me.png");
    });

    test("returns a placeholder url when no avatar is set", async () => {
      const doc = await UserBase.create(validInput());
      expect(doc.getAvatarUrl()).toBe(
        "https://images.placeholders.dev/?width=256&height=256&text=Profile"
      );
    });
  });

  test("enforces unique clerkId", async () => {
    await UserBase.init();
    const input = validInput();
    await UserBase.create(input);
    await expect(
      UserBase.create({ ...validInput(), clerkId: input.clerkId })
    ).rejects.toThrow();
  });
});
