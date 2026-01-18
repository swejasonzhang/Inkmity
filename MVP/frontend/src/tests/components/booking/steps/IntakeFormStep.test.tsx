import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: IntakeFormStep } = await import("@/components/booking/steps/IntakeFormStep");

describe("IntakeFormStep", () => {
  const defaultProps = {
    artistId: "artist-123",
    appointmentType: "tattoo_session" as const,
    value: null,
    onChange: jest.fn<(form: any) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render intake form", () => {
    render(<IntakeFormStep {...defaultProps} />);
    expect(screen.getByText(/Intake & Consent Form/i)).toBeInTheDocument();
  });

  test("should render health information section", () => {
    render(<IntakeFormStep {...defaultProps} />);
    const healthSections = screen.getAllByText(/Health Information/i);
    expect(healthSections.length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Allergies/i)).toBeInTheDocument();
  });

  test("should render consent switches", () => {
    render(<IntakeFormStep {...defaultProps} />);
    expect(screen.getByLabelText(/I verify that I am 18 years/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/I have disclosed all relevant health/i)).toBeInTheDocument();
  });

  test("should call onChange when form fields are updated", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<IntakeFormStep {...defaultProps} onChange={onChange} />);

    const allergiesInput = screen.getByLabelText(/Allergies/i);
    await user.type(allergiesInput, "Peanuts");

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  test("should show tattoo details section for tattoo sessions", () => {
    render(<IntakeFormStep {...defaultProps} appointmentType="tattoo_session" />);
    expect(screen.getByText(/Tattoo Details/i)).toBeInTheDocument();
  });

  test("should not show tattoo details section for consultations", () => {
    render(<IntakeFormStep {...defaultProps} appointmentType="consultation" />);
    expect(screen.queryByText(/Tattoo Details/i)).not.toBeInTheDocument();
  });
});
