import { ReactElement } from "react";
import {
  render as rtlRender,
  RenderOptions,
  screen,
  waitFor,
} from "@testing-library/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider publishableKey="pk_test_mock">
      <BrowserRouter>{children}</BrowserRouter>
    </ClerkProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => rtlRender(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render, screen, waitFor };
