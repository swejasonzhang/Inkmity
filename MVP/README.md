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

### Backend Environment Variables

Create a `.env` or `.env.development` file in the `backend/` directory:

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
│   ├── middleware/        # Express middleware (auth, rate limiting, etc.)
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions (logger, etc.)
│   └── server.js          # Main server entry point
│
└── frontend/               # React/TypeScript frontend
    ├── src/
    │   ├── api/           # API client functions
    │   ├── components/    # React components
    │   │   ├── dashboard/ # Dashboard-specific components
    │   │   ├── ui/        # Reusable UI components (Shadcn)
    │   │   └── ...
    │   ├── hooks/         # Custom React hooks
    │   ├── lib/           # Library utilities
    │   ├── pages/         # Page components
    │   ├── utils/         # Utility functions
    │   └── main.tsx       # Application entry point
    └── public/            # Static assets
```

## 🛠️ Available Scripts

### Backend Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server with nodemon (auto-reload)

### Frontend Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run build:analyze` - Build and analyze bundle size

## 🧪 Development Workflow

1. **Code Quality**
   - ESLint is configured for TypeScript/React
   - Prettier is configured for consistent formatting
   - TypeScript strict mode is enabled

2. **Hot Reload**
   - Backend: Nodemon watches for file changes
   - Frontend: Vite HMR (Hot Module Replacement) for instant updates

3. **Error Handling**
   - Backend: Centralized error handler with Winston logging
   - Frontend: Error Boundary component for React errors

## 🔧 Key Features

- **Authentication**: Clerk-based authentication system
- **Real-time Messaging**: Socket.IO for instant messaging
- **Booking System**: Calendar-based appointment booking
- **Payment Processing**: Stripe integration for deposits and payments
- **Image Management**: Cloudinary for portfolio and profile images
- **Artist Profiles**: Comprehensive artist profiles with portfolios
- **Client Dashboard**: Browse artists, book appointments, manage bookings
- **Artist Dashboard**: Manage availability, bookings, and profile

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

## 📄 License

ISC