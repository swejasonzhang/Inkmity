import ArtistPolicy from "../models/ArtistPolicy.js";

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
  const payload = req.body?.deposit || {};
  const doc = await ArtistPolicy.findOneAndUpdate(
    { artistId },
    {
      $set: {
        deposit: {
          mode: payload.mode || "percent",
          amountCents: Math.max(0, Number(payload.amountCents ?? 5000)),
          percent: Math.max(0, Math.min(1, Number(payload.percent ?? 0.2))),
          minCents: Math.max(0, Number(payload.minCents ?? 5000)),
          maxCents: Math.max(0, Number(payload.maxCents ?? 30000)),
          nonRefundable: Boolean(payload.nonRefundable ?? true),
          cutoffHours: Math.max(0, Number(payload.cutoffHours ?? 48)),
        },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(doc);
}