import { MongoClient, type Db } from "mongodb";

const uri = process.env.DATABASE_URL;
let clientPromise: Promise<MongoClient> | undefined;
let indexesReady: Promise<void> | undefined;

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("DATABASE_URL is not set");
  if (!clientPromise) clientPromise = new MongoClient(uri).connect();
  return clientPromise;
}

export async function getDb(): Promise<Db | null> {
  if (!uri) return null;
  const client = await getMongoClientPromise();
  const db = client.db();
  indexesReady ??= ensureIndexes(db);
  await indexesReady;
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("expenses").createIndex({ groupId: 1, ownerId: 1 }),
    db.collection("members").createIndex({ groupId: 1, ownerId: 1 }),
    db.collection("settlements").createIndex({ groupId: 1, ownerId: 1 }),
    db.collection("groups").createIndex({ ownerId: 1 }),
  ]);
}
