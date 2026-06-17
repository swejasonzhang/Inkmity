import request from "supertest";
import express from "express";
import Report from "../../models/Report.js";
import { createReport, listReports } from "../../controllers/reportController.js";

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
app.post("/reports", mockAuth, createReport);
app.get("/reports", mockAuth, listReports);

conditionalDescribe("reports", () => {
  test("creates a report with a valid target + reason", async () => {
    const res = await request(app)
      .post("/reports")
      .set("x-test-user-id", "user_1")
      .send({ targetType: "artwork", targetRef: "https://img/x.jpg", reason: "inappropriate", details: "nsfw" });
    expect(res.status).toBe(201);
    const saved = await Report.findOne({ targetRef: "https://img/x.jpg" });
    expect(saved.reporterClerkId).toBe("user_1");
    expect(saved.status).toBe("open");
    expect(saved.reason).toBe("inappropriate");
  });

  test("rejects an invalid target type", async () => {
    const res = await request(app)
      .post("/reports")
      .set("x-test-user-id", "user_1")
      .send({ targetType: "nope", targetRef: "x", reason: "spam" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_target_type");
  });

  test("rejects an invalid reason", async () => {
    const res = await request(app)
      .post("/reports")
      .set("x-test-user-id", "user_1")
      .send({ targetType: "artwork", targetRef: "x", reason: "because" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_reason");
  });

  test("requires auth", async () => {
    const res = await request(app)
      .post("/reports")
      .send({ targetType: "artwork", targetRef: "x", reason: "spam" });
    expect(res.status).toBe(401);
  });

  test("forbids non-admins from listing reports", async () => {
    const res = await request(app).get("/reports").set("x-test-user-id", "user_1");
    expect(res.status).toBe(403);
  });
});
