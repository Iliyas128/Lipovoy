const LEGACY_CATEGORY_MAP = {
  Outerwear: "outerwear",
  Bottoms: "bottoms",
  "T-Shirts": "t-shirts",
  "T-SHIRT": "t-shirts",
  Tops: "tops",
  Archive: "archive",
};

const RU_MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

export const DEFAULT_CATALOGS = [
  { id: "outerwear", name: "Верхняя одежда", slug: "outerwear" },
  { id: "bottoms", name: "Брюки", slug: "bottoms" },
  { id: "t-shirts", name: "Футболки", slug: "t-shirts" },
  { id: "tops", name: "Верх", slug: "tops" },
  { id: "archive", name: "Архив", slug: "archive" },
];

export function slugifyCatalog(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => RU_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function catalogLink(slug) {
  return slug ? `/catalog/${slug}` : "/catalog";
}

export function resolveCatalogParam(value) {
  if (!value || value === "All") return "";
  return LEGACY_CATEGORY_MAP[value] || value;
}

export function productCatalogSlugs(product) {
  const list = Array.isArray(product?.catalogs) ? product.catalogs.filter(Boolean) : [];
  if (list.length) return list;
  const legacy = LEGACY_CATEGORY_MAP[product?.category];
  return legacy ? [legacy] : [];
}

export function productInCatalog(product, catalogSlug) {
  if (!catalogSlug || catalogSlug === "all") return true;
  const slug = resolveCatalogParam(catalogSlug);
  return productCatalogSlugs(product).includes(slug);
}

export function findCatalog(catalogs = [], slug) {
  const normalized = resolveCatalogParam(slug);
  return catalogs.find((c) => c.slug === normalized) || null;
}

export function catalogLabel(catalogs = [], slug) {
  const item = findCatalog(catalogs, slug);
  return item?.name || slug || "Все товары";
}

export function countCatalogProducts(products = [], slug) {
  return products.filter((p) => productInCatalog(p, slug)).length;
}

export function ensureCatalogId(catalog) {
  return catalog.id || catalog.slug || slugifyCatalog(catalog.name);
}

/** Преобразует старые ссылки /catalog?category=Outerwear → /catalog/outerwear */
export function normalizeMenuLink(link) {
  if (!link || typeof link !== "string") return link;
  const trimmed = link.trim();
  if (!trimmed.includes("?")) return trimmed;

  try {
    const url = new URL(trimmed, "http://localhost");
    const category = url.searchParams.get("category") || url.searchParams.get("catalog");
    if (category) return catalogLink(resolveCatalogParam(category));
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function normalizeMenu(menu = []) {
  const seen = new Set();
  return menu
    .map((item) => ({ ...item, link: normalizeMenuLink(item.link) }))
    .filter((item) => {
      const key = item.link?.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function cleanCatalogForSave(catalog) {
  const { _edit, slugManual, ...rest } = catalog;
  const slug = slugifyCatalog(rest.slug || rest.name);
  return { ...rest, id: rest.id || slug, slug, name: String(rest.name || "").trim() };
}

export function syncMenuForCatalog(menu = [], catalog, oldSlug) {
  const link = catalogLink(catalog.slug);
  const oldLink = oldSlug ? catalogLink(oldSlug) : null;
  let found = false;
  const next = menu.map((item) => {
    if (oldLink && item.link === oldLink) {
      found = true;
      return { label: catalog.name.toUpperCase(), link };
    }
    if (item.link === link) {
      found = true;
      return { ...item, label: catalog.name.toUpperCase(), link };
    }
    return item;
  });
  if (!found) next.push({ label: catalog.name.toUpperCase(), link });
  return normalizeMenu(next);
}

export function removeCatalogFromMenu(menu = [], slug) {
  const link = catalogLink(slug);
  return menu.filter((item) => item.link !== link);
}
