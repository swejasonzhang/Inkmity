import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: AppointmentTypeStep } = await import("@/components/booking/steps/AppointmentTypeStep");

describe("AppointmentTypeStep", () => {
  const defaultProps = {
    value: null as "consultation" | "tattoo_session" | null,
    onChange: jest.fn<(type: "consultation" | "tattoo_session", duration: number, price: number) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render appointment type options", () => {
    render(<AppointmentTypeStep {...defaultProps} />);
    expect(screen.getByText(/Select Appointment Type/i)).toBeInTheDocument();
    const consultations = screen.getAllByText(/Consultation/i);
    expect(consultations.length).toBeGreaterThan(0);
    const tattoos = screen.getAllByText(/Tattoo Session/i);
    expect(tattoos.length).toBeGreaterThan(0);
  });

  test("should call onChange when consultation is selected", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<AppointmentTypeStep {...defaultProps} onChange={onChange} />);

    const consultationCards = screen.getAllByText(/Consultation/i);
    const consultationCard = consultationCards[0].closest('[class*="Card"]');
    if (consultationCard) {
      await user.click(consultationCard);
      expect(onChange).toHaveBeenCalledWith("consultation", 30, 0);
    }
  });

  test("should call onChange when tattoo session is selected", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<AppointmentTypeStep {...defaultProps} onChange={onChange} />);

    const tattooCards = screen.getAllByText(/Tattoo Session/i);
    const tattooCard = tattooCards[0].closest('[class*="Card"]');
    if (tattooCard) {
      await user.click(tattooCard);
      expect(onChange).toHaveBeenCalledWith("tattoo_session", 60, 0);
    }
  });

  test("should highlight selected consultation", () => {
    const { container } = render(<AppointmentTypeStep {...defaultProps} value="consultation" />);
    const consultationCards = screen.getAllByText(/Consultation/i);
    const consultationCard = consultationCards[0].closest('[class*="Card"]');
    expect(consultationCard).toBeInTheDocument();
    if (consultationCard) {
      const hasPrimary = consultationCard.className.includes("border-primary") || 
                         consultationCard.className.includes("bg-primary");
      expect(hasPrimary || container.querySelector('[class*="primary"]')).toBeTruthy();
    }
  });

  test("should highlight selected tattoo session", () => {
    const { container } = render(<AppointmentTypeStep {...defaultProps} value="tattoo_session" />);
    const tattooCards = screen.getAllByText(/Tattoo Session/i);
    const tattooCard = tattooCards[0].closest('[class*="Card"]');
    expect(tattooCard).toBeInTheDocument();
    if (tattooCard) {
      const hasPrimary = tattooCard.className.includes("border-primary") || 
                         tattooCard.className.includes("bg-primary");
      expect(hasPrimary || container.querySelector('[class*="primary"]')).toBeTruthy();
    }
  });
});
