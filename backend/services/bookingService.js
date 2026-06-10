import { bookingRepository, userRepository } from "../repositories/index.js";
import { DateTime } from "luxon";

export const bookingService = {
  async createConsultation(artistId, clientId, bookingData) {
    const { startISO, durationMinutes = 30, priceCents = 0 } = bookingData;

    const validDuration = Math.max(15, Math.min(60, durationMinutes || 30));

    const startAt = new Date(startISO);
    const endAt = new Date(startAt.getTime() + validDuration * 60 * 1000);

    const conflicts = await bookingRepository.findOverlapping(
      artistId,
      startAt,
      endAt
    );

    if (conflicts.length > 0) {
      throw new Error("Time slot unavailable");
    }

    const booking = await bookingRepository.create({
      artistId,
      clientId,
      startAt,
      endAt,
      appointmentType: "consultation",
      status: "pending",
      priceCents,
      depositRequiredCents: 0,
      depositPaidCents: 0,
    });

    return booking;
  },

  async createTattooSession(artistId, clientId, bookingData) {
    const {
      startISO,
      endISO,
      durationMinutes,
      priceCents,
      depositRequiredCents = 0,
      projectId,
      sessionNumber = 1,
      referenceImageIds = [],
      intakeFormId,
    } = bookingData;

    const startAt = new Date(startISO);
    const endAt = endISO ? new Date(endISO) : new Date(startAt.getTime() + (durationMinutes || 120) * 60 * 1000);

    const conflicts = await bookingRepository.findOverlapping(
      artistId,
      startAt,
      endAt
    );

    if (conflicts.length > 0) {
      throw new Error("Time slot unavailable");
    }

    const booking = await bookingRepository.create({
      artistId,
      clientId,
      startAt,
      endAt,
      appointmentType: "tattoo_session",
      status: "pending",
      priceCents,
      depositRequiredCents,
      depositPaidCents: 0,
      projectId,
      sessionNumber,
      referenceImageIds,
      intakeFormId,
    });

    return booking;
  },

  async reschedule(bookingId, actorId, newStartISO, newEndISO) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.artistId !== actorId && booking.clientId !== actorId) {
      throw new Error("Unauthorized");
    }

    const newStartAt = new Date(newStartISO);
    const newEndAt = newEndISO ? new Date(newEndISO) : new Date(newStartAt.getTime() + (new Date(booking.endAt) - new Date(booking.startAt)));

    const conflicts = await bookingRepository.findOverlapping(
      booking.artistId,
      newStartAt,
      newEndAt,
      bookingId
    );

    if (conflicts.length > 0) {
      throw new Error("Time slot unavailable");
    }

    const updates = {
      startAt: newStartAt,
      endAt: newEndAt,
      rescheduledAt: new Date(),
      rescheduledFrom: booking.startAt,
      rescheduledBy: booking.artistId === actorId ? "artist" : "client",
    };

    return await bookingRepository.updateById(bookingId, updates);
  },

  async cancel(bookingId, actorId, reason) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.artistId !== actorId && booking.clientId !== actorId) {
      throw new Error("Unauthorized");
    }

    const cancelledBy = booking.artistId === actorId ? "artist" : "client";

    const updates = {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason,
    };

    return await bookingRepository.updateById(bookingId, updates);
  },

  async getBookingsForUser(userId, role, filters = {}) {
    if (role === "artist") {
      return await bookingRepository.findByArtistId(userId, filters);
    } else {
      return await bookingRepository.findByClientId(userId, filters);
    }
  },

  async getUpcomingBookings(artistId, limit = 10) {
    return await bookingRepository.findUpcoming(artistId, limit);
  },
};