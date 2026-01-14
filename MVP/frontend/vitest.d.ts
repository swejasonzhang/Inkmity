import "@testing-library/jest-dom";
import type { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

declare global {
  const vi: typeof import("vitest").vi;
  const describe: typeof describe;
  const it: typeof it;
  const expect: typeof expect;
  const beforeEach: typeof beforeEach;
  const afterEach: typeof afterEach;
  const beforeAll: typeof beforeAll;
  const afterAll: typeof afterAll;
}