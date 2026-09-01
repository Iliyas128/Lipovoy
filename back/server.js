import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { connectDatabase, ensureDatabase, isMongoConfigured, isMongoReady } from "./server/db.js";
import { persistProductMedia, persistSettingsMedia } from "./server/media.js";
import { presignUpload, s3Enabled, uploadBuffer } from "./server/s3.js";
import {
  cleanUser,
  createAuthMiddleware,
  hashPassword,
  isAdminEmail,
  requireAdmin,
  requireAuth,
  signToken,
  verifyPassword,
} from "./server/auth.js";
import { searchProducts } from "./server/search.js";
import { validateLoginInput, validateRegisterInput } from "./server/validate.js";
import {
  getTelegramDiagnostics,
  handleTelegramUpdate,
  setTelegramWebhook,
  telegramEnabled,
} from "./server/telegram.js";

const app = express();
const port = process.env.PORT || 4000;
app.use(express.json({ limit: "50mb" }));

const frontendOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (frontendOrigins.includes(origin) || frontendOrigins.includes("*"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const schema = new mongoose.Schema({
  slug:{type:String,unique:true},name:String,category:String,catalogs:[String],price:Number,color:String,accent:String,badge:String,
  isHit:{type:Boolean,default:false},isNewArrival:{type:Boolean,default:false},
  description:String,details:String,image:String,image2:String,images:[String],video:String,sizeMeasures:Object,sizes:Object
},{timestamps:true});
schema.index({ name: "text", description: "text", category: "text", slug: "text", badge: "text" });
const Product = mongoose.models.Product || mongoose.model("Product", schema);
const settingSchema = new mongoose.Schema({ menu: Array, catalogs: Array, reviewVideos: Array, heroSlides: Array }, { timestamps: true });
const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);

const cartItemSchema = new mongoose.Schema({
  key: String,
  slug: String,
  size: String,
  qty: Number,
  name: String,
  price: Number,
  image: String,
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true, trim: true },
  passwordHash: String,
  name: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
  cart: [cartItemSchema],
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
const memoryUsers = new Map();

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  items: Array,
  total: Number,
  status: { type: String, default: "awaiting_payment" },
  userEmail: String,
  telegramChatId: { type: String, index: true },
  telegramUsername: String,
  telegramName: String,
  telegramStage: String,
  customerName: String,
  customerPhone: String,
  deliveryAddress: String,
}, { timestamps: true });
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const memoryOrders = new Map();

const CATEGORY_CATALOG = {
  Outerwear: "outerwear",
  Bottoms: "bottoms",
  "T-Shirts": "t-shirts",
  Tops: "tops",
  Archive: "archive",
};

const defaultCatalogs = [
  { id: "outerwear", name: "Верхняя одежда", slug: "outerwear" },
  { id: "bottoms", name: "Брюки", slug: "bottoms" },
  { id: "t-shirts", name: "Футболки", slug: "t-shirts" },
  { id: "tops", name: "Верх", slug: "tops" },
  { id: "archive", name: "Архив", slug: "archive" },
];

let memory = [];
let memorySettings = {
  catalogs: defaultCatalogs,
  menu: [
    { label: "ВЕРХНЯЯ ОДЕЖДА", link: "/catalog/outerwear" },
    { label: "БРЮКИ", link: "/catalog/bottoms" },
    { label: "ФУТБОЛКИ", link: "/catalog/t-shirts" },
    { label: "ВЕРХ", link: "/catalog/tops" },
    { label: "АРХИВ", link: "/catalog/archive" },
  ],
  reviewVideos: [],
  heroSlides: [],
};

const total = p => Object.values(p.sizes || {}).reduce((s,n)=>s+Number(n||0),0);

function sanitizeProductInput(body = {}) {
  const catalogs = Array.isArray(body.catalogs)
    ? [...new Set(body.catalogs.map((s) => String(s).trim()).filter(Boolean))]
    : [];
  const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
  return {
    slug: String(body.slug || "").trim(),
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    catalogs,
    price: Number(body.price) || 0,
    color: body.color || "",
    accent: body.accent || "",
    badge: body.badge || "",
    isHit: Boolean(body.isHit),
    isNewArrival: Boolean(body.isNewArrival),
    description: body.description || "",
    details: body.details || "",
    image: body.image || images[0] || "",
    image2: body.image2 || images[1] || "",
    images,
    video: typeof body.video === "string" ? body.video : "",
    sizeMeasures: body.sizeMeasures || {},
    sizes: body.sizes || {},
  };
}

const clean = p => {
  const x = p?.toObject ? p.toObject() : { ...p };
  if (!x) return null;
  const images = x.images?.length ? x.images.filter(Boolean) : [x.image, x.image2].filter(Boolean);
  if (!x.image && images[0]) x.image = images[0];
  if (!x.image2 && images[1]) x.image2 = images[1];
  const catalogs = x.catalogs?.length ? x.catalogs.filter(Boolean) : [CATEGORY_CATALOG[x.category]].filter(Boolean);
  return { ...x, id: x._id?.toString?.() || x.slug, images, catalogs, total: total(x) };
};

const cleanSettings = (doc) => {
  const x = doc?.toObject ? doc.toObject() : { ...doc };
  delete x._id;
  delete x.__v;
  delete x.createdAt;
  delete x.updatedAt;
  return x;
};

async function seedAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const passwordHash = await hashPassword(password);
  if (isMongoReady()) {
    // name и cart — только при создании: этот код идёт на каждом холодном старте
    // и раньше вычищал админу корзину и переименовывал его обратно в «Admin».
    await User.findOneAndUpdate(
      { email },
      { $set: { email, passwordHash, role: "admin" }, $setOnInsert: { name: "Admin", cart: [] } },
      { upsert: true },
    );
    console.log(`Admin user ready: ${email}`);
    return;
  }

  const existing = [...memoryUsers.values()].find((u) => u.email === email);
  if (!existing) {
    const id = randomUUID();
    memoryUsers.set(id, { id, email, passwordHash, name: "Admin", role: "admin", cart: [] });
    console.log(`Admin user ready (memory): ${email}`);
  }
}

function sanitizeCart(items = []) {
  return (items || [])
    .filter((x) => x?.slug && x?.size)
    .map((x) => ({
      key: x.key || `${x.slug}-${x.size}`,
      slug: x.slug,
      size: x.size,
      qty: Math.max(1, Number(x.qty) || 1),
      name: x.name || "",
      price: Number(x.price) || 0,
      image: x.image || "",
    }));
}

async function findUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (isMongoReady()) return User.findOne({ email: normalized });
  return [...memoryUsers.values()].find((u) => u.email === normalized) || null;
}

async function createUser({ name, email, password }) {
  const normalized = String(email || "").trim().toLowerCase();
  const existing = await findUserByEmail(normalized);
  if (existing) throw new Error("Email already registered");

  const passwordHash = await hashPassword(password);
  const role = isAdminEmail(normalized) ? "admin" : "user";
  const payload = { email: normalized, passwordHash, name: name?.trim() || normalized.split("@")[0], role, cart: [] };

  if (isMongoReady()) {
    return User.create(payload);
  }

  const id = randomUUID();
  const user = { id, ...payload };
  memoryUsers.set(id, user);
  return user;
}

const mongoConnected = await connectDatabase();
if (mongoConnected) {
  if (!await Setting.countDocuments()) {
    await Setting.create(memorySettings);
  }
  try {
    await Product.syncIndexes();
  } catch (e) {
    console.warn("Text index sync:", e.message);
  }
  console.log(s3Enabled ? "AWS S3 uploads enabled" : "AWS S3 not configured — media stays as URLs/base64");
}
await seedAdminUser();

const all = async () => isMongoReady()
  ? (await Product.find().sort({ createdAt: 1 })).map(clean)
  : memory.map(clean);

const getSettings = async () => {
  let settings = memorySettings;
  if (isMongoReady()) {
    const doc = await Setting.findOne();
    settings = doc ? cleanSettings(doc) : memorySettings;
  }
  return {
    ...settings,
    catalogs: settings.catalogs?.length ? settings.catalogs : defaultCatalogs,
    menu: (settings.menu || memorySettings.menu).map((item) => {
      const link = item.link || "";
      if (!link.includes("?")) return item;
      try {
        const url = new URL(link, "http://localhost");
        const category = url.searchParams.get("category") || url.searchParams.get("catalog");
        if (!category) return item;
        const slugMap = { Outerwear: "outerwear", Bottoms: "bottoms", "T-Shirts": "t-shirts", Tops: "tops", Archive: "archive" };
        const slug = slugMap[category] || category.toLowerCase();
        return { ...item, link: `/catalog/${slug}` };
      } catch {
        return item;
      }
    }),
  };
};

const attachUser = createAuthMiddleware({ User, memoryUsers, isMongoReady });
app.use(attachUser);

app.get("/api/health", (_q, r) => r.json({
  ok: true,
  database: isMongoReady() ? "mongo" : "memory",
  storage: s3Enabled ? "s3" : "local",
}));

app.post("/api/auth/register", async (q, r) => {
  try {
    const { name, email, password } = q.body || {};
    const inputError = validateRegisterInput({ name, email, password });
    if (inputError) return r.status(400).json({ error: inputError });

    const user = await createUser({ name, email, password });
    r.status(201).json({ token: signToken(user), user: cleanUser(user) });
  } catch (error) {
    r.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (q, r) => {
  try {
    const { email, password } = q.body || {};
    const inputError = validateLoginInput({ email, password });
    if (inputError) return r.status(400).json({ error: inputError });

    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return r.status(401).json({ error: "Invalid email or password" });
    }
    r.json({ token: signToken(user), user: cleanUser(user) });
  } catch (error) {
    r.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", requireAuth, (q, r) => {
  r.json({ user: cleanUser(q.user) });
});

app.get("/api/cart", requireAuth, (q, r) => {
  r.json({ items: sanitizeCart(q.user.cart) });
});

app.put("/api/cart", requireAuth, async (q, r) => {
  try {
    const items = sanitizeCart(q.body?.items);
    if (isMongoReady()) {
      q.user.cart = items;
      await q.user.save();
    } else {
      q.user.cart = items;
      memoryUsers.set(q.user.id, q.user);
    }
    r.json({ items });
  } catch (error) {
    r.status(500).json({ error: error.message });
  }
});

app.get("/api/settings", async (_q, r) => {
  r.json(await getSettings());
});

app.post("/api/settings", requireAdmin, async (q, r) => {
  try {
    const payload = await persistSettingsMedia(q.body);
    if (isMongoReady()) {
      await Setting.findOneAndUpdate({}, { $set: payload }, { upsert: true, new: true });
    } else {
      memorySettings = { ...memorySettings, ...payload };
    }
    r.json({ ok: true });
  } catch (error) {
    console.error("Settings save failed:", error.message);
    r.status(500).json({ error: error.message });
  }
});

app.post("/api/upload", requireAdmin, async (q, r) => {
  try {
    if (!s3Enabled) {
      return r.status(503).json({ error: "S3 is not configured" });
    }
    const { dataUrl, folder = "uploads" } = q.body || {};
    if (!dataUrl?.startsWith("data:")) {
      return r.status(400).json({ error: "dataUrl is required" });
    }
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return r.status(400).json({ error: "Invalid dataUrl" });
    const [, mime, base64] = match;
    const url = await uploadBuffer(Buffer.from(base64, "base64"), mime, folder);
    r.json({ url });
  } catch (error) {
    console.error("Upload failed:", error.message);
    r.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-url", requireAdmin, async (q, r) => {
  try {
    if (!s3Enabled) {
      return r.status(503).json({ error: "S3 is not configured" });
    }
    const { contentType, folder = "uploads" } = q.body || {};
    if (!contentType) return r.status(400).json({ error: "contentType is required" });
    r.json(await presignUpload(contentType, folder));
  } catch (error) {
    console.error("Presign failed:", error.message);
    r.status(500).json({ error: error.message });
  }
});

app.get("/api/products/search", async (q, r) => {
  try {
    const items = await searchProducts({
      products: await all(),
      Product,
      query: q.query.q,
      clean,
      isMongoReady,
      limit: 12,
    });
    r.json(items);
  } catch (error) {
    console.error("Search failed:", error.message);
    r.status(500).json({ error: error.message });
  }
});

app.get("/api/products", async (_q, r) => r.json(await all()));

app.get("/api/products/:slug", async (q, r) => {
  const p = isMongoReady()
    ? await Product.findOne({ slug: q.params.slug })
    : memory.find(x => x.slug === q.params.slug);
  p ? r.json(clean(p)) : r.status(404).json({ error: "Not found" });
});

app.post("/api/products", requireAdmin, async (q, r) => {
  try {
    const raw = await persistProductMedia(q.body);
    const payload = sanitizeProductInput(raw);
    if (!payload.slug) return r.status(400).json({ error: "slug обязателен" });
    const taken = isMongoReady()
      ? await Product.exists({ slug: payload.slug })
      : memory.some((x) => x.slug === payload.slug);
    if (taken) return r.status(409).json({ error: "Товар с таким slug уже есть" });
    const p = isMongoReady()
      ? await Product.create(payload)
      : (memory.push(payload), payload);
    r.status(201).json(clean(p));
  } catch (error) {
    console.error("Product create failed:", error.message);
    if (error.code === 11000) return r.status(409).json({ error: "Товар с таким slug уже есть" });
    r.status(500).json({ error: error.message });
  }
});

app.put("/api/products/:slug", requireAdmin, async (q, r) => {
  try {
    const raw = await persistProductMedia(q.body);
    const payload = sanitizeProductInput(raw);
    let p;
    if (isMongoReady()) {
      p = await Product.findOneAndUpdate(
        { slug: q.params.slug },
        { $set: payload },
        { new: true },
      );
      if (!p && payload.slug !== q.params.slug) {
        p = await Product.findOneAndUpdate(
          { slug: payload.slug },
          { $set: payload },
          { new: true },
        );
      }
    } else {
      const i = memory.findIndex((x) => x.slug === q.params.slug || x.slug === payload.slug);
      if (i >= 0) memory[i] = payload;
      else memory.push(payload);
      p = payload;
    }
    if (!p) return r.status(404).json({ error: "Not found" });
    r.json(clean(p));
  } catch (error) {
    console.error("Product update failed:", error.message);
    if (error.code === 11000) return r.status(409).json({ error: "Товар с таким slug уже есть" });
    r.status(500).json({ error: error.message });
  }
});

app.delete("/api/products/:slug", requireAdmin, async (q, r) => {
  if (isMongoReady()) await Product.deleteOne({ slug: q.params.slug });
  else memory = memory.filter(x => x.slug !== q.params.slug);
  r.json({ ok: true });
});

app.post("/api/checkout", async (q, r) => {
  try {
    if (isMongoConfigured()) await ensureDatabase();
    const products = await all();
    const rawItems = q.body.items || [];
    // Цену и название берём только из каталога: раньше при неизвестном slug
    // подставлялись значения из тела запроса, и сумму заказа мог назначить кто угодно.
    const items = rawItems.map((i) => {
      const p = products.find((x) => x.slug === i.slug);
      if (!p) return null;
      return {
        slug: p.slug,
        name: p.name,
        size: i.size || "",
        qty: Math.max(1, Number(i.qty || i.quantity) || 1),
        price: Number(p.price) || 0,
        image: p.image || "",
      };
    }).filter(Boolean);
    if (!items.length) return r.status(400).json({ error: "В корзине нет доступных товаров" });
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderId = `LP-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      orderId,
      items,
      total,
      status: "awaiting_payment",
      userEmail: q.user?.email || q.body.email || "",
    };

    if (isMongoReady()) await Order.create(payload);
    else memoryOrders.set(orderId, payload);

    const bot = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
    r.json({
      status: "awaiting_payment",
      orderId,
      total,
      telegramUrl: bot ? `https://t.me/${bot}?start=${orderId}` : null,
    });
  } catch (error) {
    console.error("Checkout failed:", error.message);
    r.status(500).json({ error: error.message });
  }
});

app.post("/api/telegram/webhook", async (q, r) => {
  try {
    // Cold starts / dropped pools on Vercel: re-open Mongo before order lookups.
    // Never fall back to empty in-memory orders when MONGO_URI is configured —
    // that caused "order shown on /start, then Не нашёл активный заказ" on the next message.
    if (isMongoConfigured()) {
      const ready = await ensureDatabase();
      if (!ready) {
        console.error("Telegram webhook: MongoDB unavailable");
        r.status(200).json({ ok: true });
        return;
      }
    }

    const findOrder = async (orderId) => {
      if (!orderId) return null;
      if (isMongoReady()) return Order.findOne({ orderId }).lean();
      if (isMongoConfigured()) return null;
      return memoryOrders.get(orderId) || null;
    };
    const findOrderByChat = async (chatId) => {
      const id = String(chatId || "");
      if (!id) return null;
      if (isMongoReady()) {
        const asNumber = Number(id);
        const chatIds = Number.isFinite(asNumber) && String(asNumber) === id
          ? [id, asNumber]
          : [id];
        return Order.findOne({ telegramChatId: { $in: chatIds } })
          .sort({ updatedAt: -1 })
          .lean();
      }
      if (isMongoConfigured()) return null;
      return [...memoryOrders.values()]
        .filter((order) => String(order.telegramChatId) === id)
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;
    };
    const updateOrder = async (orderId, patch) => {
      if (!orderId) return null;
      if (isMongoReady()) {
        return Order.findOneAndUpdate(
          { orderId },
          { $set: patch },
          { new: true },
        ).lean();
      }
      if (isMongoConfigured()) return null;
      const current = memoryOrders.get(orderId);
      if (!current) return null;
      const next = { ...current, ...patch, updatedAt: new Date() };
      memoryOrders.set(orderId, next);
      return next;
    };
    await handleTelegramUpdate(q.body || {}, {
      findOrder,
      findOrderByChat,
      updateOrder,
    });
    r.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook failed:", error.message);
    r.status(200).json({ ok: true });
  }
});

app.get("/api/telegram/status", (_q, r) => {
  r.json({
    enabled: telegramEnabled,
    bot: process.env.TELEGRAM_BOT_USERNAME || null,
    ordersChat: Boolean(process.env.TELEGRAM_ORDERS_CHAT_ID),
  });
});

app.get("/api/telegram/diagnostics", async (_q, r) => {
  try {
    r.setHeader("Cache-Control", "no-store");
    r.json(await getTelegramDiagnostics());
  } catch (error) {
    console.error("Telegram diagnostics failed:", error.message);
    r.status(500).json({ error: "Telegram diagnostics failed" });
  }
});

app.post("/api/telegram/setup-webhook", requireAdmin, async (_q, r) => {
  try {
    const explicitUrl = String(process.env.TELEGRAM_WEBHOOK_URL || "").trim();
    const vercelDomain = String(
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      "back-lipovoy.vercel.app",
    ).trim();
    const baseUrl = explicitUrl
      ? explicitUrl.replace(/\/api\/telegram\/webhook\/?$/, "")
      : `${vercelDomain.startsWith("http") ? "" : "https://"}${vercelDomain}`.replace(/\/$/, "");
    const webhookUrl = explicitUrl || `${baseUrl}/api/telegram/webhook`;

    r.setHeader("Cache-Control", "no-store");
    r.json(await setTelegramWebhook(webhookUrl));
  } catch (error) {
    console.error("Telegram webhook setup failed:", error.message);
    r.status(500).json({ error: error.message });
  }
});

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Streetwear API listening on http://localhost:${port}`);
    console.log(`Database: ${isMongoReady() ? "MongoDB" : "memory"}`);
    console.log(`Storage: ${s3Enabled ? "AWS S3" : "not configured"}`);
    console.log(`Telegram bot: ${telegramEnabled ? "enabled" : "not configured"}`);
  });
}
