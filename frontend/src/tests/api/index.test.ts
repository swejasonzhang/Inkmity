import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { useAuth } from "@clerk/clerk-react";
import {
  useApi,
  API_URL,
  isAbortError,
  apiGet,
  apiPost,
  fetchArtists,
  fetchArtistById,
  fetchArtistByHandle,
  fetchPopularArtworks,
  toggleArtworkLike,
  fetchPaymentBreakdown,
  addReview,
  getBooking,
  checkoutDeposit,
  createTipCheckout,
  getMe,
  updateVisibility,
  updateMyPortfolio,
  getTrendingIdeas,
  createReport,
  getNoShowDisputes,
  resolveArtistNoShow,
  listReports,
  updateReportStatus,
  syncUser,
  getAppointments,
  getNotifications,
  acceptAppointment,
  denyAppointment,
  reportArtistNoShow,
  checkInBooking,
  respondArtistNoShow,
  startBookingVerification,
  verifyBookingCompletion,
  setBookingFinalPrice,
  approveBookingFinalPrice,
  getIntakeForm,
  submitIntakeForm,
  deleteIntakeForm,
  createCardSetupIntent,
  createBankSetupIntent,
  createClientSetupIntent,
  listClientPaymentMethods,
  deleteClientPaymentMethod,
  getArtistPolicy,
  updateArtistPolicy,
  getBookingGate,
  enableClientBookings,
  getDocument,
  signDocument,
  getSignatureStatus,
  getArtistAnalytics,
  getConnectStatus,
  startConnectOnboarding,
  getConnectLoginLink,
  createStudio,
  getMyStudios,
  updateStudio,
  listStudioMembers,
  inviteArtistToStudio,
  updateStudioMember,
  removeStudioMember,
  getMyStudioMemberships,
  respondToStudioInvite,
  getStudioConnectStatus,
  startStudioConnectOnboarding,
  formatPlatformFee,
  getMyRewards,
  joinWaitlist,
  leaveWaitlist,
  getMyWaitlist,
  getArtistWaitlist,
  getSketches,
  createSketch,
  respondToSketch,
} from "../../api/index";

const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

function jsonRes(
  body: unknown,
  init: { ok?: boolean; status?: number; statusText?: string; headers?: Record<string, string> } = {}
) {
  const headers = new Headers({ "content-type": "application/json", ...(init.headers || {}) });
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    headers,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function textRes(
  text: string,
  init: { ok?: boolean; status?: number; statusText?: string; headers?: Record<string, string> } = {}
) {
  const headers = new Headers(init.headers || {});
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    headers,
    json: async () => {
      throw new Error("not json");
    },
    text: async () => text,
  } as unknown as Response;
}

function next(res: Response) {
  fetchMock.mockResolvedValueOnce(res);
}

function lastCall(): [string, RequestInit] {
  const calls = fetchMock.mock.calls;
  return calls[calls.length - 1] as [string, RequestInit];
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("API_URL", () => {
  test("resolves from import.meta env without trailing slash", () => {
    expect(API_URL).toBe("http://localhost:3001");
  });
});

describe("isAbortError", () => {
  test("true for AbortError-shaped objects", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
  });
  test("false for other errors and primitives", () => {
    expect(isAbortError(new Error("boom"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError("x")).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});

describe("apiRequest helper (via apiGet/apiPost)", () => {
  test("apiGet builds absolute URL, GET method, default JSON header, no auth", async () => {
    next(jsonRes({ hello: "world" }));
    const out = await apiGet("/ping");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/ping");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.credentials).toBe("include");
    expect(out).toEqual({ hello: "world" });
  });

  test("adds Authorization header when token supplied", async () => {
    next(jsonRes({ ok: true }));
    await apiGet("/secure", undefined, "tok-123");
    const [, init] = lastCall();
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
  });

  test("omits Authorization when token is null", async () => {
    next(jsonRes({ ok: true }));
    await apiGet("/secure", undefined, null);
    const [, init] = lastCall();
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  test("builds query string from params (scalars, arrays, objects); skips empty", async () => {
    next(jsonRes({ items: [] }));
    await apiGet("/search", {
      q: "ink",
      tags: ["a", "b"],
      filter: { min: 1 },
      skip: undefined,
      empty: "",
      nil: null,
      n: 0,
    });
    const [url] = lastCall();
    expect(url).toContain("q=ink");
    expect(url).toContain("tags=a");
    expect(url).toContain("tags=b");
    expect(url).toContain(`filter=${encodeURIComponent('{"min":1}')}`);
    expect(url).toContain("n=0");
    expect(url).not.toContain("skip=");
    expect(url).not.toContain("empty=");
    expect(url).not.toContain("nil=");
  });

  test("leaves absolute http(s) paths untouched", async () => {
    next(jsonRes({ ok: true }));
    await apiGet("https://example.com/x", { a: 1 });
    const [url] = lastCall();
    expect(url).toBe("https://example.com/x?a=1");
  });

  test("apiPost serializes body to JSON with POST method", async () => {
    next(jsonRes({ created: true }));
    await apiPost("/things", { name: "z" }, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/things");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "z" }));
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  test("apiPost with no body sends undefined body", async () => {
    next(jsonRes({ ok: true }));
    await apiPost("/things");
    const [, init] = lastCall();
    expect(init.body).toBeUndefined();
  });

  test("returns raw text when response is not JSON", async () => {
    next(textRes("plain-text"));
    const out = await apiGet<string>("/text");
    expect(out).toBe("plain-text");
  });

  test("throws Error with status/body/url on non-ok JSON response (message field)", async () => {
    next(jsonRes({ message: "nope" }, { ok: false, status: 400, statusText: "Bad Request" }));
    await expect(apiGet("/bad")).rejects.toMatchObject({
      message: "nope",
      status: 400,
      url: "http://localhost:3001/bad",
    });
  });

  test("uses error field then statusText fallback", async () => {
    next(jsonRes({ error: "boom" }, { ok: false, status: 500 }));
    await expect(apiGet("/e1")).rejects.toThrow("boom");

    next(jsonRes({}, { ok: false, status: 503, statusText: "Service Unavailable" }));
    await expect(apiGet("/e2")).rejects.toThrow("Service Unavailable");
  });

  test("wraps plain text error body as message", async () => {
    next(textRes("upstream exploded", { ok: false, status: 502, statusText: "" }));
    await expect(apiGet("/e3")).rejects.toThrow("upstream exploded");
  });

  test("falls back to 'Request failed' when no message available", async () => {
    next(textRes("", { ok: false, status: 500, statusText: "" }));
    await expect(apiGet("/e4")).rejects.toThrow("Request failed");
  });

  test("safeParse returns undefined for malformed JSON, falling back to text message", async () => {
    const headers = new Headers({ "content-type": "application/json" });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "",
      headers,
      json: async () => ({}),
      text: async () => "{not-valid-json",
    } as unknown as Response);
    await expect(apiGet("/malformed")).rejects.toThrow("{not-valid-json");
  });

  test("attaches requestId and headers from the response", async () => {
    next(jsonRes({ message: "x" }, { ok: false, status: 401, headers: { "x-request-id": "req-9" } }));
    await expect(apiGet("/e5")).rejects.toMatchObject({ requestId: "req-9" });
  });

  test("propagates fetch network errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await expect(apiGet("/down")).rejects.toThrow("network down");
  });

  test("propagates AbortError from fetch", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    fetchMock.mockRejectedValueOnce(abort);
    await expect(apiGet("/abort")).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("GET endpoints", () => {
  test("fetchArtists passes filters as query", async () => {
    next(jsonRes({ items: [], total: 0, page: 1, pageSize: 10 }));
    await fetchArtists({ style: "blackwork", page: 2 });
    const [url, init] = lastCall();
    expect(url).toContain("/users/artists?");
    expect(url).toContain("style=blackwork");
    expect(url).toContain("page=2");
    expect(init.method).toBe("GET");
  });

  test("fetchArtistById hits id path", async () => {
    next(jsonRes({ _id: "a1" }));
    await fetchArtistById("a1");
    expect(lastCall()[0]).toBe("http://localhost:3001/users/artists/a1");
  });

  test("fetchArtistByHandle strips leading @ and encodes", async () => {
    next(jsonRes({ _id: "a1" }));
    await fetchArtistByHandle("@jane doe");
    expect(lastCall()[0]).toBe("http://localhost:3001/users/artists/by-handle/jane%20doe");
  });

  test("fetchPopularArtworks defaults limit and forwards token", async () => {
    next(jsonRes({ items: [] }));
    await fetchPopularArtworks("tk");
    const [url, init] = lastCall();
    expect(url).toContain("/artworks/popular?limit=60");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tk");
  });

  test("getMe reads token from opts", async () => {
    next(jsonRes({ _id: "u", clerkId: "c", role: "client", username: "u" }));
    await getMe({ token: "mt" });
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/users/me");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer mt");
  });

  test("getTrendingIdeas hits endpoint anonymously", async () => {
    next(jsonRes({ items: [] }));
    await getTrendingIdeas();
    expect(lastCall()[0]).toBe("http://localhost:3001/artworks/trending-ideas");
  });

  test("getBooking", async () => {
    next(jsonRes({ _id: "b1" }));
    await getBooking("b1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/bookings/b1");
  });

  test("getAppointments with role param", async () => {
    next(jsonRes([]));
    await getAppointments("artist", "t");
    expect(lastCall()[0]).toContain("/bookings/appointments?role=artist");
  });

  test("getAppointments without role omits query", async () => {
    next(jsonRes([]));
    await getAppointments(undefined, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/bookings/appointments");
  });

  test("getNotifications", async () => {
    next(jsonRes({ items: [] }));
    await getNotifications("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/messages/notifications");
  });

  test("getNoShowDisputes", async () => {
    next(jsonRes({ items: [] }));
    await getNoShowDisputes("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/bookings/no-show-disputes");
  });

  test("listReports passes status filter", async () => {
    next(jsonRes({ reports: [] }));
    await listReports({ status: "open" }, "t");
    expect(lastCall()[0]).toContain("/reports?status=open");
  });

  test("getIntakeForm", async () => {
    next(jsonRes(null));
    await getIntakeForm("b1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/bookings/b1/intake");
  });

  test("listClientPaymentMethods", async () => {
    next(jsonRes({ methods: [] }));
    await listClientPaymentMethods("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/billing/client/payment-methods");
  });

  test("getArtistPolicy is anonymous", async () => {
    next(jsonRes({ artistId: "a1" }));
    await getArtistPolicy("a1");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/artist-policy/a1");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  test("getBookingGate with clientId encodes query", async () => {
    next(jsonRes({ enabled: true }));
    await getBookingGate("a1", "c 1");
    expect(lastCall()[0]).toBe(
      "http://localhost:3001/artist-policy/a1/booking-gate?clientId=c%201"
    );
  });

  test("getBookingGate without clientId", async () => {
    next(jsonRes({ enabled: true }));
    await getBookingGate("a1");
    expect(lastCall()[0]).toBe("http://localhost:3001/artist-policy/a1/booking-gate");
  });

  test("getDocument", async () => {
    next(jsonRes({ docType: "waiver" }));
    await getDocument("waiver");
    expect(lastCall()[0]).toBe("http://localhost:3001/documents/waiver");
  });

  test("getSignatureStatus passes bookingId param", async () => {
    next(jsonRes({ signed: false }));
    await getSignatureStatus("waiver", { bookingId: "b1" }, "t");
    expect(lastCall()[0]).toContain("/documents/waiver/status?bookingId=b1");
  });

  test("getArtistAnalytics", async () => {
    next(jsonRes({ tier: {} }));
    await getArtistAnalytics("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/dashboard/artist-analytics");
  });

  test("getConnectStatus", async () => {
    next(jsonRes({ connected: false }));
    await getConnectStatus("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/connect/status");
  });

  test("getMyStudios", async () => {
    next(jsonRes([]));
    await getMyStudios("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/mine");
  });

  test("listStudioMembers", async () => {
    next(jsonRes([]));
    await listStudioMembers("s1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/s1/members");
  });

  test("getMyStudioMemberships", async () => {
    next(jsonRes([]));
    await getMyStudioMemberships("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/memberships/mine");
  });

  test("getStudioConnectStatus", async () => {
    next(jsonRes({ connected: false }));
    await getStudioConnectStatus("s1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/s1/connect/status");
  });

  test("getMyRewards", async () => {
    next(jsonRes({ completedBookings: 0 }));
    await getMyRewards("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/rewards/me");
  });

  test("getMyWaitlist / getArtistWaitlist", async () => {
    next(jsonRes([]));
    await getMyWaitlist("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/waitlist/mine");
    next(jsonRes([]));
    await getArtistWaitlist("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/waitlist/artist");
  });

  test("getSketches passes bookingId query", async () => {
    next(jsonRes([]));
    await getSketches("b1", "t");
    expect(lastCall()[0]).toContain("/sketches?bookingId=b1");
  });
});

describe("POST endpoints", () => {
  test("toggleArtworkLike", async () => {
    next(jsonRes({ liked: true, likes: 3 }));
    const out = await toggleArtworkLike({ artistClerkId: "a", imageUrl: "u" }, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/artworks/like");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ artistClerkId: "a", imageUrl: "u" });
    expect(out).toEqual({ liked: true, likes: 3 });
  });

  test("fetchPaymentBreakdown", async () => {
    next(jsonRes({ priceCents: 100 }));
    await fetchPaymentBreakdown({ bookingId: "b1" }, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/billing/breakdown");
    expect(JSON.parse(init.body as string)).toEqual({ bookingId: "b1" });
  });

  test("addReview puts token first arg, body second", async () => {
    next(jsonRes({ ok: true }));
    await addReview("t", { artistClerkId: "a", rating: 5 });
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/reviews");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
    expect(JSON.parse(init.body as string)).toEqual({ artistClerkId: "a", rating: 5 });
  });

  test("checkoutDeposit / createTipCheckout build bodies", async () => {
    next(jsonRes({ url: "x" }));
    await checkoutDeposit("b1", "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ bookingId: "b1" });

    next(jsonRes({ url: "x" }));
    await createTipCheckout("b1", 500, "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ bookingId: "b1", tipCents: 500 });
  });

  test("createReport", async () => {
    next(jsonRes({ ok: true }));
    await createReport({ targetType: "artwork", targetRef: "r1", reason: "spam" }, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/reports");
  });

  test("resolveArtistNoShow", async () => {
    next(jsonRes({ _id: "b1" }));
    await resolveArtistNoShow("b1", true, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/bookings/b1/artist-no-show/resolve");
    expect(JSON.parse(init.body as string)).toEqual({ refund: true });
  });

  test("syncUser posts payload with token", async () => {
    next(jsonRes({ ok: true }));
    await syncUser("t", {
      clerkId: "c",
      email: "e",
      role: "client",
      username: "u",
      profile: {},
    });
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/users/sync");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  test("acceptAppointment posts undefined body", async () => {
    next(jsonRes({ _id: "b1" }));
    await acceptAppointment("b1", "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/bookings/b1/accept");
    expect(init.body).toBeUndefined();
  });

  test("denyAppointment with and without reason", async () => {
    next(jsonRes({ _id: "b1" }));
    await denyAppointment("b1", "busy", "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ reason: "busy" });

    next(jsonRes({ _id: "b1" }));
    await denyAppointment("b1", undefined, "t");
    expect(lastCall()[1].body).toBeUndefined();
  });

  test("reportArtistNoShow with reason", async () => {
    next(jsonRes({ _id: "b1" }));
    await reportArtistNoShow("b1", "late", "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ reason: "late" });
  });

  test("checkInBooking forwards coords", async () => {
    next(jsonRes({ _id: "b1" }));
    await checkInBooking("b1", { lat: 1, lng: 2 }, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/bookings/b1/check-in");
    expect(JSON.parse(init.body as string)).toEqual({ lat: 1, lng: 2 });
  });

  test("respondArtistNoShow", async () => {
    next(jsonRes({ _id: "b1" }));
    await respondArtistNoShow("b1", true, "ok", "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ accept: true, note: "ok" });
  });

  test("startBookingVerification", async () => {
    next(jsonRes({ _id: "b1" }));
    await startBookingVerification("b1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/bookings/b1/verify/start");
  });

  test("verifyBookingCompletion", async () => {
    next(jsonRes({ _id: "b1" }));
    await verifyBookingCompletion("b1", "client", "123456", "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ role: "client", code: "123456" });
  });

  test("approveBookingFinalPrice posts empty object", async () => {
    next(jsonRes({ _id: "b1" }));
    await approveBookingFinalPrice("b1", "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({});
  });

  test("submitIntakeForm", async () => {
    next(jsonRes({ _id: "i1" }));
    await submitIntakeForm("b1", { additionalNotes: "x" }, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/bookings/b1/intake");
    expect(JSON.parse(init.body as string)).toEqual({ additionalNotes: "x" });
  });

  test("createCardSetupIntent / createBankSetupIntent / createClientSetupIntent", async () => {
    next(jsonRes({ clientSecret: "x", setupIntentId: "y", customerId: "z" }));
    await createCardSetupIntent("b1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/billing/setup-intent");

    next(jsonRes({ clientSecret: "x", setupIntentId: "y", customerId: "z" }));
    await createBankSetupIntent("b1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/billing/bank-setup-intent");

    next(jsonRes({ clientSecret: "x", setupIntentId: "y", customerId: "z" }));
    await createClientSetupIntent("t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/billing/client/setup-intent");
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  test("deleteClientPaymentMethod", async () => {
    next(jsonRes({ ok: true }));
    await deleteClientPaymentMethod("pm1", "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ paymentMethodId: "pm1" });
  });

  test("enableClientBookings merges opts", async () => {
    next(jsonRes({ ok: true }));
    await enableClientBookings("a1", "c1", { pieceSize: "small", maxSessions: 2 }, "t");
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({
      artistId: "a1",
      clientId: "c1",
      pieceSize: "small",
      maxSessions: 2,
    });
  });

  test("signDocument", async () => {
    next(jsonRes({ ok: true }));
    await signDocument("waiver", { signatureName: "Jane", signerRole: "client" }, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/documents/waiver/sign");
  });

  test("connect onboarding/login links POST", async () => {
    next(jsonRes({ url: "x" }));
    await startConnectOnboarding("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/connect/account-link");

    next(jsonRes({ url: "x" }));
    await getConnectLoginLink("t");
    expect(lastCall()[0]).toBe("http://localhost:3001/connect/login-link");
  });

  test("createStudio / inviteArtistToStudio / respondToStudioInvite", async () => {
    next(jsonRes({ _id: "s1" }));
    await createStudio({ name: "Ink Co" }, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios");

    next(jsonRes({ _id: "m1" }));
    await inviteArtistToStudio("s1", { handle: "@joe" }, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/s1/invite");

    next(jsonRes({ _id: "m1" }));
    await respondToStudioInvite("m1", "accept", "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/studios/memberships/m1/respond");
    expect(JSON.parse(init.body as string)).toEqual({ action: "accept" });
  });

  test("startStudioConnectOnboarding", async () => {
    next(jsonRes({ url: "x" }));
    await startStudioConnectOnboarding("s1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/s1/connect/account-link");
  });

  test("joinWaitlist / createSketch / respondToSketch", async () => {
    next(jsonRes({ _id: "w1" }));
    await joinWaitlist({ artistId: "a1" }, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/waitlist");

    next(jsonRes({ _id: "sk1" }));
    await createSketch({ bookingId: "b1", imageUrls: ["u"] }, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/sketches");

    next(jsonRes({ _id: "sk1" }));
    await respondToSketch("sk1", "approve", "lgtm", "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/sketches/sk1/respond");
    expect(JSON.parse(init.body as string)).toEqual({ action: "approve", note: "lgtm" });
  });
});

describe("PATCH endpoints", () => {
  test("updateReportStatus", async () => {
    next(jsonRes({ _id: "r1" }));
    await updateReportStatus("r1", "resolved", "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/reports/r1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "resolved" });
  });

  test("setBookingFinalPrice", async () => {
    next(jsonRes({ _id: "b1" }));
    await setBookingFinalPrice("b1", 9900, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/bookings/b1/final-price");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ finalPriceCents: 9900 });
  });

  test("updateStudio / updateStudioMember", async () => {
    next(jsonRes({ _id: "s1" }));
    await updateStudio("s1", { name: "New" }, "t");
    expect(lastCall()[1].method).toBe("PATCH");

    next(jsonRes({ _id: "m1" }));
    await updateStudioMember("s1", "c1", { role: "manager" }, "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/s1/members/c1");
  });
});

describe("DELETE endpoints", () => {
  test("deleteIntakeForm", async () => {
    next(jsonRes({ ok: true }));
    await deleteIntakeForm("b1", "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/bookings/b1/intake");
    expect(init.method).toBe("DELETE");
  });

  test("removeStudioMember", async () => {
    next(jsonRes({ ok: true }));
    await removeStudioMember("s1", "c1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/studios/s1/members/c1");
    expect(lastCall()[1].method).toBe("DELETE");
  });

  test("leaveWaitlist", async () => {
    next(jsonRes({ ok: true }));
    await leaveWaitlist("w1", "t");
    expect(lastCall()[0]).toBe("http://localhost:3001/waitlist/w1");
    expect(lastCall()[1].method).toBe("DELETE");
  });
});

describe("PUT endpoints (apiRequest directly)", () => {
  test("updateVisibility", async () => {
    next(jsonRes({ ok: true, visibility: "online" }));
    await updateVisibility("online", "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/users/me/visibility");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ visibility: "online" });
  });

  test("updateMyPortfolio", async () => {
    next(jsonRes({ ok: true, portfolioImages: [] }));
    await updateMyPortfolio(["u1"], [{ url: "u1", idea: "x" }], "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/users/me/portfolio");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ urls: ["u1"], meta: [{ url: "u1", idea: "x" }] });
  });

  test("updateArtistPolicy", async () => {
    next(jsonRes({ artistId: "a1" }));
    await updateArtistPolicy("a1", { percent: 20 }, true, "t");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/artist-policy/a1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ deposit: { percent: 20 }, bookingEnabled: true });
  });
});

describe("useApi hook", () => {
  const useAuthMock = useAuth as unknown as jest.Mock;

  test("exposes API_URL and sends Authorization when signed in", async () => {
    useAuthMock.mockReturnValue({
      isSignedIn: true,
      getToken: jest.fn(async () => "hook-token"),
    });
    const { result } = renderHook(() => useApi());
    expect(result.current.API_URL).toBe("http://localhost:3001");

    next(jsonRes({ ok: true }));
    await result.current.request("/me");
    const [url, init] = lastCall();
    expect(url).toBe("http://localhost:3001/me");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer hook-token");
  });

  test("omits Authorization when signed out", async () => {
    const getToken = jest.fn(async () => "should-not-be-used");
    useAuthMock.mockReturnValue({ isSignedIn: false, getToken });
    const { result } = renderHook(() => useApi());

    next(jsonRes({ ok: true }));
    await result.current.request("/public");
    const [, init] = lastCall();
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe("formatPlatformFee", () => {
  test("formats base + pct + cap", () => {
    const out = formatPlatformFee({ baseCents: 300, pct: 0.05, capCents: 5000 });
    expect(out).toEqual({
      base: "$3",
      pct: "5%",
      cap: "$50",
      short: "$3 + 5%",
      full: "$3 + 5%, max $50",
    });
  });

  test("omits base when baseCents is 0 and renders fractional pct", () => {
    const out = formatPlatformFee({ baseCents: 0, pct: 0.025, capCents: 1000 });
    expect(out.short).toBe("2.5%");
    expect(out.full).toBe("2.5%, max $10");
  });

  test("handles null/undefined input", () => {
    const out = formatPlatformFee(null);
    expect(out.short).toBe("0%");
    expect(out.full).toBe("0%, max $0");
  });
});
