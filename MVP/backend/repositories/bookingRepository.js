import Booking from "../models/Booking.js";
import cache from "../utils/cache.js";
import { cacheHelpers } from "../utils/cache.js";

const CACHE_TTL = 180000;
const CACHE_KEY_PREFIX = "booking";

class BookingRepository {
  async findById(id, useCache = true) {
    const cacheKey = `${CACHE_KEY_PREFIX}:id:${id}`;

    if (useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const booking = await Booking.findById(id).lean();

    if (booking && useCache) {
      cache.set(cacheKey, booking, CACHE_TTL);
    }

    return booking;
  }

  async findByArtistId(artistId, filters = {}) {
    const { status, startDate, endDate, appointmentType } = filters;
    const query = { artistId };

    if (status) {
      query.status = status;
    }

    if (appointmentType) {
      query.appointmentType = appointmentType;
    }

    if (startDate || endDate) {
      query.startAt = {};
      if (startDate) query.startAt.$gte = new Date(startDate);
      if (endDate) query.startAt.$lte = new Date(endDate);
    }

    return await Booking.find(query)
      .sort({ startAt: -1 })
      .lean();
  }

  async findByClientId(clientId, filters = {}) {
    const { status, startDate, endDate, appointmentType } = filters;
    const query = { clientId };

    if (status) {
      query.status = status;
    }

    if (appointmentType) {
      query.appointmentType = appointmentType;
    }

    if (startDate || endDate) {
      query.startAt = {};
      if (startDate) query.startAt.$gte = new Date(startDate);
      if (endDate) query.startAt.$lte = new Date(endDate);
    }

    return await Booking.find(query)
      .sort({ startAt: -1 })
      .lean();
  }

  async findOverlapping(artistId, startAt, endAt, excludeBookingId = null) {
    const query = {
      artistId,
      status: { $in: ["pending", "accepted", "confirmed", "in-progress"] },
      $or: [
        { startAt: { $lt: endAt }, endAt: { $gt: startAt } },
      ],
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    return await Booking.find(query).lean();
  }

  async create(bookingData) {
    const booking = await Booking.create(bookingData);

    this.invalidateCacheByArtist(booking.artistId);
    this.invalidateCacheByClient(booking.clientId);

    return booking.toObject();
  }

  async updateById(id, updates) {
    const booking = await Booking.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (booking) {
      this.invalidateCache(id, booking.artistId, booking.clientId);
    }

    return booking;
  }

  async deleteById(id) {
    const booking = await Booking.findById(id).lean();

    if (booking) {
      await Booking.deleteOne({ _id: id });
      this.invalidateCache(id, booking.artistId, booking.clientId);
      return true;
    }

    return false;
  }

  async countByStatus(artistId, status) {
    return await Booking.countDocuments({ artistId, status });
  }

  async findUpcoming(artistId, limit = 10) {
    const now = new Date();
    return await Booking.find({
      artistId,
      startAt: { $gte: now },
      status: { $in: ["pending", "accepted", "confirmed"] },
    })
      .sort({ startAt: 1 })
      .limit(limit)
      .lean();
  }

  invalidateCache(bookingId, artistId, clientId) {
    if (bookingId) {
      cache.delete(`${CACHE_KEY_PREFIX}:id:${bookingId}`);
    }
    if (artistId) {
      cacheHelpers.invalidate(`${CACHE_KEY_PREFIX}:artist:${artistId}:*`);
    }
    if (clientId) {
      cacheHelpers.invalidate(`${CACHE_KEY_PREFIX}:client:${clientId}:*`);
    }
  }

  invalidateCacheByArtist(artistId) {
    cacheHelpers.invalidate(`${CACHE_KEY_PREFIX}:artist:${artistId}:*`);
  }

  invalidateCacheByClient(clientId) {
    cacheHelpers.invalidate(`${CACHE_KEY_PREFIX}:client:${clientId}:*`);
  }
}

export default new BookingRepository();