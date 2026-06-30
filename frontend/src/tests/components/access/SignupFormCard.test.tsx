import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useClerk: () => ({ signUp: jest.fn() }),
  useUser: () => ({ user: null, isSignedIn: false, isLoaded: true }),
  useAuth: () => ({ isSignedIn: false, isLoaded: true }),
}));

jest.unstable_mockModule("@/components/access/ProgressDots", () => ({ default: () => <div>ProgressDots</div> }));
jest.unstable_mockModule("@/components/access/SharedAccountStep", () => ({ default: () => <div>SharedAccountStep</div> }));
jest.unstable_mockModule("@/components/access/ClientDetailsStep", () => ({ default: () => <div>ClientDetailsStep</div> }));
jest.unstable_mockModule("@/components/access/ArtistDetailsStep", () => ({ default: () => <div>ArtistDetailsStep</div> }));
jest.unstable_mockModule("@/components/access/ReviewStep", () => ({ default: () => <div>ReviewStep</div> }));
jest.unstable_mockModule("@/components/access/OtpStep", () => ({ default: () => <div>OtpStep</div> }));
jest.unstable_mockModule("@/components/upload/SignupUpload", () => ({ default: () => <div>SignupUpload</div> }));
jest.unstable_mockModule("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
jest.unstable_mockModule("framer-motion", () => ({
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: SignupFormCard } = await import("@/components/access/SignupFormCard");

const makeProps = (over: any = {}): any => ({
  showInfo: false,
  role: "client",
  setRole: jest.fn(),
  step: 0,
  setStep: jest.fn(),
  slides: [{ key: "role", valid: true }],
  shared: { username: "", email: "", password: "" },
  client: { budgetMin: "", budgetMax: "", location: "", placement: "", size: "" },
  artist: { location: "", years: "", baseRate: "", portfolio: "", styles: [] },
  onSharedChange: jest.fn(),
  onClientChange: jest.fn(),
  onArtistChange: jest.fn(),
  awaitingCode: false,
  code: "",
  setCode: jest.fn(),
  loading: false,
  isLoaded: true,
  onNext: jest.fn(),
  onBack: jest.fn(),
  onStartVerification: jest.fn(),
  onVerify: jest.fn(),
  clientRefs: [],
  setClientRefs: jest.fn(),
  artistPortfolioImgs: [],
  setArtistPortfolioImgs: jest.fn(),
  onCancelVerification: jest.fn(),
  bio: "",
  onBioChange: jest.fn(),
  ...over,
});

describe("SignupFormCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("a signing-up visitor sees the account step with progress, not the success screen", () => {
    render(<SignupFormCard {...makeProps()} />);
    expect(screen.getByText("SharedAccountStep")).toBeInTheDocument();
    expect(screen.getByText("ProgressDots")).toBeInTheDocument();
    expect(screen.queryByText("Signup Successful!")).not.toBeInTheDocument();
  });

  test("shows the success confirmation once signup completes", () => {
    render(<SignupFormCard {...makeProps({ success: true })} />);
    expect(screen.getByText("Signup Successful!")).toBeInTheDocument();
    expect(screen.getByText(/Redirecting to Dashboard/i)).toBeInTheDocument();
    // the signup form steps are no longer shown
    expect(screen.queryByText("SharedAccountStep")).not.toBeInTheDocument();
  });

  test("uses a custom success heading and subtitle when provided", () => {
    render(
      <SignupFormCard {...makeProps({ success: true, successHeading: "You're in!", successSubtitle: "Setting things up" })} />
    );
    expect(screen.getByText("You're in!")).toBeInTheDocument();
    expect(screen.getByText(/Setting things up/i)).toBeInTheDocument();
  });
});
