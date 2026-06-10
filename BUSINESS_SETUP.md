# Inkmity — Business Setup Checklist

> **Not legal or tax advice.** Inkmity is a payments **marketplace** (platform as
> merchant of record via Stripe Connect), so the order of these steps matters —
> Stripe and your bank will ask for the LLC + EIN before you can take real money.
> Confirm specifics with a lawyer and a CPA, especially sales tax and 1099s.

Work top to bottom — each step unblocks the next.

## 1. Form the LLC
- [ ] Pick the state. Default to **your home state** (where you operate). Delaware/
      Wyoming add cost + a foreign-registration in your home state and rarely help a
      solo, early-stage marketplace.
- [ ] Choose a **registered agent** (yourself, or a service ~$100–125/yr).
- [ ] File **Articles of Organization** with the Secretary of State (~$50–500
      depending on state). Name: confirm "Inkmity LLC" (or similar) is available.
- [ ] Note ongoing duties: annual/biennial report + any state franchise tax.

## 2. Get an EIN (free, do right after the LLC is approved)
- [ ] Apply at irs.gov → "Apply for an EIN" (free, instant online; ignore paid
      third-party sites). Single-member LLC is fine.
- [ ] Save the EIN confirmation letter (CP 575) — the bank and Stripe will want it.

## 3. Operating Agreement
- [ ] Draft one even as a single member — banks/Stripe/investors may request it,
      and it reinforces liability separation. A reputable template is acceptable to
      start; have a lawyer review before raising money or adding partners.

## 4. Business bank account
- [ ] Open a **business checking** account (needs: formation docs + EIN + ID).
- [ ] Keep business and personal money fully separate (protects the LLC's
      liability shield). Get a business debit/credit card.
- [ ] This account is where Stripe deposits your **platform fees / payouts**.

## 5. Stripe (this is where the code connects)
The platform (the LLC) is the **merchant of record**; artists/studios are
**Connect Express** accounts that receive split transfers. See `DEPLOYMENT.md` §1.
- [ ] Set the Stripe account's **legal entity = the LLC** (business name, EIN,
      address) and complete the business/branding profile Stripe requires.
- [ ] Connect the **business bank account** (step 4) as the platform payout account.
- [ ] **Enable Connect** → use **Express** accounts; fill in platform branding.
- [ ] Switch to **live mode**, grab `sk_live_…` / `pk_live_…`, and add the
      `/billing/webhook` endpoint (events listed in `DEPLOYMENT.md`).
- [ ] Confirm connected accounts need `transfers` + `card_payments` capabilities.

## 6. Taxes (talk to a CPA)
- [ ] **Income tax**: single-member LLC is pass-through by default (Schedule C);
      ask whether an **S-corp election** saves on self-employment tax once profitable.
- [ ] **Sales tax / marketplace facilitator**: tattoo *services* are often exempt,
      but rules vary by state and you may have facilitator obligations. Confirm
      nexus + whether you must collect/remit anything.
- [ ] **1099-K / 1099 to artists**: Stripe Connect (Express) handles most payee tax
      forms — confirm Stripe is set to file for your connected accounts.
- [ ] Set aside a % of revenue for taxes from day one.

## 7. Insurance
- [ ] **General liability** (baseline).
- [ ] Consider **E&O / tech / cyber** — you store user data and handle payments.
- [ ] You are a marketplace, **not** the tattooer; the in-app client waiver +
      artist/studio agreements (already in the product) push that liability to the
      parties. Have a lawyer confirm they're sufficient for your state.

## 8. Legal docs (you already have signed-document infrastructure)
- [ ] Have a lawyer review your **Terms of Service**, **Privacy Policy**, **client
      waiver**, and **artist/studio agreements** (the app records versioned, hashed
      e-signatures with an audit trail — see the documents feature).
- [ ] Make sure Privacy Policy covers Clerk, Stripe, Cloudinary, and email
      processors; add a cookie/consent notice (the app has `CookieConsent`).

## 9. Brand / domain (optional but cheap insurance)
- [ ] You own `inkmity.com`. Consider a **USPTO trademark** for the name/logo.

## 10. Bookkeeping
- [ ] Set up accounting (e.g. QuickBooks/Wave) from the first transaction; connect
      the business bank + Stripe so payouts, fees, and refunds reconcile cleanly.

---

### Fast critical path to taking real money
**LLC → EIN → business bank → Stripe live (entity + bank + Connect) → lawyer-
reviewed ToS/Privacy → go live.** Insurance and the S-corp question can follow
shortly after, but don't take live payments without 1–5 done.
