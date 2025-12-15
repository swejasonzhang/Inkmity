export const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  billingPortal: {
    sessions: {
      create: jest.fn(),
    },
  },
};

export const resetStripeMocks = () => {
  Object.values(mockStripe.customers).forEach((fn) => {
    if (typeof fn === "function" && fn.mockReset) fn.mockReset();
  });
  Object.values(mockStripe.paymentIntents).forEach((fn) => {
    if (typeof fn === "function" && fn.mockReset) fn.mockReset();
  });
  Object.values(mockStripe.checkout.sessions).forEach((fn) => {
    if (typeof fn === "function" && fn.mockReset) fn.mockReset();
  });
  Object.values(mockStripe.webhooks).forEach((fn) => {
    if (typeof fn === "function" && fn.mockReset) fn.mockReset();
  });
  Object.values(mockStripe.refunds).forEach((fn) => {
    if (typeof fn === "function" && fn.mockReset) fn.mockReset();
  });
  Object.values(mockStripe.billingPortal.sessions).forEach((fn) => {
    if (typeof fn === "function" && fn.mockReset) fn.mockReset();
  });
};

