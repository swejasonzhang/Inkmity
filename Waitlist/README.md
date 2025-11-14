# Inkmity Waitlist

A modern waitlist platform connecting tattoo clients with local artists. Built with React, Express, and MongoDB.

## 🎯 Overview

Inkmity is a platform designed to revolutionize how people discover and book tattoo artists. This waitlist application allows users to sign up for early access and be notified when the full platform launches.

**Live Site:** [inkmity.com](https://inkmity.com)

## ✨ Features

### Current
- ✅ Waitlist sign-up with email validation
- ✅ Real-time signup counter
- ✅ Welcome email notifications via Postmark
- ✅ Mobile-first responsive design
- ✅ Smooth animations with Framer Motion
- ✅ Dark theme UI with Tailwind CSS
- ✅ Reference code generation for sharing
- ✅ Full authentication system
- ✅ Client and artist profiles
- ✅ Real-time messaging with shared references

### Coming Soon
- 🔜 AI guidance for placement and sizing
- 🔜 On-platform booking and deposits
- 🔜 Reviews and ratings system
- 🔜 Advanced search and filters (style, price, location)
- 🔜 Artist tools: portfolios, analytics, payout management

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible component primitives
- **Canvas Confetti** - Celebration effects

### Backend
- **Node.js** - Runtime
- **Express 5** - Web framework
- **MongoDB** - Database (via Mongoose)
- **Postmark** - Email delivery service
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Deployment
- **Vercel** - Frontend and serverless functions
- **MongoDB Atlas** - Cloud database

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Clone the repository** and navigate to the project directory
2. **Install frontend dependencies**: Navigate to `frontend/` and run `npm install`
3. **Install backend dependencies**: Navigate to `backend/` and run `npm install`

### Running Locally

1. **Start the backend server**: Navigate to `backend/` and run `node server.js`. Backend runs on `http://localhost:5005`
2. **Start the frontend dev server**: Navigate to `frontend/` and run `npm run dev`. Frontend runs on `http://localhost:5173`
3. **Visit** `http://localhost:5173` in your browser

## 🚢 Deployment

### Frontend (Vercel)

1. Connect your repository to Vercel
2. Set build command: `cd frontend && npm install && npm run build`
3. Set output directory: `frontend/dist`

### Backend (Vercel Serverless)

1. Deploy the `backend/` directory as a Vercel project
2. Vercel will automatically detect and deploy serverless functions from `backend/api/`

## 📡 API Endpoints

### Waitlist

- `GET /api/waitlist` - Get total signup count
- `POST /api/waitlist` - Join the waitlist
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

### Health Check

- `GET /healthz` - Server health check

## 🧪 Development

### Frontend Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Scripts

The backend uses Express directly. For development, run `node server.js` from the `backend/` directory.

## 🔒 Security

- Helmet.js for security headers
- CORS configured for allowed origins
- Input validation and sanitization

## 📝 License

All rights reserved © 2025 Inkmity

## 📞 Contact

**Inkmity**

- 🌐 Website: [inkmity.com](https://inkmity.com)
- 📧 Email: [jason@inkmity.com](mailto:jason@inkmity.com)
- 📱 Instagram: [@inkmity](https://instagram.com/inkmity)
- 🎵 TikTok: [@inkmity](https://tiktok.com/@inkmity)
- 💼 LinkedIn: [Inkmity](https://www.linkedin.com/company/inkmity)

---

_Pre-register today and help shape the next tattoo platform._