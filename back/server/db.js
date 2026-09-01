import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "lipovoy";

export async function connectDatabase(retries = 3) {
  if (!uri) {
    console.warn("MONGO_URI is not set — using in-memory database");
    return false;
  }

  if (mongoose.connection.readyState === 1) return true;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        family: 4,
      });
      console.log(`MongoDB connected (${dbName})`);
      return true;
    } catch (error) {
      console.error(`MongoDB attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  return false;
}

/** Wait for an in-flight connect, or reconnect if the pool dropped (common on Vercel). */
export async function ensureDatabase() {
  if (!uri) return false;
  if (mongoose.connection.readyState === 1) return true;

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      const onConnected = () => {
        cleanup();
        resolve();
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("MongoDB connect timeout"));
      }, 20000);
      const cleanup = () => {
        clearTimeout(timer);
        mongoose.connection.off("connected", onConnected);
        mongoose.connection.off("error", onError);
      };
      mongoose.connection.once("connected", onConnected);
      mongoose.connection.once("error", onError);
    }).catch((error) => {
      console.error("MongoDB ensure wait failed:", error.message);
    });
    if (mongoose.connection.readyState === 1) return true;
  }

  return connectDatabase();
}

export function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

export function isMongoConfigured() {
  return Boolean(uri);
}
