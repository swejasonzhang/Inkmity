import { ReactElement } from "react";
import {
  render as rtlRender,
  RenderOptions,
  screen,
  waitFor,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

const MockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockClerkProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </MockClerkProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => rtlRender(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render, screen, waitFor };
