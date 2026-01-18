import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

beforeEach(() => {
  Object.defineProperty(globalThis, "import", {
    value: {
      meta: {
        env: {
          DEV: true,
          MODE: "test",
          PROD: false,
        },
      },
    },
    writable: true,
    configurable: true,
  });
});

const { default: ErrorBoundary } = await import("@/components/ErrorBoundary");

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should render children when no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  test("should render error message when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });
});
