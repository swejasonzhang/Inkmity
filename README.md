# For The Love Of Tattoos

> A modern web application connecting tattoo clients and artists, helping them communicate, find local artists, and explore tattoo designs. Built with a MERN stack and modern frontend tools.

---

## Table of Contents

- Project Overview
- Current Features
- Future Features
- Tech Stack
- Getting Started
- Contributing
- License & Usage
- Contact
- Deployment Notes

---

## Project Overview

**For The Love Of Tattoos** is designed to bridge the gap between tattoo clients and artists by providing:

- A platform for clients to discover and communicate with tattoo artists near them.  
- A modern, responsive user interface with smooth interactions.  
- Backend services to manage users, artists, and their interactions securely.  

The goal is to improve the way clients find artists, book sessions, and visualize tattoo ideas. Future AI enhancements will provide intelligent recommendations, tattoo placement previews, and sorting by style, pricing, and location.

---

## Current Features

- **Waitlist sign-up**: Users can join a waitlist to get early access to the platform.  
- Responsive design with Tailwind CSS.  
- Interactive animations using Framer Motion.  
- Notifications using React Toastify.

---

## Future Features

- User authentication (signup/login)  
- Artist and client profiles  
- Search and filter artists by location and style  
- Real-time messaging between clients and artists via **WebSockets**  
- AI-powered chatbot for client guidance  
- AI tattoo placement visualization  
- Sorting artists by pricing, style, and area  
- In-app booking, reviews, and ratings  

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), Tailwind CSS, Framer Motion, React Toastify, Lucide Icons |
| Backend | Node.js, Express.js, WebSockets (Socket.io or similar) |
| Database | MongoDB Atlas |
| Hosting | Netlify (frontend), Vercel (backend) |
| Dev Tools | ESLint, Prettier, npm/yarn |

---

### Prerequisites
- Node.js v18+  
- npm or yarn  
- MongoDB Atlas account  

---

## Scaling Considerations

Even with the waitlist as the first feature, planning ahead will help when adding more features:

- **Backend & API**
  - Use WebSockets for real-time messaging once implemented.  
  - Add caching (Redis) for frequent queries.  
  - Optimize MongoDB queries and add indexes for scalability.

- **Frontend**
  - Use code-splitting and lazy loading for improved performance.  
  - Optimize static assets and images.

- **Future-Proofing**
  - Monitor performance and errors using tools like Sentry or LogRocket.  
  - Design backend to allow horizontal scaling when traffic grows.  

---

## Contributing

This is a **personal project** and is not open for public contributions.  
Professional collaborations may be considered by contacting the author directly.

---

## License & Usage

- **Private intellectual property** — this project is **not for personal or commercial use without explicit permission**.  
- Redistribution or copying for personal use is strictly prohibited.  

---

## Contact

**Jason Zhang**  
- GitHub: https://github.com/swejasonzhang  
- Email: `swejasonzhang@gmail.com`  
- LinkedIn: `https://www.linkedin.com/in/swejasonzhang/`  

---

## Deployment Notes

- **Frontend (Netlify)**  
  - The frontend is deployed to Netlify and uses the build process to generate production-ready static files.

- **Backend (Vercel)**  
  - The backend API is deployed to Vercel, with environment variables configured securely for database connections and authentication.  
  - WebSockets or serverless real-time communication will be supported for live messaging when implemented.
