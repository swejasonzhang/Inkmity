import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import Report from "../../models/Report.js";
import { config } from "../../config/index.js";
import { createReport, listReports, updateReportStatus } from "../../controllers/reportController.js";

const ADMIN_ID = "admin_report_test";

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
app.patch("/reports/:id", mockAuth, updateReportStatus);

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

  test("forbids non-admins from actioning a report", async () => {
    const res = await request(app)
      .patch("/reports/507f1f77bcf86cd799439011")
      .set("x-test-user-id", "user_1")
      .send({ status: "dismissed" });
    expect(res.status).toBe(403);
  });

  test("dedupes repeat open reports from the same reporter for the same target", async () => {
    const body = { targetType: "artwork", targetRef: "https://img/dupe.jpg", reason: "spam" };
    const first = await request(app).post("/reports").set("x-test-user-id", "user_d").send(body);
    expect(first.status).toBe(201);
    const second = await request(app).post("/reports").set("x-test-user-id", "user_d").send(body);
    expect(second.status).toBe(200);
    expect(second.body.deduped).toBe(true);
    expect(await Report.countDocuments({ targetRef: "https://img/dupe.jpg" })).toBe(1);
  });

  test("rejects a missing target ref", async () => {
    const res = await request(app)
      .post("/reports")
      .set("x-test-user-id", "user_1")
      .send({ targetType: "artwork", targetRef: "   ", reason: "spam" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("target_required");
  });

  test("persists targetOwnerClerkId and truncates details to 1000 chars", async () => {
    const longDetails = "z".repeat(1500);
    const res = await request(app)
      .post("/reports")
      .set("x-test-user-id", "user_owner")
      .send({
        targetType: "artist",
        targetRef: "artist_42",
        reason: "impersonation",
        details: longDetails,
        targetOwnerClerkId: "owner_42",
      });
    expect(res.status).toBe(201);
    const saved = await Report.findOne({ targetRef: "artist_42" });
    expect(saved.targetOwnerClerkId).toBe("owner_42");
    expect(saved.details.length).toBe(1000);
  });

  test("returns 500 when report creation throws", async () => {
    const spy = jest.spyOn(Report, "create").mockRejectedValueOnce(new Error("boom"));
    const res = await request(app)
      .post("/reports")
      .set("x-test-user-id", "user_err")
      .send({ targetType: "message", targetRef: "msg_1", reason: "other" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("report_failed");
    spy.mockRestore();
  });
});

conditionalDescribe("reports admin moderation", () => {
  beforeEach(() => {
    config.admin.clerkIds.push(ADMIN_ID);
  });

  afterEach(() => {
    const i = config.admin.clerkIds.indexOf(ADMIN_ID);
    if (i !== -1) config.admin.clerkIds.splice(i, 1);
    jest.restoreAllMocks();
  });

  test("admin lists all reports sorted by newest", async () => {
    await Report.create({ reporterClerkId: "u1", targetType: "artwork", targetRef: "a", reason: "spam" });
    await Report.create({ reporterClerkId: "u2", targetType: "message", targetRef: "b", reason: "other" });
    const res = await request(app).get("/reports").set("x-test-user-id", ADMIN_ID);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.reports.length).toBe(2);
  });

  test("admin filters reports by status", async () => {
    await Report.create({ reporterClerkId: "u1", targetType: "artwork", targetRef: "a", reason: "spam", status: "open" });
    await Report.create({ reporterClerkId: "u2", targetType: "message", targetRef: "b", reason: "other", status: "dismissed" });
    const res = await request(app).get("/reports?status=dismissed").set("x-test-user-id", ADMIN_ID);
    expect(res.status).toBe(200);
    expect(res.body.reports.length).toBe(1);
    expect(res.body.reports[0].targetRef).toBe("b");
  });

  test("listReports returns 500 on db error", async () => {
    jest.spyOn(Report, "find").mockImplementationOnce(() => {
      throw new Error("db down");
    });
    const res = await request(app).get("/reports").set("x-test-user-id", ADMIN_ID);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("list_failed");
  });

  test("admin updates a report status", async () => {
    const rep = await Report.create({ reporterClerkId: "u1", targetType: "artwork", targetRef: "a", reason: "spam" });
    const res = await request(app)
      .patch(`/reports/${rep._id}`)
      .set("x-test-user-id", ADMIN_ID)
      .send({ status: "reviewed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("reviewed");
    const reloaded = await Report.findById(rep._id);
    expect(reloaded.status).toBe("reviewed");
  });

  test("rejects an invalid status update", async () => {
    const rep = await Report.create({ reporterClerkId: "u1", targetType: "artwork", targetRef: "a", reason: "spam" });
    const res = await request(app)
      .patch(`/reports/${rep._id}`)
      .set("x-test-user-id", ADMIN_ID)
      .send({ status: "bogus" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_status");
  });

  test("returns 404 when updating a nonexistent report", async () => {
    const res = await request(app)
      .patch("/reports/507f1f77bcf86cd799439011")
      .set("x-test-user-id", ADMIN_ID)
      .send({ status: "actioned" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  test("updateReportStatus returns 500 on db error", async () => {
    jest.spyOn(Report, "findByIdAndUpdate").mockImplementationOnce(() => {
      throw new Error("db down");
    });
    const res = await request(app)
      .patch("/reports/507f1f77bcf86cd799439011")
      .set("x-test-user-id", ADMIN_ID)
      .send({ status: "actioned" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("update_failed");
  });
});
