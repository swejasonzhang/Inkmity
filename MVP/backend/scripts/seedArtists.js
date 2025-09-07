import mongoose from "mongoose";
import dotenv from "dotenv";
import Artist from "../models/Artist.js";

dotenv.config({ path: "../.env" });

// Expanded list of locations
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

// Expanded list of tattoo styles
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

// Helpers
const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const seedArtists = async () => {
  try {
    console.log("process.env.MONGO_URI", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);

    // Clear old artists
    await Artist.deleteMany();

    const artists = Array.from({ length: 1000 }).map((_, i) => {
      const minPrice = randomInt(100, 5000);
      const maxPrice = randomInt(minPrice + 100, 10000);

      return {
        name: `Artist ${i + 1}`,
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

    await Artist.insertMany(artists);
    console.log("✅ Seeded 1000 artists successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding artists:", error);
    process.exit(1);
  }
};

seedArtists();
