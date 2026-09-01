// Разовый скрипт: удаляет из боевой базы 16 демо-товаров, которые раньше засевались при старте.
// Работает по точному списку slug — ваши товары не трогает. Бэкап всех товаров уже снят, путь в чате.
// После запуска файл можно удалить: rm cleanup-demo.mjs
import "dotenv/config";
import mongoose from "mongoose";

const SLUGS = [
  "jacket-core", "pants-wide", "shorts-utility", "tee-black-over",
  "tee-lg-white", "tee-lg-black", "cap-washed", "polo-a1",
  "hoodie-heavy-black", "jorts-carpenter-blue", "jersey-pharos", "balloon-jeans-black",
  "sweatpants-orbit", "tank-shadow", "shirt-boxy-cream", "denim-thunder-wash",
];

await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME || "lipovoy",
  family: 4,
});

const products = mongoose.connection.collection("products");

const before = await products.countDocuments();
const targets = await products.find({ slug: { $in: SLUGS } }).project({ slug: 1 }).toArray();
console.log(`в базе: ${before} товаров, из них демо: ${targets.length}`);

if (!targets.length) {
  console.log("удалять нечего");
} else {
  const res = await products.deleteMany({ slug: { $in: SLUGS } });
  console.log(`удалено: ${res.deletedCount}`);
}

const rest = await products.find({}).project({ slug: 1, name: 1 }).toArray();
console.log(`осталось: ${rest.length}`);
for (const p of rest) console.log(`  ${p.slug} — ${p.name}`);

await mongoose.disconnect();
