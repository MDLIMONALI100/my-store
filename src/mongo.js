import { MongoClient } from "mongodb";

// Workers can't keep a database connection open between requests, so each
// request opens one connection, uses it, and closes it.
// The connection string comes from the MONGODB_URI secret (.dev.vars locally,
// `wrangler secret put MONGODB_URI` for the live site).
export async function withMongo(env, fn) {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
    appName: "streetwear-worker",
  });
  try {
    await client.connect();
    return await fn(client.db(env.MONGODB_DB || "streetwear"));
  } finally {
    await client.close().catch(() => {});
  }
}
