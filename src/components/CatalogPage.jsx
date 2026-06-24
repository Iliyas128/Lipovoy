import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight, SlidersHorizontal, X } from "lucide-react";
import {
  catalogLabel,
  catalogLink,
  countCatalogProducts,
  productInCatalog,
  resolveCatalogParam,
} from "../lib/catalogUtils";
import { productImages, productTotal, hoverImage, money } from "../lib/productUtils";

function Card({ p }) {
  const hover = hoverImage(p);
  return (
    <div className="card" data-aos="fade-up">
      <Link className="photo" to={`/product/${p.slug}`}>
        <img src={productImages(p)[0]} alt={p.name} className="img-main" loading="lazy" />
        {hover && productImages(p)[0] !== hover && (
          <img src={hover} alt={p.name} className="img-hover" loading="lazy" />
        )}
        {p.badge && <em>{p.badge}</em>}
      </Link>
      <div className="meta">
        <small className="vendor">Липовой</small>
        <h3><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
        <div className="priceLine"><b>{money(p.price)}</b></div>
      </div>
    </div>
  );
}

const SORT_LABELS = {
  featured: "По умолчанию",
  "price-asc": "Цена: по возрастанию",
  "price-desc": "Цена: по убыванию",
  name: "По названию",
};

export default function CatalogPage({ products, settings }) {
  const { catalogSlug: routeSlug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const catalogs = settings?.catalogs || [];

  const activeCatalog = resolveCatalogParam(
    routeSlug || params.get("catalog") || params.get("category") || "",
  );

  const [inStockOnly, setInStockOnly] = useState(false);
  const [outStockOnly, setOutStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(() => Math.max(...products.map((p) => p.price || 0), 50000));
  const [sort, setSort] = useState("featured");
  const [cols, setCols] = useState(4);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", filterOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [filterOpen]);

  const priceMax = useMemo(() => Math.max(...products.map((p) => p.price || 0), 50000), [products]);
  const pageTitle = activeCatalog ? catalogLabel(catalogs, activeCatalog) : "Все товары";

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCatalog) list = list.filter((p) => productInCatalog(p, activeCatalog));
    if (inStockOnly) list = list.filter((p) => productTotal(p) > 0);
    if (outStockOnly) list = list.filter((p) => productTotal(p) === 0);
    list = list.filter((p) => (p.price || 0) <= maxPrice);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return list;
  }, [products, activeCatalog, inStockOnly, outStockOnly, maxPrice, sort]);

  const inStockCount = products.filter((p) => productTotal(p) > 0).length;
  const outStockCount = products.length - inStockCount;

  function openCatalog(slug) {
    navigate(slug ? catalogLink(slug) : "/catalog");
  }

  return (
    <main className="catalogPage" data-aos="fade-in">
      <div className="catalogPageHead">
        <div>
          <h1>{pageTitle}</h1>
          {activeCatalog && (
            <p className="catalogPageSub">
              {filtered.length} {filtered.length === 1 ? "товар" : filtered.length < 5 ? "товара" : "товаров"} в каталоге
            </p>
          )}
        </div>
        <button type="button" className="catalogFilterBtn" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={18} />
          Фильтр и сортировка
        </button>
      </div>

      <div className="catalogLayout">
        <aside className="catalogSidebar catalogSidebar--desktop">
          <div className="filterBlock">
            <b>Каталоги</b>
            <button type="button" className={!activeCatalog ? "on" : ""} onClick={() => openCatalog("")}>
              Все товары ({products.length})
            </button>
            {catalogs.map((c) => (
              <button
                key={c.id || c.slug}
                type="button"
                className={activeCatalog === c.slug ? "on" : ""}
                onClick={() => openCatalog(c.slug)}
              >
                {c.name} ({countCatalogProducts(products, c.slug)})
              </button>
            ))}
          </div>
          <div className="filterBlock">
            <div className="filterHead">
              <b>Наличие</b>
              <button type="button" onClick={() => { setInStockOnly(false); setOutStockOnly(false); }}>Сброс</button>
            </div>
            <label><input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} /> В наличии ({inStockCount})</label>
            <label><input type="checkbox" checked={outStockOnly} onChange={(e) => setOutStockOnly(e.target.checked)} /> Нет в наличии ({outStockCount})</label>
          </div>
          <div className="filterBlock">
            <div className="filterHead">
              <b>Цена</b>
              <button type="button" onClick={() => setMaxPrice(priceMax)}>Сброс</button>
            </div>
            <p className="priceRange">Цена: 0 – {money(maxPrice).replace(" ₽", "")} ₽</p>
            <input type="range" min="0" max={priceMax} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
          </div>
        </aside>

        <section className="catalogMain">
          <div className="catalogToolbar">
            <select className="catalogSortDesktop" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Сортировка: {SORT_LABELS.featured}</option>
              <option value="price-asc">Сортировка: {SORT_LABELS["price-asc"]}</option>
              <option value="price-desc">Сортировка: {SORT_LABELS["price-desc"]}</option>
              <option value="name">Сортировка: {SORT_LABELS.name}</option>
            </select>
            <span>{filtered.length} товаров</span>
            <div className="colToggle">
              {[2, 3, 4].map((n) => (
                <button key={n} type="button" className={cols === n ? "on" : ""} onClick={() => setCols(n)}>{n}</button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="catalogEmpty">
              <p>В этом каталоге пока нет товаров.</p>
              <button type="button" onClick={() => openCatalog("")}>Смотреть все товары</button>
            </div>
          ) : (
            <div className="grid catalogGrid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} data-aos="fade-up">
              {filtered.map((p) => <Card p={p} key={p.slug} />)}
            </div>
          )}
        </section>
      </div>

      <aside className={`catalogFilterDrawer ${filterOpen ? "open" : ""}`} aria-hidden={!filterOpen}>
        <div className="catalogFilterDrawerHead">
          <div>
            <h2>Фильтр и сортировка</h2>
            <p>{filtered.length} товаров</p>
          </div>
          <button type="button" onClick={() => setFilterOpen(false)} aria-label="Закрыть фильтр"><X size={22} /></button>
        </div>
        <div className="catalogFilterDrawerBody">
          <div className="catalogFilterGroup">
            <button type="button" className="catalogFilterRow" onClick={() => setExpanded(expanded === "catalogs" ? null : "catalogs")}>
              <span>Каталоги</span>
              <ChevronRight size={18} className={expanded === "catalogs" ? "open" : ""} />
            </button>
            {expanded === "catalogs" && (
              <div className="catalogFilterPanel">
                <button type="button" className={!activeCatalog ? "on" : ""} onClick={() => openCatalog("")}>Все товары</button>
                {catalogs.map((c) => (
                  <button
                    key={c.id || c.slug}
                    type="button"
                    className={activeCatalog === c.slug ? "on" : ""}
                    onClick={() => openCatalog(c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="catalogFilterGroup">
            <button type="button" className="catalogFilterRow" onClick={() => setExpanded(expanded === "availability" ? null : "availability")}>
              <span>Наличие</span>
              <ChevronRight size={18} className={expanded === "availability" ? "open" : ""} />
            </button>
            {expanded === "availability" && (
              <div className="catalogFilterPanel">
                <button type="button" className="filterReset" onClick={() => { setInStockOnly(false); setOutStockOnly(false); }}>Сброс</button>
                <label><input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} /> В наличии ({inStockCount})</label>
                <label><input type="checkbox" checked={outStockOnly} onChange={(e) => setOutStockOnly(e.target.checked)} /> Нет в наличии ({outStockCount})</label>
              </div>
            )}
          </div>

          <div className="catalogFilterGroup">
            <button type="button" className="catalogFilterRow" onClick={() => setExpanded(expanded === "price" ? null : "price")}>
              <span>Цена</span>
              <ChevronRight size={18} className={expanded === "price" ? "open" : ""} />
            </button>
            {expanded === "price" && (
              <div className="catalogFilterPanel">
                <button type="button" className="filterReset" onClick={() => setMaxPrice(priceMax)}>Сброс</button>
                <p className="priceRange">Цена: 0 – {money(maxPrice).replace(" ₽", "")} ₽</p>
                <input type="range" min="0" max={priceMax} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
              </div>
            )}
          </div>

          <div className="catalogFilterGroup catalogFilterGroup--sort">
            <div className="catalogFilterRow catalogFilterRow--static">
              <span>Сортировка</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">{SORT_LABELS.featured}</option>
                <option value="price-asc">{SORT_LABELS["price-asc"]}</option>
                <option value="price-desc">{SORT_LABELS["price-desc"]}</option>
                <option value="name">{SORT_LABELS.name}</option>
              </select>
            </div>
          </div>
        </div>
        <button type="button" className="catalogFilterApply" onClick={() => setFilterOpen(false)}>ПРИМЕНИТЬ</button>
      </aside>
      <button
        type="button"
        className={`shade catalogFilterShade ${filterOpen ? "open" : ""}`}
        onClick={() => setFilterOpen(false)}
        aria-label="Закрыть фильтр"
      />
    </main>
  );
}
