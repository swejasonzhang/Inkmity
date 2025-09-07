import mongoose from "mongoose";
import dotenv from "dotenv";
import Artist from "../models/Artist.js";

dotenv.config();

const fakeArtists = [
  {
    name: "Luna Vega",
    bio: "Fine line surrealism with soft details.",
    location: "Brooklyn, NY",
    style: ["Fine Line", "Surrealism"],
    priceRange: { min: 150, max: 400 },
    rating: 4.8,
  },
  {
    name: "Kai Nakamura",
    bio: "Traditional Japanese Irezumi expert with over 10 years of experience.",
    location: "Los Angeles, CA",
    style: ["Japanese", "Irezumi"],
    priceRange: { min: 300, max: 1200 },
    rating: 4.9,
  },
  {
    name: "Sophia Alvarez",
    bio: "Minimalist and geometric tattoos with clean, modern designs.",
    location: "Austin, TX",
    style: ["Minimalist", "Geometric"],
    priceRange: { min: 80, max: 250 },
    rating: 4.5,
  },
  {
    name: "Marcus Lee",
    bio: "Bold traditional tattoos with vibrant colors.",
    location: "Chicago, IL",
    style: ["Traditional", "American"],
    priceRange: { min: 200, max: 600 },
    rating: 4.6,
  },
  {
    name: "Amara Singh",
    bio: "Mandala and dotwork specialist with intricate patterns.",
    location: "San Francisco, CA",
    style: ["Mandala", "Dotwork"],
    priceRange: { min: 120, max: 500 },
    rating: 4.7,
  },
];

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB ✅");

    await Artist.deleteMany();
    console.log("Cleared old artist data 🗑️");

    await Artist.insertMany(fakeArtists);
    console.log("Inserted fake artists 🎨✨");

    mongoose.connection.close();
    console.log("Seeding complete, connection closed 🚪");
  })
  .catch((err) => {
    console.error("Error seeding artists ❌", err);
    mongoose.connection.close();
  });