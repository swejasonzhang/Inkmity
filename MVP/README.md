# Inkmity - Tattoo Artist Appointment Platform

Inkmity is a comprehensive platform connecting tattoo artists with clients, streamlining the appointment booking process with integrated payment processing and real-time communication.

## 🌟 Features

### For Clients
- **Smart Artist Discovery** - Browse and filter tattoo artists by style, location, and reviews, with higher-tier artists surfaced first
- **Real-Time Availability** - View live availability calendars and book appointments instantly
- **On-Platform Payments** - Pay a deposit up front (card saved on file); the balance is charged automatically only once both parties confirm the work is complete
- **Sketch Approval** - Review the artist's sketch and approve it or request changes before the session
- **Appointment Waitlist** - Join an artist's waitlist when they're full; higher reward tiers are notified first when a slot opens
- **Rewards & Credits** - Lower platform fees as you climb tiers, plus platform-funded loyalty, birthday, and consultation credits applied at checkout
- **Consent & Waivers** - Sign the liability/consent waiver in-app before a tattoo session
- **Appointment Management** - Track upcoming appointments, reschedule, or cancel with ease
- **Review System** - Rate and review artists to help others find the perfect match
- **Messaging** - Real-time chat with artists before and during the booking process

### For Artists
- **Professional Profile** - Showcase portfolio, services, pricing, and availability
- **Tiers & Visibility** - Earn a verified badge and boosted search ranking as your completed bookings and rating grow
- **Direct Payouts** - Stripe Connect onboarding; earnings are transferred to your account, with tier-based payout speed (standard → 2-day → instant)
- **Studios** - Join a studio (or run one); studio bookings automatically split each payout between artist and studio by commission
- **Insights** - Lifetime paid-out earnings, completion/no-show rates, rating, and tier at a glance
- **Sketch Sharing** - Share sketches tied to a booking and get explicit client approval
- **Appointment Management** - Accept, reschedule, or decline appointments with automatic notifications
- **Custom Deposit Policies** - Configure deposits; bookings gate on a signed artist agreement and completed payout setup
- **Flexible Scheduling** - Set custom availability with buffer times and blackout dates

### For Studios
- **Studio Accounts** - Dedicated studio signup/role; manage the studio profile and members
- **Commission Splits** - Per-artist or default commission; each booking's payout splits automatically between studio and artist
- **Studio Payouts** - Studio's own Stripe Connect account receives its commission directly
- **Verification** - Studios are verified before going live; bookings for studio artists require a verified, payout-ready studio
- **Chargeback Protection** - Disputes claw funds back from the artist/studio transfers rather than the platform

### Platform Features
- **Merchant of Record** - Platform-as-merchant via Stripe Connect (separate charges + transfers); split payouts, completion-gated balance capture, and chargeback clawback
- **Signed Documents** - Versioned, hashed e-signature records (platform terms, client waiver, artist & studio agreements) with timestamp/IP/user-agent audit trail
- **Real-Time Updates** - Live notifications and status updates via WebSocket
- **Mobile Responsive** - Fully responsive design that works on all devices
- **Email Notifications** - Automated confirmation and reminder emails
- **Secure Authentication** - Clerk-powered authentication with role-based access (client / artist / studio)
- **File Upload** - Cloudinary integration for portfolio images and references
- **Review & Rating System** - Verified reviews to build trust and reputation

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Framer Motion** - Smooth animations and transitions
- **React Router** - Client-side routing
- **Clerk** - Authentication and user management
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Stripe** - Payment processing
- **Nodemailer** - Email notifications
- **Socket.io** - Real-time communication
- **JWT** - Token-based authentication
- **Cloudinary** - Image hosting and optimization

### DevOps & Quality
- **Jest** - Unit and integration testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Docker** - Containerization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or yarn
- Stripe account
- Clerk account
- Cloudinary account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/inkmity.git
   cd inkmity
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend && npm install

   # Frontend dependencies
   cd ../frontend && npm install
   ```

3. **Environment Setup**

   Create `.env` files in both backend and frontend directories:

   **Backend (.env)**
   ```env
   NODE_ENV=development
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:3001

   # Database
   MONGODB_URI=mongodb://localhost:27017/inkmity

   # Authentication
   CLERK_SECRET_KEY=your_clerk_secret_key
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

   # Payments
   STRIPE_SECRET_KEY=your_stripe_secret_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@inkmity.com

   # File Upload
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Platform economics (optional — defaults shown)
   PLATFORM_FEE_PCT=0.10
   PLATFORM_FEE_MIN_CENTS=500
   STUDIO_DEFAULT_COMMISSION_PCT=0.30
   BIRTHDAY_CREDIT_CENTS=1500
   # Comma-separated Clerk IDs allowed to verify studios / grant credits
   ADMIN_CLERK_IDS=
   ```

   **Frontend (.env)**
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   VITE_API_URL=http://localhost:3001
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if using local installation)
   mongod

   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:6
   ```

5. **Start the Application**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api

## 📡 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user profile

### User Management
- `GET /users` - List users (paginated)
- `GET /users/:id` - Get user by ID
- `PUT /users/profile` - Update user profile
- `POST /users/avatar` - Upload user avatar

### Artist Management
- `GET /users/artists` - List all artists
- `GET /users/artists/:id` - Get artist details
- `PUT /users/artists/availability` - Update artist availability
- `GET /users/artists/:id/portfolio` - Get artist portfolio

### Booking System
- `POST /bookings/consultation` - Create consultation booking
- `POST /bookings/session` - Create tattoo session booking
- `GET /bookings` - List user bookings
- `GET /bookings/:id` - Get booking details
- `PUT /bookings/:id/reschedule` - Reschedule booking
- `POST /bookings/:id/cancel` - Cancel booking
- `POST /bookings/:id/accept` - Accept booking (artists)
- `POST /bookings/:id/deny` - Deny booking (artists)

### Payment Processing
- `POST /billing/deposit/intent` - Create deposit payment intent (saves card for the balance)
- `POST /billing/final-payment/intent` - Create final payment intent
- `POST /billing/webhook` - Stripe webhook (payment_intent.succeeded/failed, checkout.session.completed, account.updated, charge.dispute.created)
- `GET /billing/transactions` - Get payment history
- `PATCH /bookings/:id/final-price` - Artist sets the final price before completion
- `POST /bookings/:id/verify` - Dual client/artist completion verification (triggers balance capture + split payout)

### Payouts (Stripe Connect)
- `POST /connect/account-link` - Start/continue artist payout onboarding (gated on signed artist agreement)
- `GET /connect/status` - Connect account status

### Studios
- `POST /studios` - Create a studio · `GET /studios/mine` - My studios
- `POST /studios/:id/invite` - Invite an artist · `PATCH /studios/:id/members/:artistClerkId` - Set member commission
- `POST /studios/memberships/:id/respond` - Artist accepts/declines an invite
- `POST /studios/:id/connect/account-link` - Studio payout onboarding (gated on signed studio agreement)
- `PATCH /studios/:id/verification` - Admin verifies a studio

### Documents (e-signatures)
- `GET /documents/:docType` - Fetch current document/version
- `GET /documents/:docType/status` - Whether the user has signed it
- `POST /documents/:docType/sign` - Record a signature (hash + timestamp/IP/UA)

### Rewards & Credits
- `GET /rewards/me` - Tier + fee summary · `GET /rewards/credits` - Available credit balance
- `POST /rewards/credits/grant` - Admin grants a credit
- `GET /dashboard/artist-analytics` - Artist insights (earnings, completion rate, rating, tier)

### Waitlist
- `POST /waitlist` - Join · `GET /waitlist/mine` - My entries · `GET /waitlist/artist` - Artist's waitlist (tier-ordered) · `DELETE /waitlist/:id` - Leave

### Sketches
- `POST /sketches` - Artist shares a sketch · `GET /sketches?bookingId=` - List · `POST /sketches/:id/respond` - Client approves/requests changes

### Messaging
- `GET /messages/conversations` - Get user conversations
- `POST /messages/send` - Send message
- `GET /messages/:conversationId` - Get conversation messages

### File Upload
- `POST /images/upload` - Upload image
- `DELETE /images/:id` - Delete image

## 🏗 Architecture

### Backend Architecture
```
backend/
├── config/           # Configuration management
├── controllers/      # Request handlers
├── middleware/       # Express middleware
├── models/          # MongoDB schemas
├── routes/          # API route definitions
├── services/        # Business logic services
├── utils/           # Utility functions
└── __tests__/       # Test suites
```

### Frontend Architecture
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility libraries
│   ├── styles/        # Component-specific styles
│   └── utils/         # Helper functions
├── public/            # Static assets
└── __tests__/        # Component tests
```

### Database Schema
- **Users** - Client and artist profiles
- **Bookings** - Appointment records with status tracking
- **Billing** - Payment records and Stripe integration
- **Messages** - Real-time messaging between users
- **Reviews** - Client reviews and ratings
- **Images** - Portfolio and reference images
- **Availability** - Artist scheduling data

## 🔒 Security Features

- **Input Validation** - Comprehensive Zod schema validation
- **XSS Protection** - Input sanitization and CSP headers
- **Rate Limiting** - API rate limiting to prevent abuse
- **Authentication** - JWT tokens with role-based access
- **Payment Security** - PCI-compliant Stripe integration
- **File Upload Security** - Type validation and size limits
- **SQL Injection Prevention** - Parameterized queries

## 📱 Responsive Design

The application uses a fluid design system with:
- **Rem-based scaling** - Consistent sizing across devices
- **Flexible layouts** - Flexbox and CSS Grid for adaptability
- **Mobile-first approach** - Progressive enhancement for larger screens
- **Touch-friendly interactions** - Optimized for mobile devices

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests only
cd backend && npm test

# Run frontend tests only
cd frontend && npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 🚀 Deployment

### Environment Variables for Production
Ensure all production environment variables are set:
- Database connection strings
- Stripe live keys
- Email service credentials
- Cloudinary production config
- Proper CORS origins

### Build Commands
```bash
# Build frontend
cd frontend && npm run build

# Build backend (if needed)
cd backend && npm run build
```

### Docker Deployment
```bash
# Build Docker image
docker build -t inkmity .

# Run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@inkmity.com or join our Discord community.

## 🙏 Acknowledgments

- Tattoo artists and clients for their feedback
- Open source community for the amazing tools and libraries
- Design inspiration from modern SaaS platforms

---

**Made with ❤️ for the tattoo community**