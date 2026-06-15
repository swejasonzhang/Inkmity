import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import "../../models/Client.js";
import "../../models/Artist.js";
import ArtworkLike from "../../models/ArtworkLike.js";
import { getPopularArtworks, toggleArtworkLike } from "../../controllers/artworkController.js";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const mockAuth = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) {
    req.user = { clerkId: id };
    req.auth = { userId: id };
  }
  next();
};

const app = express();
app.use(express.json());
app.get("/artworks/popular", mockAuth, getPopularArtworks);
app.post("/artworks/like", mockAuth, toggleArtworkLike);

const Artist = () => mongoose.model("artist");

async function seedArtist(clerkId, overrides = {}) {
  return Artist().create({
    clerkId,
    email: `${clerkId}@example.com`,
    username: clerkId,
    handle: `@${clerkId}`,
    role: "artist",
    verified: true,
    ...overrides,
  });
}

conditionalDescribe("Artwork Controller", () => {
  test("getPopularArtworks ranks works by like count and flags likedByMe", async () => {
    await seedArtist("art_a", { rating: 4.5, bookingsCount: 5, portfolioImages: ["a1.jpg", "a2.jpg"] });
    await seedArtist("art_b", { rating: 4.9, portfolioImages: ["b1.jpg"] });

    await ArtworkLike.create([
      { userClerkId: "u1", artistClerkId: "art_a", imageUrl: "a1.jpg" },
      { userClerkId: "u2", artistClerkId: "art_a", imageUrl: "a1.jpg" },
      { userClerkId: "me", artistClerkId: "art_a", imageUrl: "a1.jpg" },
      { userClerkId: "u1", artistClerkId: "art_a", imageUrl: "a2.jpg" },
    ]);

    const res = await request(app).get("/artworks/popular").set("x-test-user-id", "me");
    expect(res.status).toBe(200);
    const items = res.body.items;
    expect(items).toHaveLength(3);

    // Most-liked first.
    expect(items[0].url).toBe("a1.jpg");
    expect(items[0].likes).toBe(3);
    expect(items[0].likedByMe).toBe(true);
    expect(items[0].verified).toBe(true);

    // a2 (1 like) before b1 (0 likes).
    const a2 = items.find((i) => i.url === "a2.jpg");
    const b1 = items.find((i) => i.url === "b1.jpg");
    expect(a2.likes).toBe(1);
    expect(a2.likedByMe).toBe(false);
    expect(b1.likes).toBe(0);
    expect(items.indexOf(a2)).toBeLessThan(items.indexOf(b1));
  });

  test("getPopularArtworks works unauthenticated (likedByMe all false)", async () => {
    await seedArtist("art_c", { portfolioImages: ["c1.jpg"] });
    await ArtworkLike.create({ userClerkId: "u9", artistClerkId: "art_c", imageUrl: "c1.jpg" });

    const res = await request(app).get("/artworks/popular");
    expect(res.status).toBe(200);
    const c1 = res.body.items.find((i) => i.url === "c1.jpg");
    expect(c1.likes).toBe(1);
    expect(c1.likedByMe).toBe(false);
  });

  test("toggleArtworkLike likes then unlikes, updating the count", async () => {
    await seedArtist("art_d", { portfolioImages: ["d1.jpg"] });

    const like = await request(app)
      .post("/artworks/like")
      .set("x-test-user-id", "me")
      .send({ artistClerkId: "art_d", imageUrl: "d1.jpg" });
    expect(like.status).toBe(200);
    expect(like.body).toEqual({ liked: true, likes: 1 });
    expect(await ArtworkLike.countDocuments({ artistClerkId: "art_d", imageUrl: "d1.jpg" })).toBe(1);

    const unlike = await request(app)
      .post("/artworks/like")
      .set("x-test-user-id", "me")
      .send({ artistClerkId: "art_d", imageUrl: "d1.jpg" });
    expect(unlike.status).toBe(200);
    expect(unlike.body).toEqual({ liked: false, likes: 0 });
    expect(await ArtworkLike.countDocuments({ artistClerkId: "art_d", imageUrl: "d1.jpg" })).toBe(0);
  });

  test("toggleArtworkLike requires auth and a target", async () => {
    const noAuth = await request(app).post("/artworks/like").send({ artistClerkId: "art_d", imageUrl: "d1.jpg" });
    expect(noAuth.status).toBe(401);

    const noBody = await request(app).post("/artworks/like").set("x-test-user-id", "me").send({});
    expect(noBody.status).toBe(400);
  });
});
