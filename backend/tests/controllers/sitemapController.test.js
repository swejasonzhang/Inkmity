import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { getSitemap } from "../../controllers/sitemapController.js";
import "../../models/Artist.js";

const conditionalDescribe = process.env.DATABASE_AVAILABLE === "true" ? describe : describe.skip;

const app = express();
app.get("/sitemap.xml", getSitemap);

let server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => { server.close(done); });

conditionalDescribe("sitemap", () => {
  test("includes static pages + visible artists and excludes deactivated ones", async () => {
    const Artist = mongoose.model("artist");
    await Artist.create({
      clerkId: "sm-vis",
      email: "v@example.com",
      username: "Vis",
      handle: "@visible-artist",
      role: "artist",
      visible: true,
    });
    await Artist.create({
      clerkId: "sm-hid",
      email: "h@example.com",
      username: "Hid",
      handle: "@hidden-artist",
      role: "artist",
      visible: false,
    });

    const res = await request(server).get("/sitemap.xml");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/xml/);
    expect(res.text).toContain("<loc>https://inkmity.com/faq</loc>");
    expect(res.text).toContain("<loc>https://inkmity.com/artist/visible-artist</loc>");
    expect(res.text).not.toContain("hidden-artist");
  });
});
