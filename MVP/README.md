# Inkmity MVP

A full-stack tattoo artist booking platform connecting clients with talented tattoo artists. Built with React, TypeScript, Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v20 or higher)
- **npm** (v9 or higher) or **yarn**
- **MongoDB** (local instance or MongoDB Atlas)
- **Clerk Account** (for authentication)
- **Cloudinary Account** (for image storage)
- **Stripe Account** (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MVP
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

## ⚙️ Environment Variables

> **⚠️ SECURITY WARNING**: Never commit `.env` files or hardcode API keys in your code. All sensitive keys should be stored in environment variables. The `.env` files are already in `.gitignore` for your protection.

### Backend Environment Variables

Create a `.env` or `.env.development` file in the `backend/` directory:

> **Note**: Copy `.env.example` to `.env` and fill in your actual values. The example file shows the required variables without exposing real keys.

```env
# Server Configuration
NODE_ENV=development
PORT=5005
FRONTEND_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5005

# Database
MONGO_URI=mongodb://localhost:27017/inkmity
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/inkmity

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Socket.IO (Optional)
SOCKET_PATH=/socket.io
```

### Frontend Environment Variables

Create a `.env` or `.env.development` file in the `frontend/` directory:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# API Configuration
VITE_API_URL=http://localhost:5005

# Stripe Configuration (Optional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Socket.IO Configuration (Optional)
VITE_SOCKET_URL=http://localhost:5005
VITE_SOCKET_PATH=/socket.io
```

## 🏃 Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will start on `http://localhost:5005`

2. **Start the frontend development server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will start on `http://localhost:5173`

3. **Open your browser**
   Navigate to `http://localhost:5173`

### Production Build

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend in production mode**
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

## 📁 Project Structure

```
MVP/
├── backend/                 # Node.js/Express backend
│   ├── config/             # Database and service configurations
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware (auth, rate limiting, performance, etc.)
│   ├── models/             # Mongoose schemas
│   ├── repositories/       # Data access layer (DRY pattern)
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic layer (DRY pattern)
│   ├── utils/              # Utility functions (logger, cache, query optimizer)
│   ├── __tests__/          # Test suites
│   │   ├── controllers/    # Controller tests
│   │   ├── services/       # Service tests (TDD)
│   │   ├── repositories/   # Repository tests (TDD)
│   │   ├── integration/    # Integration tests
│   │   ├── scaling/        # Load and performance tests
│   │   └── setup/          # Test setup and mocks
│   └── server.js           # Main server entry point
│
└── frontend/               # React/TypeScript frontend
    ├── src/
    │   ├── api/           # API client functions
    │   ├── components/    # React components
    │   │   ├── booking/   # Booking flow components
    │   │   ├── dashboard/ # Dashboard-specific components
    │   │   ├── ui/        # Reusable UI components (Shadcn)
    │   │   └── ...
    │   ├── hooks/         # Custom React hooks
    │   ├── lib/           # Library utilities
    │   ├── pages/         # Page components
    │   ├── utils/         # Utility functions
    │   ├── __tests__/     # Test suites
    │   │   ├── components/# Component tests
    │   │   └── setup/     # Test utilities and setup
    │   └── main.tsx       # Application entry point
    └── public/            # Static assets
```

## 🛠️ Available Scripts

### Backend Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server with nodemon (auto-reload)
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:load` - Run load/scaling tests only

### Frontend Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run build:analyze` - Build and analyze bundle size

## 🧪 Testing

### Test-Driven Development (TDD)

This project follows **Test-Driven Development** principles with comprehensive test coverage:

- **Backend Tests**: 73+ passing tests covering controllers, services, repositories, and integration flows
- **Frontend Tests**: Component tests using Jest and React Testing Library
- **Load Tests**: Performance and scalability tests for concurrent requests

### Running Tests

**Backend:**
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:load          # Load tests only
```

**Frontend:**
```bash
cd frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Test Structure

- **Unit Tests**: Individual components, services, and repositories
- **Integration Tests**: End-to-end flows (booking, payment, messaging)
- **Load Tests**: Performance testing with 100+ concurrent requests
- **Coverage Target**: >80% code coverage

## 🏗️ Architecture & Engineering Principles

### Design Patterns

#### Repository Pattern (DRY)
- **Location**: `backend/repositories/`
- Centralized data access layer
- Eliminates code duplication across controllers
- Consistent caching strategy
- Easier testing and maintenance

#### Service Layer (DRY)
- **Location**: `backend/services/`
- Business logic separation from controllers
- Reusable business operations
- Centralized validation
- Clean separation of concerns

### Performance Optimizations

#### Database Indexing
- Compound indexes on frequently queried fields
- Text search indexes for searchable content
- Optimized query patterns
- **Models**: `Booking`, `UserBase`, `Message`

#### Caching Layer
- **Location**: `backend/utils/cache.js`
- In-memory caching with TTL support
- Redis-ready architecture (easy migration)
- Cache invalidation patterns
- Performance statistics

#### Query Optimization
- **Location**: `backend/utils/queryOptimizer.js`
- Experience filter parsing
- Text search query building
- Pagination helpers
- Field selection for lean queries

### Performance Monitoring

- **Middleware**: `backend/middleware/performance.js`
- Request duration tracking
- Memory usage monitoring
- Slow request detection (>1s)
- Query performance measurement
- Response headers with metrics

### Scalability Features

- **Load Testing**: Comprehensive tests for concurrent requests
- **Database**: Optimized indexes for common queries
- **Caching**: Frequently accessed data cached
- **Connection Pooling**: Mongoose connection optimization
- **Rate Limiting**: API endpoint protection
- **Performance Monitoring**: Real-time tracking

## 🧪 Development Workflow

1. **Code Quality**
   - ESLint is configured for TypeScript/React
   - Prettier is configured for consistent formatting
   - TypeScript strict mode is enabled
   - Test-driven development (TDD)

2. **Hot Reload**
   - Backend: Nodemon watches for file changes
   - Frontend: Vite HMR (Hot Module Replacement) for instant updates

3. **Error Handling**
   - Backend: Centralized error handler with Winston logging
   - Frontend: Error Boundary component for React errors

4. **Testing Workflow**
   - Write tests first (TDD)
   - Run tests on file changes (watch mode)
   - Check coverage regularly
   - Load test before deployment

## 🔧 Key Features

- **Authentication**: Clerk-based authentication system
- **Real-time Messaging**: Socket.IO for instant messaging
- **Booking System**: Calendar-based appointment booking
- **Payment Processing**: Stripe integration for deposits and payments
- **Image Management**: Cloudinary for portfolio and profile images
- **Artist Profiles**: Comprehensive artist profiles with portfolios
- **Client Dashboard**: Browse artists, book appointments, manage bookings
- **Artist Dashboard**: Manage availability, bookings, and profile
- **Performance**: Optimized queries, caching, and monitoring
- **Scalability**: Load-tested, database indexes, query optimization

## 🔒 Security Features

- Rate limiting on API endpoints
- Helmet.js for security headers
- CORS configuration
- Request timeouts
- Input validation with Zod
- File upload validation
- Environment variable validation

## 📝 API Endpoints

The backend API is available at `http://localhost:5005/api`:

- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/bookings/*` - Booking management
- `/api/messages/*` - Messaging endpoints
- `/api/billing/*` - Payment processing
- `/api/images/*` - Image upload endpoints
- `/api/reviews/*` - Review endpoints
- `/api/availability/*` - Availability management
- `/health` - Health check endpoint

## 🐛 Troubleshooting

### Backend won't start
- Check that MongoDB is running (if using local instance)
- Verify all required environment variables are set
- Check the console for specific error messages

### Frontend won't start
- Ensure Node.js version is v20 or higher
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Check that `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env`

### Database connection issues
- Verify `MONGO_URI` is correct
- Check MongoDB is accessible (firewall, network, etc.)
- For MongoDB Atlas, ensure your IP is whitelisted

### Image upload issues
- Verify Cloudinary credentials are correct
- Check file size limits (configured in backend)
- Ensure CORS is properly configured

### Tests failing
- Ensure MongoDB is running for integration tests
- Check that all environment variables are set (especially Stripe keys for payment tests)
- Run `npm install` to ensure all dependencies are installed
- For frontend tests, ensure `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env`

## 📚 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.IO** - Real-time communication
- **Clerk** - Authentication
- **Stripe** - Payment processing
- **Cloudinary** - Image storage
- **Winston** - Logging
- **Zod** - Schema validation
- **Jest** - Testing framework
- **Supertest** - API testing
- **MongoDB Memory Server** - Test database

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Clerk** - Authentication
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **Jest** - Testing framework
- **React Testing Library** - Component testing
- **ts-jest** - TypeScript testing support

## 📊 Performance Metrics

### Targets
- **Request Duration**: < 500ms (95th percentile)
- **Query Duration**: < 100ms (95th percentile)
- **Cache Hit Rate**: > 70%
- **Test Coverage**: > 80%

### Monitoring
- All slow requests logged
- Query performance tracked
- Memory usage monitored
- Cache statistics available
- Load test results included

## 🔄 Future Scalability Considerations

### Ready for:
- **Redis Integration**: Cache layer designed for easy migration
- **Database Read Replicas**: Query optimization supports read replicas
- **Service Decoupling**: Microservices-ready architecture
- **Horizontal Scaling**: Load-tested and optimized
- **CDN Integration**: Static asset delivery
- **Message Queue Integration**: Async processing ready

## 📄 License

ISC