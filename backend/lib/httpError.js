// Safely return an error to the client. Intentional client errors (4xx, thrown
// with err.status) and Stripe errors (customer-safe, e.g. "Your card was
// declined") keep their message. Anything else — unexpected 500s from the DB or
// libraries — has its message hidden so internals never leak to clients.
export function sendError(res, err, fallback = "Internal error") {
  const status =
    err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;
  const isStripeError = typeof err?.type === "string" && err.type.startsWith("Stripe");
  const showMessage = (status >= 400 && status < 500) || isStripeError;
  const body = { error: showMessage ? err?.message || fallback : fallback };
  if (err?.publicMessage) body.message = err.publicMessage;
  return res.status(status).json(body);
}
