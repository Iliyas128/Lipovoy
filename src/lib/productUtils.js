export const SIZE_KEYS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export const CATEGORY_LABELS = {
  All: "Все",
  Outerwear: "Верхняя одежда",
  Bottoms: "Брюки",
  "T-Shirts": "Футболки",
  "T-SHIRT": "Футболки",
  Tops: "Верх",
  Archive: "Архив",
};

export function categoryLabel(c) {
  return CATEGORY_LABELS[c] || c;
}

export function productImages(p) {
  if (p?.images?.length) return p.images.filter(Boolean);
  return [p?.image, p?.image2].filter(Boolean);
}

export function sizeStock(p, size) {
  const entry = p?.sizeData?.[size];
  if (entry && typeof entry === "object") return Number(entry.stock || 0);
  return Number(p?.sizes?.[size] || 0);
}

export function sizeMeasure(p, size) {
  if (p?.sizeMeasures?.[size]) return p.sizeMeasures[size];
  if (p?.sizeData?.[size]?.measure) return p.sizeData[size].measure;
  return "";
}

export function productTotal(p) {
  if (typeof p?.total === "number") return p.total;
  return SIZE_KEYS.reduce((n, s) => n + sizeStock(p, s), 0);
}

export function firstAvailable(p) {
  return SIZE_KEYS.find((s) => sizeStock(p, s) > 0) || "M";
}

export function hoverImage(p) {
  const imgs = productImages(p);
  return imgs[1] || imgs[0] || "";
}

export function money(n) {
  return new Intl.NumberFormat("ru-RU").format(n || 0) + " ₽";
}
