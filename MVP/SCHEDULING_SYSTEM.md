# Scheduling and Appointment Management System

## Overview
A complete end-to-end scheduling system for the tattoo application that follows real tattoo shop operational patterns.

## Backend Implementation

### Models

#### Extended Booking Model (`backend/models/Booking.js`)
- Added `appointmentType`: "consultation" | "tattoo_session"
- Added `projectId`: Reference to multi-session projects
- Added `sessionNumber`: For tracking session order in projects
- Added `intakeFormId`: Link to intake/consent forms
- Added `referenceImageIds`: Array of reference images
- Added `rescheduleNoticeHours`: Tracks if reschedule meets notice requirements
- Added `noShowMarkedAt` and `noShowMarkedBy`: For no-show tracking

#### New Models

1. **IntakeForm** (`backend/models/IntakeForm.js`)
   - Health information (allergies, medications, conditions, blood thinners, pregnancy, surgery)
   - Tattoo details (placement, size, style, description, cover-up/touch-up flags)
   - Consent agreements (age verification, health disclosure, aftercare, policies)
   - Emergency contact information
   - Submission tracking (IP, user agent, timestamps)

2. **Project** (`backend/models/Project.js`)
   - Multi-session tattoo project management
   - Tracks estimated vs completed sessions
   - Project status (active, completed, cancelled, on_hold)
   - Pricing and deposit tracking
   - Reference images linked to project

### Controllers

#### Extended Booking Controller (`backend/controllers/bookingController.js`)

**New Functions:**
- `createConsultation()`: Creates consultation appointments (15-60 min, optional deposit)
- `createTattooSession()`: Creates tattoo session appointments with project linking
- `rescheduleAppointment()`: Handles rescheduling with 48-72 hour notice validation
- `markNoShow()`: Allows artists to mark no-shows (deposit forfeited)
- `submitIntakeForm()`: Handles intake form submission with validation
- `getIntakeForm()`: Retrieves intake form for authorized users
- `getAppointmentDetails()`: Comprehensive appointment details with populated relations

**Key Features:**
- Double-booking prevention
- Timezone-safe booking logic using Luxon
- Deposit calculation based on artist policy
- Automatic project status updates for multi-session tattoos

### Routes

#### Extended Booking Routes (`backend/routes/bookings.js`)
- `POST /bookings/consultation` - Create consultation
- `POST /bookings/session` - Create tattoo session
- `POST /bookings/:id/reschedule` - Reschedule appointment
- `POST /bookings/:id/no-show` - Mark no-show
- `POST /bookings/:bookingId/intake` - Submit intake form
- `GET /bookings/:bookingId/intake` - Get intake form
- `GET /bookings/:id/details` - Get full appointment details

### Stripe Integration

#### Enhanced Billing Controller (`backend/controllers/billingController.js`)
- `createDepositPaymentIntent()`: Creates PaymentIntents for deposits
- Enhanced `checkoutDeposit()`: Better customer management and non-refundable deposit messaging
- Enhanced webhook handler: Handles `payment_intent.succeeded` events
- Automatic booking confirmation on successful deposit payment

**Deposit Policy:**
- Deposits are non-refundable (standard industry practice)
- Deposits apply to final cost
- Required for tattoo sessions, optional for consultations
- Calculated based on artist policy (percent or flat amount)

## Frontend Implementation

### API Client Updates (`frontend/src/api/index.ts`)
- Added TypeScript types: `IntakeForm`, `Project`, extended `Booking`
- New API functions:
  - `createConsultation()`
  - `createTattooSession()`
  - `rescheduleAppointment()`
  - `markNoShow()`
  - `submitIntakeForm()`
  - `getIntakeForm()`
  - `getAppointmentDetails()`
  - `createDepositPaymentIntent()`

### Booking Flow Components

#### Main Flow (`frontend/src/components/booking/AppointmentBookingFlow.tsx`)
Multi-step booking wizard with:
1. Appointment Type Selection
2. Time Slot Selection
3. Intake Form
4. Reference Images
5. Payment/Review

#### Step Components

1. **AppointmentTypeStep** (`frontend/src/components/booking/steps/AppointmentTypeStep.tsx`)
   - Consultation vs Tattoo Session selection
   - Duration and price configuration
   - Visual card-based selection UI

2. **TimeSlotStep** (`frontend/src/components/booking/steps/TimeSlotStep.tsx`)
   - Calendar date picker integration
   - Real-time availability slot loading
   - Duration-aware slot filtering
   - Time slot selection interface

3. **IntakeFormStep** (`frontend/src/components/booking/steps/IntakeFormStep.tsx`)
   - Health information form
   - Tattoo details (for sessions)
   - Emergency contact
   - Required consent checkboxes
   - Form validation

4. **ReferenceImagesStep** (`frontend/src/components/booking/steps/ReferenceImagesStep.tsx`)
   - Drag-and-drop image upload
   - Cloudinary integration
   - Image preview and removal
   - Up to 5 reference images

5. **PaymentStep** (`frontend/src/components/booking/steps/PaymentStep.tsx`)
   - Appointment summary
   - Deposit calculation and display
   - Policy information
   - Payment confirmation

### UI Components
- Created `Textarea` component (`frontend/src/components/ui/textarea.tsx`)

## Industry Standards Implemented

### Consultation Flow
- Duration: 15-60 minutes (configurable)
- Typically no deposit required
- Used for initial design discussions

### Tattoo Session Flow
- Variable duration based on piece size
- Deposit required (non-refundable)
- Applies to final cost
- Multi-session project support

### Rescheduling
- Requires 48-72 hours notice
- Validates notice period before allowing reschedule
- Tracks reschedule history
- Sends notifications to both parties

### Cancellation & No-Shows
- No-shows forfeit deposits
- Cancellations within notice period forfeit deposits
- Artists can mark no-shows
- System tracks cancellation reasons

### Intake Forms
- Health information required before appointment
- Consent agreements required
- Emergency contact information
- Submission tracking for legal compliance

## Remaining Work

### High Priority
1. **Artist Calendar Dashboard** - Day/week views with appointment management
2. **Client Appointment Dashboard** - Upcoming and past appointments with details
3. **Rescheduling UI** - User-friendly rescheduling interface with notice validation

### Medium Priority
4. **Project Management UI** - Create and manage multi-session projects
5. **Notification System** - Email/SMS reminders (24h, 1h before appointment)
6. **Appointment Detail Pages** - Full appointment view with all details

### Low Priority
7. **Analytics Dashboard** - Appointment statistics for artists
8. **Bulk Availability Management** - Easier availability editing
9. **Waitlist System** - For fully booked artists

## Usage Examples

### Creating a Consultation
```typescript
const consultation = await createConsultation({
  artistId: "artist_123",
  startISO: "2024-01-15T10:00:00Z",
  durationMinutes: 30,
  priceCents: 0
}, token);
```

### Creating a Tattoo Session
```typescript
const session = await createTattooSession({
  artistId: "artist_123",
  startISO: "2024-01-20T14:00:00Z",
  durationMinutes: 120,
  priceCents: 50000, // $500
  projectId: "project_456", // Optional
  sessionNumber: 1,
  referenceImageIds: ["img_1", "img_2"]
}, token);
```

### Rescheduling
```typescript
const rescheduled = await rescheduleAppointment(bookingId, {
  startISO: "2024-01-25T14:00:00Z",
  endISO: "2024-01-25T16:00:00Z",
  reason: "Client requested change"
}, token);
```

## Testing Checklist

- [ ] Create consultation appointment
- [ ] Create tattoo session appointment
- [ ] Submit intake form
- [ ] Upload reference images
- [ ] Pay deposit via Stripe
- [ ] Reschedule appointment (valid notice)
- [ ] Reschedule appointment (insufficient notice - should fail)
- [ ] Mark no-show
- [ ] Cancel appointment
- [ ] View appointment details
- [ ] Multi-session project creation
- [ ] Double-booking prevention

## Notes

- All booking logic is timezone-aware using Luxon
- Double-booking is prevented at the database level
- Deposits are handled via Stripe PaymentIntents
- Intake forms are required before appointment confirmation
- Reference images are stored in Cloudinary
- All timestamps are stored in UTC

