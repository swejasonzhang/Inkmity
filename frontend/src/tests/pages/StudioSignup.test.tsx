import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const navigate = jest.fn();
const signUpCreate = jest.fn<() => Promise<any>>();
const prepareVerification = jest.fn<() => Promise<any>>();
const attemptVerification = jest.fn<() => Promise<any>>();
const setActive = jest.fn<() => Promise<any>>();
const signOut = jest.fn<() => Promise<any>>().mockResolvedValue(undefined);
const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const apiPost = jest.fn<() => Promise<any>>().mockResolvedValue({});
const setCachedRole = jest.fn();
const toastError = jest.fn();
const toastSuccess = jest.fn();

let signUpResource: any;

jest.unstable_mockModule("react-router-dom", () => ({
  useNavigate: () => navigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useSignUp: () => ({ isLoaded: true, signUp: signUpResource, setActive }),
  useClerk: () => ({ signOut }),
  useAuth: () => ({ getToken, userId: null }),
}));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { error: toastError, success: toastSuccess },
  ToastContainer: () => <div data-testid="toast" />,
}));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));
jest.unstable_mockModule("@/components/legal/LegalModal", () => ({
  default: ({ children }: any) => <span>{children}</span>,
}));
jest.unstable_mockModule("@/components/studio/StudioLocationPicker", () => ({
  default: ({ onChange }: any) => (
    <button
      type="button"
      data-testid="pick-location"
      onClick={() => onChange({ address: "1 Main St", city: "NYC", name: "Inkwell" })}
    >
      pick
    </button>
  ),
}));
jest.unstable_mockModule("@/api", () => ({ apiPost }));
jest.unstable_mockModule("@/lib/roleCache", () => ({ setCachedRole }));
jest.unstable_mockModule("@/hooks/useInactivityLogout", () => ({
  resetActivityTimer: jest.fn(),
}));

const { default: StudioSignup } = await import("@/pages/StudioSignup");

const fillBaseForm = () => {
  fireEvent.change(screen.getByPlaceholderText("Inkwell Tattoo Co."), {
    target: { value: "Inkwell" },
  });
  fireEvent.change(screen.getByPlaceholderText("studio@example.com"), {
    target: { value: "s@s.com" },
  });
  fireEvent.click(screen.getByTestId("pick-location"));
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "Password1" },
  });
  fireEvent.click(document.getElementById("studio-agree-terms")!);
};

describe("StudioSignup page", () => {
  beforeEach(() => {
    navigate.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    apiPost.mockClear();
    setCachedRole.mockReset();
    signUpResource = {
      create: signUpCreate.mockResolvedValue({
        prepareEmailAddressVerification: prepareVerification.mockResolvedValue({}),
        attemptEmailAddressVerification: attemptVerification,
      }),
    };
    signUpCreate.mockClear();
    attemptVerification.mockReset();
  });

  test("renders the studio signup form", async () => {
    await act(async () => {
      render(<StudioSignup />);
    });
    expect(screen.getByText("Create a studio account")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  test("Continue stays disabled until the form is valid", async () => {
    await act(async () => {
      render(<StudioSignup />);
    });
    const btn = screen.getByText("Continue").closest("button")!;
    expect(btn).toBeDisabled();
  });

  test("submitting the form starts Clerk signup and shows the code step", async () => {
    await act(async () => {
      render(<StudioSignup />);
    });
    await act(async () => {
      fillBaseForm();
    });
    const btn = screen.getByText("Continue").closest("button")!;
    expect(btn).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => expect(signUpCreate).toHaveBeenCalled());
    expect(prepareVerification).toHaveBeenCalledWith({ strategy: "email_code" });
    await waitFor(() =>
      expect(screen.getByText(/Verify & create studio/i)).toBeInTheDocument()
    );
  });

  test("verifying the code syncs the studio and navigates", async () => {
    attemptVerification.mockResolvedValue({
      status: "complete",
      createdSessionId: "sess1",
    });
    setActive.mockResolvedValue(undefined);
    await act(async () => {
      render(<StudioSignup />);
    });
    await act(async () => {
      fillBaseForm();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Continue").closest("button")!);
    });
    await waitFor(() =>
      expect(screen.getByPlaceholderText("123456")).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("123456"), {
        target: { value: "123456" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Verify & create studio/i).closest("button")!);
    });
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        "/users/sync",
        expect.objectContaining({ role: "studio", username: "Inkwell" }),
        "tok"
      )
    );
    expect(setCachedRole).toHaveBeenCalledWith("studio");
    expect(navigate).toHaveBeenCalledWith("/studios", { replace: true });
  });

  test("shows a toast when the email is already registered", async () => {
    signUpCreate.mockRejectedValue({
      errors: [{ code: "form_identifier_exists" }],
    });
    await act(async () => {
      render(<StudioSignup />);
    });
    await act(async () => {
      fillBaseForm();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Continue").closest("button")!);
    });
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/already registered/i)
      )
    );
  });
});
