import { describe, test, expect, afterEach, jest } from "@jest/globals";
import { uploadUnsigned, getSignedUpload, uploadToCloudinary } from "@/lib/cloudinary";

function mockFetch(impl: (url: string, init?: any) => Partial<Response>) {
  (global.fetch as unknown as jest.Mock).mockImplementation((url: any, init: any) =>
    Promise.resolve(impl(String(url), init) as Response)
  );
}

const file = new File(["data"], "ref.png", { type: "image/png" });

afterEach(() => {
  jest.clearAllMocks();
});

describe("uploadUnsigned", () => {
  test("throws when cloudinary is not configured in the test env", async () => {
    await expect(uploadUnsigned(file)).rejects.toThrow("Image uploads are not configured");
  });
});

describe("getSignedUpload", () => {
  test("returns the signature payload and forwards the auth token", async () => {
    const payload = {
      timestamp: 1,
      signature: "sig",
      apiKey: "key",
      cloudName: "cloud",
      folder: "f",
    };
    let seenUrl = "";
    let seenHeaders: any;
    mockFetch((url, init) => {
      seenUrl = url;
      seenHeaders = init?.headers;
      return { ok: true, json: async () => payload } as Partial<Response>;
    });

    const out = await getSignedUpload("client_ref", "tok");
    expect(out).toEqual(payload);
    expect(seenUrl).toContain("/images/sign?kind=client_ref");
    expect(seenHeaders).toEqual({ Authorization: "Bearer tok" });
  });

  test("omits the auth header when no token is given", async () => {
    let seenHeaders: any = "unset";
    mockFetch((_url, init) => {
      seenHeaders = init?.headers;
      return { ok: true, json: async () => ({}) } as Partial<Response>;
    });
    await getSignedUpload("artist_portfolio");
    expect(seenHeaders).toBeUndefined();
  });

  test("throws signature_failed on a non-ok response", async () => {
    mockFetch(() => ({ ok: false, json: async () => ({}) }) as Partial<Response>);
    await expect(getSignedUpload("client_ref")).rejects.toThrow("signature_failed");
  });
});

describe("uploadToCloudinary", () => {
  const sig = {
    timestamp: 123,
    signature: "sig",
    apiKey: "key",
    cloudName: "cloud",
    folder: "folder",
    tags: "a,b",
  };

  test("posts the form to the cloudinary endpoint and returns json", async () => {
    let seenUrl = "";
    let seenBody: FormData | undefined;
    mockFetch((url, init) => {
      seenUrl = url;
      seenBody = init?.body;
      return { ok: true, json: async () => ({ public_id: "p" }) } as Partial<Response>;
    });

    const out = await uploadToCloudinary(file, sig);
    expect(out).toEqual({ public_id: "p" });
    expect(seenUrl).toBe("https://api.cloudinary.com/v1_1/cloud/image/upload");
    expect(seenBody?.get("api_key")).toBe("key");
    expect(seenBody?.get("timestamp")).toBe("123");
    expect(seenBody?.get("signature")).toBe("sig");
    expect(seenBody?.get("folder")).toBe("folder");
    expect(seenBody?.get("tags")).toBe("a,b");
  });

  test("omits tags when none supplied", async () => {
    let seenBody: FormData | undefined;
    mockFetch((_url, init) => {
      seenBody = init?.body;
      return { ok: true, json: async () => ({}) } as Partial<Response>;
    });
    const { tags, ...noTags } = sig;
    void tags;
    await uploadToCloudinary(file, noTags);
    expect(seenBody?.get("tags")).toBeNull();
  });

  test("throws upload_failed on a non-ok response", async () => {
    mockFetch(() => ({ ok: false, json: async () => ({}) }) as Partial<Response>);
    await expect(uploadToCloudinary(file, sig)).rejects.toThrow("upload_failed");
  });
});
