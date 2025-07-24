import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"
const dbName = process.env.MONGODB_DB || "irrigation_system"

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectDB(): Promise<Db> {
  if (cachedDb) {
    return cachedDb
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }

  cachedDb = cachedClient.db(dbName)
  return cachedDb
}

export async function closeDB(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
  }
}
