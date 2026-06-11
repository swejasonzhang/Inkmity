import ArtistPolicy from "../models/ArtistPolicy.js";
import ClientBookingPermission from "../models/ClientBookingPermission.js";
import Artist from "../models/Artist.js";
import { config } from "../config/index.js";
import { getIO, userRoom } from "../services/socketService.js";

export async function getArtistPolicy(req, res) {
  try {
    const { artistId } = req.params;
    if (!artistId) return res.status(400).json({ error: "missing_artistId" });
    const doc =
      (await ArtistPolicy.findOne({ artistId })) ||
      (await ArtistPolicy.create({ artistId }));
    res.json(doc);
  } catch (err) {
    console.error("getArtistPolicy error:", err);
    return res.status(500).json({ error: "Failed to fetch artist policy" });
  }
}

export async function upsertArtistPolicy(req, res) {
  try {
    const { artistId } = req.params;
    if (!artistId) return res.status(400).json({ error: "missing_artistId" });
    const depositPayload = req.body?.deposit || {};
    const bookingEnabled = req.body?.bookingEnabled;

    const update = {
      deposit: {
        mode: depositPayload.mode || "percent",
        amountCents: Math.max(0, Number(depositPayload.amountCents ?? 5000)),
        percent: Math.max(0, Math.min(1, Number(depositPayload.percent ?? 0.2))),
        minCents: Math.max(0, Number(depositPayload.minCents ?? 5000)),
        maxCents: Math.max(0, Number(depositPayload.maxCents ?? 30000)),
        nonRefundable: Boolean(depositPayload.nonRefundable ?? true),
        cutoffHours: Math.max(0, Number(depositPayload.cutoffHours ?? 48)),
        consultationFree: Boolean(depositPayload.consultationFree ?? true),
      },
    };

    if (bookingEnabled === true) {
      const deposit = update.deposit;
      const hasDepositConfig =
        (deposit.mode === "flat" && deposit.amountCents > 0) ||
        (deposit.mode === "percent" && deposit.percent > 0 && deposit.minCents > 0);

      if (!hasDepositConfig) {
        return res.status(400).json({
          error: "deposit_required",
          message: "Deposit must be configured before enabling bookings",
        });
      }
      update.bookingEnabled = true;
    } else if (bookingEnabled === false) {
      update.bookingEnabled = false;
    }

    const doc = await ArtistPolicy.findOneAndUpdate(
      { artistId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) {
    console.error("upsertArtistPolicy error:", err);
    return res.status(500).json({ error: "Failed to update artist policy" });
  }
}

export async function getBookingGate(req, res) {
  try {
    const { artistId } = req.params;
    const clientId = req.query?.clientId || req.user?.clerkId || req.auth?.userId;

    if (!artistId) return res.status(400).json({ error: "missing_artistId" });

    if (config.dev.bypassGates) {
      return res.json({
        enabled: true,
        depositConfigured: true,
        payoutsReady: true,
        message: "Dev mode: bookings enabled",
      });
    }

    const policy = await ArtistPolicy.findOne({ artistId });
    if (!policy) {
      return res.json({
        enabled: false,
        depositConfigured: false,
        message: "Artist booking policy not found"
      });
    }

    const deposit = policy.deposit || {};
    const depositConfigured =
      (deposit.mode === "flat" && deposit.amountCents > 0) ||
      (deposit.mode === "percent" && deposit.percent > 0 && deposit.minCents > 0);

    let clientEnabled = false;
    let maxSessions = 1;
    let pieceSize = "flash";
    if (clientId) {
      const permission = await ClientBookingPermission.findOne({
        artistId,
        clientId: String(clientId),
      });
      clientEnabled = permission ? Boolean(permission.enabled) : false;
      if (permission) {
        maxSessions = permission.maxSessions || 1;
        pieceSize = permission.pieceSize || "flash";
      }
    }

    const artist = await Artist.findOne({ clerkId: String(artistId) });
    const payoutsReady = Boolean(artist?.stripeConnectAccountId && artist.chargesEnabled);

    const enabled = clientEnabled && payoutsReady;
    res.json({
      enabled,
      depositConfigured,
      payoutsReady,
      maxSessions,
      pieceSize,
      message: !payoutsReady
        ? "This artist hasn't finished payment setup yet."
        : enabled
          ? "You can book appointments"
          : depositConfigured
            ? "The artist needs to enable appointments for you"
            : "The artist needs to configure deposit and enable appointments for you"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch booking gate status" });
  }
}

// Default number of sessions/dates a client may book for each piece size. The artist
// can override with an explicit maxSessions. Flash stays a single sitting.
const PIECE_SIZE_SESSIONS = {
  flash: 1,
  small: 1,
  medium: 2,
  large: 3,
  sleeve: 5,
  back_piece: 8,
};

export async function enableClientBookings(req, res) {
  try {
    const { artistId, clientId, pieceSize, maxSessions } = req.body || {};
    const actorId = req.user?.clerkId || req.auth?.userId;

    if (!artistId || !clientId) {
      return res.status(400).json({ error: "artistId and clientId required" });
    }

    const size = PIECE_SIZE_SESSIONS[pieceSize] ? pieceSize : "flash";
    const requested = Number(maxSessions);
    const sessions = Math.max(
      1,
      Math.min(
        12,
        Number.isFinite(requested) && requested > 0
          ? Math.round(requested)
          : PIECE_SIZE_SESSIONS[size]
      )
    );

    if (String(actorId) !== String(artistId)) {
      return res.status(403).json({ error: "Only the artist can enable bookings for clients" });
    }

    const policy = await ArtistPolicy.findOne({ artistId });
    if (!policy) {
      return res.status(400).json({ error: "Artist policy not found. Please configure deposit first." });
    }

    const deposit = policy.deposit || {};
    const depositConfigured =
      (deposit.mode === "flat" && deposit.amountCents > 0) ||
      (deposit.mode === "percent" && deposit.percent > 0 && deposit.minCents > 0);

    if (!depositConfigured) {
      return res.status(400).json({
        error: "deposit_required",
        message: "Deposit must be configured before enabling bookings for clients"
      });
    }

    const permission = await ClientBookingPermission.findOneAndUpdate(
      { artistId, clientId },
      {
        enabled: true,
        pieceSize: size,
        maxSessions: sessions,
        enabledAt: new Date(),
        enabledBy: "artist",
      },
      { new: true, upsert: true }
    );

    const io = getIO();
    if (io) {
      io.to(userRoom(clientId)).emit("booking:enabled", { artistId, clientId });
    }

    res.json({
      ok: true,
      permission,
      message: "Appointments enabled for this client"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to enable client bookings" });
  }
}