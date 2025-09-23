import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";

dotenv.config({ path: "../.env" });

const locations = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Miami",
  "Dallas",
  "Seattle",
  "Boston",
  "San Francisco",
  "Austin",
  "Portland",
  "Denver",
  "Las Vegas",
  "Atlanta",
  "Philadelphia",
  "Phoenix",
  "San Diego",
  "Detroit",
  "Orlando",
  "Nashville",
  "Houston",
];

const styles = [
  "Traditional",
  "Realism",
  "Tribal",
  "Japanese",
  "Watercolor",
  "Blackwork",
  "Neo-Traditional",
  "Geometric",
  "Minimalist",
  "Abstract",
  "Portrait",
  "Biomechanical",
  "Script",
  "Dotwork",
  "Celtic",
  "Chicano",
  "Fine Line",
  "Trash Polka",
  "Surrealism",
  "New School",
];

const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await User.deleteMany({ role: { $in: ["artist", "client"] } });

    const artists = Array.from({ length: 50 }).map((_, i) => {
      const minPrice = randomInt(100, 5000);
      const maxPrice = randomInt(minPrice + 100, 10000);

      return {
        clerkId: uuidv4(),
        name: `Artist ${i + 1}`,
        email: `artist${i + 1}@example.com`,
        password: "hashedPasswordHere",
        role: "artist",
        bio: `I am Artist ${i + 1}, specializing in ${randomFromArray(
          styles
        )} tattoos.`,
        location: randomFromArray(locations),
        style: Array.from({ length: randomInt(1, 3) }).map(() =>
          randomFromArray(styles)
        ),
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
        rating: parseFloat((Math.random() * 5).toFixed(1)),
        reviews: [],
      };
    });

    const clients = Array.from({ length: 10 }).map((_, i) => ({
      clerkId: uuidv4(),
      name: `Client ${i + 1}`,
      email: `client${i + 1}@example.com`,
      password: "hashedPasswordHere",
      role: "client",
      bio: `Hi, I’m Client ${
        i + 1
      }, looking for a tattoo artist in ${randomFromArray(locations)}.`,
      location: randomFromArray(locations),
    }));

    await User.insertMany([...artists, ...clients]);
    console.log("✅ Seeded 50 artists and 10 clients successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();