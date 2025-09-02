import express from "express";
const router = express.Router();

// Example: get dashboard data for logged-in user
router.get("/", (req, res) => {
  const userId = req.auth.userId; // from requireSession()

  // In a real app, you would fetch dashboard data from your database
  // using the userId
  const dashboardData = {
    message: `Welcome to your dashboard, user ${userId}!`,
    bookings: [], // replace with actual bookings from MongoDB
    tattoos: [],  // replace with actual tattoo designs
  };

  res.json(dashboardData);
});

export default router;