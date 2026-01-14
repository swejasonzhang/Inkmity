import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const mockSignUp = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useClerk: () => ({
    signUp: mockSignUp,
  }),
  useUser: () => ({
    user: null,
    isSignedIn: false,
    isLoaded: true,
  }),
  useAuth: () => ({
    isSignedIn: false,
    isLoaded: true,
  }),
}));

jest.unstable_mockModule("@/components/access/ProgressDots", () => ({
  default: () => <div>ProgressDots</div>,
}));

jest.unstable_mockModule("@/components/access/SharedAccountStep", () => ({
  default: () => <div>SharedAccountStep</div>,
}));

jest.unstable_mockModule("@/components/access/ClientDetailsStep", () => ({
  default: () => <div>ClientDetailsStep</div>,
}));

jest.unstable_mockModule("@/components/access/ArtistDetailsStep", () => ({
  default: () => <div>ArtistDetailsStep</div>,
}));

jest.unstable_mockModule("@/components/access/ReviewStep", () => ({
  default: () => <div>ReviewStep</div>,
}));

jest.unstable_mockModule("@/components/access/OtpStep", () => ({
  default: () => <div>OtpStep</div>,
}));

jest.unstable_mockModule("@/components/upload/SignupUpload", () => ({
  default: () => <div>SignupUpload</div>,
}));

jest.unstable_mockModule("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.unstable_mockModule("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: SignupFormCard } = await import("@/components/access/SignupFormCard");

describe("SignupFormCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render signup form", () => {
    const { container } = render(
      <SignupFormCard
        showInfo={false}
        role="client"
        setRole={jest.fn()}
        step={0}
        setStep={jest.fn()}
        slides={[{ key: "step1", valid: true }]}
        shared={{ username: "", email: "", password: "" }}
        client={{ budgetMin: "", budgetMax: "", location: "", placement: "", size: "" }}
        artist={{ location: "", years: "", baseRate: "", portfolio: "", styles: [] }}
        onSharedChange={jest.fn()}
        onClientChange={jest.fn()}
        onArtistChange={jest.fn()}
        awaitingCode={false}
        code=""
        setCode={jest.fn()}
        loading={false}
        isLoaded={true}
        onNext={jest.fn()}
        onBack={jest.fn()}
        onStartVerification={jest.fn()}
        onVerify={jest.fn()}
        clientRefs={[]}
        setClientRefs={jest.fn()}
        artistPortfolioImgs={[]}
        setArtistPortfolioImgs={jest.fn()}
        onCancelVerification={jest.fn()}
        bio=""
        onBioChange={jest.fn()}
        confirmPassword=""
        setConfirmPassword={jest.fn()}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
