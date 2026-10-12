import { ObjectId } from "mongodb";
import { withMongo } from "./mongo.js";

// Reviews live in MongoDB (collection "reviews"). One document per review:
// { _id, productId, name, rating (1-5), body, status: "pending" | "approved", createdAt }
const STATUSES = ["pending", "approved"];

let indexesReady = false;
// createIndex is a no-op when the index already exists, so this is safe to run
// once per Worker instance.
async function ensureIndexes(db) {
  if (indexesReady) return;
  await db.collection("reviews").createIndexes([
    { key: { productId: 1, status: 1, createdAt: -1 }, name: "product_status_date" },
    { key: { status: 1, createdAt: -1 }, name: "status_date" },
  ]);
  indexesReady = true;
}

export function validateReview(input) {
  const str = (k, max) => (typeof input?.[k] === "string" ? input[k].trim().slice(0, max) : "");
  // Hidden "website" field: people never see it, bots often fill it in.
  if (str("website", 200)) return { error: "spam" };
  const name = str("name", 60);
  const body = str("body", 1500);
  const rating = Number(input?.rating);
  if (name.length < 2) return { error: "Please enter your name" };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Please choose a rating from 1 to 5 stars" };
  if (body.length < 10) return { error: "Please write at least a sentence (10+ characters)" };
  return { value: { name, rating, body } };
}

export async function addReview(env, productId, review) {
  return withMongo(env, async (db) => {
    await ensureIndexes(db);
    const doc = { productId, ...review, status: "pending", createdAt: new Date() };
    const { insertedId } = await db.collection("reviews").insertOne(doc);
    return insertedId.toString();
  });
}

// Approved reviews for one product, newest first, plus a star breakdown.
export async function getProductReviews(env, productId) {
  return withMongo(env, async (db) => {
    const reviews = db.collection("reviews");
    const [list, breakdown] = await Promise.all([
      reviews
        .find({ productId, status: "approved" }, { projection: { name: 1, rating: 1, body: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray(),
      reviews
        .aggregate([{ $match: { productId, status: "approved" } }, { $group: { _id: "$rating", count: { $sum: 1 } } }])
        .toArray(),
    ]);
    const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const b of breakdown) stars[b._id] = b.count;
    const count = Object.values(stars).reduce((a, b) => a + b, 0);
    const average = count ? Object.entries(stars).reduce((s, [r, n]) => s + r * n, 0) / count : 0;
    return {
      summary: { average: Math.round(average * 10) / 10, count, stars },
      reviews: list.map((r) => ({ id: r._id.toString(), name: r.name, rating: r.rating, body: r.body, createdAt: r.createdAt })),
    };
  });
}

// ---------- Admin ----------

export async function listReviews(env, status) {
  return withMongo(env, async (db) => {
    await ensureIndexes(db);
    const reviews = db.collection("reviews");
    const filter = STATUSES.includes(status) ? { status } : {};
    const [list, counts] = await Promise.all([
      reviews.find(filter).sort({ createdAt: -1 }).limit(200).toArray(),
      reviews.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    ]);
    const byStatus = { pending: 0, approved: 0 };
    for (const c of counts) byStatus[c._id] = c.n;
    return {
      counts: byStatus,
      reviews: list.map((r) => ({
        id: r._id.toString(), productId: r.productId, name: r.name, rating: r.rating,
        body: r.body, status: r.status, createdAt: r.createdAt,
      })),
    };
  });
}

// Changes or deletes a review, then returns the product's new rating summary
// (average of approved reviews) so it can be copied into D1.
export async function moderateReview(env, id, action) {
  if (!/^[a-f0-9]{24}$/.test(id)) return { error: "Invalid review id", status: 400 };
  return withMongo(env, async (db) => {
    const reviews = db.collection("reviews");
    const _id = new ObjectId(id);
    const existing = await reviews.findOne({ _id }, { projection: { productId: 1 } });
    if (!existing) return { error: "Review not found", status: 404 };

    if (action === "delete") await reviews.deleteOne({ _id });
    else if (STATUSES.includes(action)) await reviews.updateOne({ _id }, { $set: { status: action } });
    else return { error: "Invalid action", status: 400 };

    const [agg] = await reviews
      .aggregate([
        { $match: { productId: existing.productId, status: "approved" } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
      .toArray();
    return {
      productId: existing.productId,
      average: agg ? Math.round(agg.average * 10) / 10 : 0,
      count: agg ? agg.count : 0,
    };
  });
}

// Just the numbers (pending / approved), for the admin dashboard.
export async function reviewCounts(env) {
  return withMongo(env, async (db) => {
    const rows = await db.collection("reviews").aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray();
    const out = { pending: 0, approved: 0 };
    for (const r of rows) out[r._id] = r.n;
    return out;
  });
}
