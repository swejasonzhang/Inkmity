// Repository pattern for User data access (DRY principle)
import mongoose from "mongoose";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import cache from "../utils/cache.js";
import { cacheHelpers } from "../utils/cache.js";

const CACHE_TTL = 300000; // 5 minutes
const CACHE_KEY_PREFIX = "user";

class UserRepository {
  /**
   * Find user by Clerk ID with caching
   */
  async findByClerkId(clerkId, useCache = true) {
    const cacheKey = `${CACHE_KEY_PREFIX}:clerkId:${clerkId}`;
    
    if (useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const user = await User.findOne({ clerkId }).lean();
    
    if (user && useCache) {
      cache.set(cacheKey, user, CACHE_TTL);
    }
    
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase().trim() }).lean();
  }

  /**
   * Find user by handle
   */
  async findByHandle(handle) {
    const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
    return await User.findOne({ handle: normalizedHandle }).lean();
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const cacheKey = `${CACHE_KEY_PREFIX}:id:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const user = await User.findById(id).lean();
    if (user) {
      cache.set(cacheKey, user, CACHE_TTL);
    }
    return user;
  }

  /**
   * Create or update user (upsert)
   */
  async upsert(clerkId, data) {
    const Model = data.role === "client" 
      ? mongoose.model("client") 
      : mongoose.model("artist");

    const user = await Model.findOneAndUpdate(
      { clerkId },
      { $set: data },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    // Invalidate cache
    this.invalidateCache(clerkId, user?._id?.toString());
    
    return user;
  }

  /**
   * Update user by Clerk ID
   */
  async updateByClerkId(clerkId, updates) {
    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (user) {
      this.invalidateCache(clerkId, user._id?.toString());
    }

    return user;
  }

  /**
   * Find artists with filtering and pagination
   */
  async findArtists(filters = {}, pagination = {}) {
    const {
      search,
      location,
      style,
      booking,
      travel,
      experience,
      sort = "rating_desc",
      page = 1,
      pageSize = 12,
    } = pagination;

    const query = { role: "artist" };

    // Build search filter
    if (search) {
      query.$text = { $search: search };
    }

    if (location) {
      query.location = new RegExp(`^${location}$`, "i");
    }

    if (style) {
      query.styles = style;
    }

    if (booking) {
      query.bookingPreference = booking;
    }

    if (travel) {
      query.travelFrequency = travel;
    }

    if (experience && Object.keys(experience).length) {
      query.yearsExperience = experience;
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case "experience_desc":
        sortQuery = { yearsExperience: -1, rating: -1 };
        break;
      case "experience_asc":
        sortQuery = { yearsExperience: 1, rating: -1 };
        break;
      case "newest":
        sortQuery = { createdAt: -1 };
        break;
      case "rating_asc":
        sortQuery = { rating: 1, reviewsCount: -1 };
        break;
      default:
        sortQuery = { rating: -1, reviewsCount: -1, createdAt: -1 };
    }

    // Use aggregation for text search scoring if searching
    if (search) {
      const pipeline = [
        { $match: query },
        { $sort: { score: { $meta: "textScore" }, ...sortQuery } },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
        {
          $project: {
            _id: 1,
            clerkId: 1,
            username: 1,
            handle: 1,
            role: 1,
            location: 1,
            shop: 1,
            styles: 1,
            yearsExperience: 1,
            baseRate: 1,
            bookingPreference: 1,
            travelFrequency: 1,
            rating: 1,
            reviewsCount: 1,
            bookingsCount: 1,
            createdAt: 1,
            bio: 1,
            portfolioImages: 1,
            avatar: 1,
            coverImage: 1,
            profileImage: { $ifNull: ["$avatar.url", null] },
            avatarUrl: { $ifNull: ["$avatar.url", null] },
          },
        },
      ];

      const [items, totalResult] = await Promise.all([
        User.aggregate(pipeline),
        User.countDocuments(query),
      ]);

      return {
        items: items || [],
        total: totalResult || 0,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((totalResult || 0) / pageSize)),
      };
    }

    // Regular query for non-search
    const [total, items] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort(sortQuery)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select(
          "_id clerkId username handle role location shop styles yearsExperience baseRate bookingPreference travelFrequency rating reviewsCount bookingsCount createdAt bio portfolioImages avatar coverImage"
        )
        .lean(),
    ]);

    const itemsWithProfileImage = items.map((item) => ({
      ...item,
      profileImage: item.avatar?.url || item.profileImage || null,
      avatarUrl: item.avatar?.url || item.avatarUrl || null,
    }));

    return {
      items: itemsWithProfileImage,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /**
   * Find featured artists (top rated)
   */
  async findFeaturedArtists(limit = 5) {
    const cacheKey = `${CACHE_KEY_PREFIX}:featured:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const artists = await User.find({ role: "artist" })
      .sort({ rating: -1 })
      .limit(limit)
      .select("_id username location style priceRange rating")
      .lean();

    cache.set(cacheKey, artists, CACHE_TTL);
    return artists;
  }

  /**
   * Check handle availability
   */
  async isHandleAvailable(handle) {
    const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
    const exists = await User.findOne({ handle: normalizedHandle }, { _id: 1 }).lean();
    return !exists;
  }

  /**
   * Invalidate cache for user
   */
  invalidateCache(clerkId, userId) {
    if (clerkId) {
      cache.delete(`${CACHE_KEY_PREFIX}:clerkId:${clerkId}`);
    }
    if (userId) {
      cache.delete(`${CACHE_KEY_PREFIX}:id:${userId}`);
    }
    // Invalidate featured artists cache
    cacheHelpers.invalidate(`${CACHE_KEY_PREFIX}:featured:*`);
  }
}

export default new UserRepository();
