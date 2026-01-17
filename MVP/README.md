# Inkmity - Tattoo Artist Appointment Platform

Inkmity is a comprehensive platform connecting tattoo artists with clients, streamlining the appointment booking process with integrated payment processing and real-time communication.

## 🌟 Features

### For Clients
- **Smart Artist Discovery** - Browse and filter tattoo artists by style, location, and reviews
- **Real-Time Availability** - View live availability calendars and book appointments instantly
- **Secure Payments** - Integrated Stripe payment processing with deposit and final payment options
- **Appointment Management** - Track upcoming appointments, reschedule, or cancel with ease
- **Review System** - Rate and review artists to help others find the perfect match
- **Messaging** - Real-time chat with artists before and during the booking process

### For Artists
- **Professional Profile** - Showcase portfolio, services, pricing, and availability
- **Appointment Management** - Accept, reschedule, or decline appointments with automatic notifications
- **Payment Processing** - Secure Stripe integration with customizable deposit policies
- **Client Communication** - Built-in messaging system for consultation and coordination
- **Analytics Dashboard** - Track earnings, appointments, and client satisfaction
- **Flexible Scheduling** - Set custom availability with buffer times and blackout dates

### Platform Features
- **Real-Time Updates** - Live notifications and status updates via WebSocket
- **Mobile Responsive** - Fully responsive design that works on all devices
- **Email Notifications** - Automated confirmation and reminder emails
- **Secure Authentication** - Clerk-powered authentication with role-based access
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
- `POST /billing/deposit/intent` - Create deposit payment intent
- `POST /billing/final-payment/intent` - Create final payment intent
- `POST /billing/webhook` - Stripe webhook handler
- `GET /billing/transactions` - Get payment history

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