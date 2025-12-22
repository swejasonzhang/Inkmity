import ArtistPolicy from "../models/ArtistPolicy.js";
import ClientBookingPermission from "../models/ClientBookingPermission.js";

export async function getArtistPolicy(req, res) {
  const { artistId } = req.params;
  if (!artistId) return res.status(400).json({ error: "missing_artistId" });
  const doc =
    (await ArtistPolicy.findOne({ artistId })) ||
    (await ArtistPolicy.create({ artistId }));
  res.json(doc);
}

export async function upsertArtistPolicy(req, res) {
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
    },
  };
  
  // If trying to enable bookings, verify deposit is configured
  if (bookingEnabled === true) {
    const deposit = update.deposit;
    const hasDepositConfig = 
      (deposit.mode === "flat" && deposit.amountCents > 0) ||
      (deposit.mode === "percent" && deposit.percent > 0 && deposit.minCents > 0);
    
    if (!hasDepositConfig) {
      return res.status(400).json({ 
        error: "deposit_required",
        message: "Deposit must be configured before enabling bookings"
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
}

export async function getBookingGate(req, res) {
  try {
    const { artistId } = req.params;
    const clientId = req.query?.clientId || req.user?.clerkId || req.auth?.userId;
    
    if (!artistId) return res.status(400).json({ error: "missing_artistId" });
    
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
    
    // Check per-client permission if clientId is provided
    let clientEnabled = false;
    if (clientId) {
      const permission = await ClientBookingPermission.findOne({
        artistId,
        clientId: String(clientId),
      });
      clientEnabled = permission ? Boolean(permission.enabled) : false;
    }
    
    res.json({
      enabled: clientEnabled,
      depositConfigured,
      message: clientEnabled
        ? "You can book appointments"
        : depositConfigured
          ? "The artist needs to enable appointments for you"
          : "The artist needs to configure deposit and enable appointments for you"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch booking gate status" });
  }
}

export async function enableClientBookings(req, res) {
  try {
    const { artistId, clientId } = req.body || {};
    const actorId = req.user?.clerkId || req.auth?.userId;
    
    if (!artistId || !clientId) {
      return res.status(400).json({ error: "artistId and clientId required" });
    }
    
    // Verify the actor is the artist
    if (String(actorId) !== String(artistId)) {
      return res.status(403).json({ error: "Only the artist can enable bookings for clients" });
    }
    
    // Verify deposit is configured
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
    
    // Create or update permission
    const permission = await ClientBookingPermission.findOneAndUpdate(
      { artistId, clientId },
      {
        enabled: true,
        enabledAt: new Date(),
        enabledBy: "artist",
      },
      { new: true, upsert: true }
    );
    
    res.json({ 
      ok: true, 
      permission,
      message: "Appointments enabled for this client"
    });
  } catch (error) {
    console.error("Error enabling client bookings:", error);
    res.status(500).json({ error: "Failed to enable client bookings" });
  }
}