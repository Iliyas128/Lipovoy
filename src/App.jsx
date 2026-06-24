import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useParams, useLocation, Navigate } from "react-router-dom";
import { Menu, Minus, Plus, Save, ShoppingBag, Trash2, Truck, UserRound, X, ImagePlus, List, Video, LogOut, FolderOpen } from "lucide-react";
import { useLenis } from "./hooks/useLenis";
import Preloader from "./components/Preloader";
import HeaderSearch from "./components/HeaderSearch";
import ConfirmModal from "./components/ConfirmModal";
import AdminRoute from "./components/AdminRoute";
import AuthPage from "./pages/AuthPage";
import { AuthProvider, useAuth, loadGuestCart, saveGuestCart, clearGuestCart } from "./context/AuthContext";
import { apiFetch, apiUrl } from "./lib/api";
import { validateMenuItems, validateProduct, validateVideoFile, validateCatalogs } from "./lib/validation";
import { DEFAULT_CATALOGS, catalogLink, countCatalogProducts, slugifyCatalog, productInCatalog, productCatalogSlugs, normalizeMenu, cleanCatalogForSave, syncMenuForCatalog, removeCatalogFromMenu } from "./lib/catalogUtils";
import AOS from "aos";
import "aos/dist/aos.css";

import CatalogPage from "./components/CatalogPage";
import { TestimonialsSection } from "./components/testimonials-section";
import { SIZE_KEYS, productImages, hoverImage, sizeStock, sizeMeasure, firstAvailable, productTotal, money } from "./lib/productUtils";

const sizes = SIZE_KEYS;
const baseSizes = { S: 8, M: 16, L: 18, XL: 12, "2XL": 4, "3XL": 0, "4XL": 0 };
const fallback = [
  { slug: "jacket-core", name: "Куртка", category: "Outerwear", price: 42900, badge: "Drop 01", description: "Плотная уличная куртка с чистым силуэтом.", details: "Матовая плащевая ткань, свободная посадка.", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes, sizeMeasures: { M: "11", L: "22", XL: "26", "2XL": "22", "3XL": "4", "4XL": "9" } },
  { slug: "pants-wide", name: "Штаны", category: "Bottoms", price: 28900, badge: "Best", description: "Широкие брюки с мягким падением ткани.", details: "Плотный хлопок, глубокие карманы.", image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes, sizeMeasures: { S: "38", M: "30", L: "62", XL: "53", "2XL": "60", "3XL": "23" } },
  { slug: "shorts-utility", name: "Шорты", category: "Archive", price: 16900, badge: "Archive", description: "Архивные широкие шорты.", details: "Washed-эффект и утилитарные карманы.", image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "tee-black-over", name: "Футболка Черная Овер", category: "T-Shirts", price: 14900, badge: "Essential", description: "Базовая черная футболка.", details: "Оверсайз крой, тональная вышивка.", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "tee-lg-white", name: "Футболка LG белая", category: "T-Shirts", price: 14900, badge: "Clean", description: "Белая футболка с плотным воротом.", details: "Тяжелый хлопок 240 gsm.", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes, sizeMeasures: { S: "23", M: "45", L: "39", XL: "38", "2XL": "55", "3XL": "18" } },
  { slug: "tee-lg-black", name: "Футболка LG черная", category: "T-Shirts", price: 14900, badge: "Essential", description: "Базовая черная футболка.", details: "Оверсайз крой, тональная вышивка.", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes, sizeMeasures: { S: "23", M: "41", L: "40", XL: "41" } },
  { slug: "cap-washed", name: "Бейсболка", category: "Archive", price: 9900, badge: "Mock", description: "Кепка с мягкой винтажной стиркой.", details: "Хлопок, регулируемая застежка.", image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "polo-a1", name: "Поло А1", category: "Tops", price: 17900, badge: "New", description: "Поло с трикотажной фактурой.", details: "Мягкий трикотаж, плотная посадка плеча.", image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes, sizeMeasures: { M: "18", L: "30", XL: "40", "2XL": "18", "3XL": "7" } },
  { slug: "hoodie-heavy-black", name: "Худи Heavy Black", category: "Outerwear", price: 24900, badge: "New", description: "Массивное худи с плотным капюшоном.", details: "Тяжелый футер 500 gsm.", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "jorts-carpenter-blue", name: "Шорты Carpenter Blue", category: "Bottoms", price: 19900, badge: "Trend", description: "Джинсовые шорты в стиле workwear.", details: "Плотный деним, винтажная стирка.", image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "jersey-pharos", name: "Джерси Pharos", category: "Tops", price: 15900, badge: "Mock", description: "Легкое джерси с уличной графикой.", details: "Дышащая сетка, свободная посадка.", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "balloon-jeans-black", name: "Джинсы Balloon Black", category: "Bottoms", price: 27900, badge: "Mock", description: "Объемные джинсы с низкой посадкой.", details: "Плотный деним, широкий силуэт.", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "sweatpants-orbit", name: "Штаны Orbit", category: "Bottoms", price: 22900, badge: "Mock", description: "Спортивные штаны с объемным низом.", details: "Мягкий футер, регулируемый пояс.", image: "https://images.unsplash.com/photo-1506629905607-d9d297d48b50?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "tank-shadow", name: "Майка Shadow", category: "Tops", price: 11900, badge: "Mock", description: "Минималистичная майка под широкие джинсы и шорты.", details: "Плотный хлопок, глубокая пройма.", image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "shirt-boxy-cream", name: "Рубашка Boxy Cream", category: "Tops", price: 21900, badge: "Mock", description: "Бокси-рубашка с плотной посадкой.", details: "Смесовый хлопок, матовые пуговицы.", image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes },
  { slug: "denim-thunder-wash", name: "Джинсы Thunder Wash", category: "Bottoms", price: 29900, badge: "Mock", description: "Широкий деним с выраженной стиркой.", details: "100% хлопок, вареный эффект.", image: "https://images.unsplash.com/photo-1511196044526-5cb3bcb7071b?auto=format&fit=crop&w=1400&q=88", sizes: baseSizes }
];
const blank = {
  slug: "", name: "", category: "", catalogs: [], price: 0, color: "Black", accent: "#111", badge: "",
  isHit: false, isNewArrival: false,
  description: "", details: "", image: "", image2: "", images: [],
  sizeMeasures: { S: "", M: "", L: "", XL: "", "2XL": "", "3XL": "", "4XL": "" },
  sizes: { S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0, "4XL": 0 },
};
function Header({ count, open, solid, hidden, onMenuClick, user, onLogoutRequest, searchOpen, onSearchOpenChange, products }) {
  return (
    <header className={`${solid ? "solid" : ""} ${hidden ? "header-hidden" : ""}`}>
      <div className="headerLeft">
        <button aria-label="Меню" onClick={onMenuClick}><Menu /></button>
        <HeaderSearch open={searchOpen} onOpenChange={onSearchOpenChange} products={products} />
      </div>
      <Link className="logo" to="/"><img src="/Lypovoi.svg" alt="Липовой" /></Link>
      <div className="headerRight">
        {user ? (
          <div className="headerAccount">
            <span className="headerAccountName" title={user.email}>{user.name}</span>
            <button type="button" className="userLink" onClick={onLogoutRequest} aria-label="Выйти"><LogOut size={20} /></button>
          </div>
        ) : (
          <Link to="/login" className="userLink" aria-label="Войти"><UserRound /></Link>
        )}
        <button className="bag" onClick={open} aria-label="Корзина">
          <ShoppingBag />{count > 0 && <span>{count}</span>}
        </button>
      </div>
    </header>
  );
}

function Card({ p }) {
  const imgs = productImages(p);
  const hover = hoverImage(p);
  return (
    <div className="card" data-aos="fade-up">
      <Link className="photo" to={`/product/${p.slug}`}>
        <img src={imgs[0]} alt={p.name} className="img-main" loading="lazy" />
        {hover && imgs[0] !== hover && <img src={hover} alt={p.name} className="img-hover" loading="lazy" />}
        {p.badge && <em>{p.badge}</em>}
      </Link>
      <div className="meta">
        <h3><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
        <div className="priceLine">
          <b>{money(p.price)}</b>
          {productTotal(p) === 0 && <span className="soldOutText">Распродано</span>}
        </div>
      </div>
    </div>
  );
}

function Home({ products, add, onIntroComplete, settings, hasSeenIntro }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const catParam = searchParams.get("category");
  const taggedHits = products.filter((p) => p.isHit);
  const hits = (taggedHits.length ? taggedHits : products).slice(0, 8);
  const taggedNew = products.filter((p) => p.isNewArrival);
  const newest = (taggedNew.length ? taggedNew : products).slice(0, 12);

  useEffect(() => {
    if (catParam) {
      const el = document.getElementById("catalog");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [catParam]);

  return (
    <>
      {!hasSeenIntro && <Preloader onComplete={onIntroComplete} />}
      <main id="main">
        <section className="hero">
          <div className="heroMedia">
            <Link to="/catalog" className="heroSlideLink">
              <picture>
                <source media="(max-width: 768px)" srcSet="/MainHeroMobile.jpg" />
                <img src="/MainHero.jpg" alt="Липовой" loading="eager" fetchPriority="high" />
              </picture>
            </Link>
          </div>
          <div className="heroVeil" />
          <div className="heroContent">
            <p className="heroEyebrow">УЛИЦЫ ВАЖНЕЕ СТАДИОНОВ</p>
            <h2>Улица научила драться. Улица сделала нас.</h2>
            <Link to="/catalog" className="shopBtn">СМОТРЕТЬ КОЛЛЕКЦИЮ</Link>
          </div>
        </section>

        <div className="marquee border-y">
          <div>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i}>УЛИЦЫ ВАЖНЕЕ СТАДИОНОВ &nbsp;&nbsp;&nbsp;&nbsp; УЖЕ В ПРОДАЖЕ &nbsp;&nbsp;&nbsp;&nbsp;</span>
            ))}
          </div>
        </div>

        <section id="catalog" className="catalog" data-aos="fade-up">
          <div className="title">
            <h2>ХИТЫ ПРОДАЖ</h2>
          </div>
          <div className="grid newestGrid hitsGrid">
            {hits.map((p) => <Card p={p} key={p.slug} />)}
          </div>
        </section>

        <section className="aboutBlock" data-aos="fade-up">
          <video className="aboutVideo" src="/gtaBack.mp4" autoPlay muted loop playsInline aria-hidden="true" />
          <div className="aboutVeil" aria-hidden="true" />
          <div className="aboutWrapper">
            <div className="aboutLeft">
              <span className="aboutNum">001/</span>
              <div className="aboutTitleWrapper">
                <h2 className="aboutTitle">
                  <span className="aboutTitleLine--1">КОНЦЕПЦИЯ</span>
                  <span className="aboutTitleLine--2">И ИДЕОЛОГИЯ</span>
                </h2>
                <div className="aboutStarRow" aria-hidden="true">
                  <div className="aboutStarLine" />
                  <img src="/BlackStar.png" className="aboutStar" alt="" />
                  <div className="aboutStarLine" />
                </div>
              </div>
            </div>
            <div className="aboutRight">
              <h3>Создаем одежду, которая помогает выглядеть сильнее.</h3>
              <p>Не набор красивых шмоток, а подача: с точным кроем, правильным настроением и ощущением уровня, которое считывается с первого взгляда. Мы берем уличный дух и возводим его в абсолют.</p>
              <div className="aboutStats">
                <div className="stat">
                  <b>100%</b>
                  <span>Собственное производство</span>
                </div>
                <div className="stat">
                  <b>360°</b>
                  <span>Контроль каждой детали</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="newestBlock" data-aos="fade-up">
          <div className="title">
            <h2>НОВИНКИ</h2>
          </div>
          <div className="grid newestGrid">
            {newest.map((p) => <Card p={p} key={p.slug} />)}
          </div>
          <Link to="/catalog" className="viewAllBtn">СМОТРЕТЬ ВСЕ</Link>
        </section>

        <section className="reviewsBlock" data-aos="fade-up">
          <TestimonialsSection reviewVideos={settings?.reviewVideos || []} />
        </section>
      </main>
    </>
  );
}

function Product({ products, add }) {
  const { slug } = useParams();
  const p = products.find((x) => x.slug === slug);
  const imgs = p ? productImages(p) : [];
  const [size, setSize] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  useEffect(() => { if (p) setSize(firstAvailable(p)); }, [p]);
  useEffect(() => { setActiveImg(0); }, [slug]);

  if (!p) {
    return (
      <main className="missing">
        <h1>Товар не найден</h1>
        <Link to="/catalog">В КАТАЛОГ</Link>
      </main>
    );
  }

  return (
    <main className="product">
      <div className="galleryCol">
        <div className="galleryMain" onClick={() => add(p, size)} title="Быстрое добавление">
          <img src={imgs[activeImg] || p.image} alt={p.name} />
        </div>
        {imgs.length > 1 && (
          <div className="thumbRow">
            {imgs.map((img, i) => (
              <button type="button" key={i} className={i === activeImg ? "on" : ""} onClick={() => setActiveImg(i)}>
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
      <aside>
        <div className="breadcrumbs">
          <Link to="/">Главная</Link> / <Link to="/catalog">Каталог</Link> / <span>{p.name}</span>
        </div>
        <h1>{p.name}</h1>
        <strong>{money(p.price)}</strong>
        
        <div className="sizes" style={{ position: 'relative' }}>
          <div className="sizeHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ margin: 0 }}>Размер</p>
            <button className="sizeGuideBtn" onClick={() => setShowSizeGuide(!showSizeGuide)} style={{ background: 'none', border: 'none', textDecoration: 'underline', color: '#999', cursor: 'pointer', fontSize: '14px', padding: 0 }}>Таблица размеров</button>
          </div>
          
          {showSizeGuide && (
            <div className="sizePopupBlock" style={{
              position: 'absolute',
              top: '30px',
              right: '0',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '15px',
              zIndex: 10,
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>Замеры (см)</h4>
                <button onClick={() => setShowSizeGuide(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0 5px', fontSize: '16px' }}>✕</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 4px', borderBottom: '1px solid #333', color: '#888', fontWeight: 'normal' }}>S</th>
                      <th style={{ padding: '8px 4px', borderBottom: '1px solid #333', color: '#888', fontWeight: 'normal' }}>M</th>
                      <th style={{ padding: '8px 4px', borderBottom: '1px solid #333', color: '#888', fontWeight: 'normal' }}>L</th>
                      <th style={{ padding: '8px 4px', borderBottom: '1px solid #333', color: '#888', fontWeight: 'normal' }}>XL</th>
                      <th style={{ padding: '8px 4px', borderBottom: '1px solid #333', color: '#888', fontWeight: 'normal' }}>2XL</th>
                      <th style={{ padding: '8px 4px', borderBottom: '1px solid #333', color: '#888', fontWeight: 'normal' }}>3XL</th>
                      <th style={{ padding: '8px 4px', borderBottom: '1px solid #333', color: '#888', fontWeight: 'normal' }}>4XL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '12px 4px', color: '#ccc' }}>{sizeMeasure(p, "S") || "-"}</td>
                      <td style={{ padding: '12px 4px', color: '#ccc' }}>{sizeMeasure(p, "M") || "-"}</td>
                      <td style={{ padding: '12px 4px', color: '#ccc' }}>{sizeMeasure(p, "L") || "-"}</td>
                      <td style={{ padding: '12px 4px', color: '#ccc' }}>{sizeMeasure(p, "XL") || "-"}</td>
                      <td style={{ padding: '12px 4px', color: '#ccc' }}>{sizeMeasure(p, "2XL") || "-"}</td>
                      <td style={{ padding: '12px 4px', color: '#ccc' }}>{sizeMeasure(p, "3XL") || "-"}</td>
                      <td style={{ padding: '12px 4px', color: '#ccc' }}>{sizeMeasure(p, "4XL") || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="sizeGrid">
            {sizes.map((s) => {
              const stock = sizeStock(p, s);
              const measure = sizeMeasure(p, s);
              return (
                <button
                  className={s === size ? "selected" : ""}
                  disabled={!stock}
                  onClick={() => setSize(s)}
                  key={s}
                >
                  <b>{s}</b>
                  {measure && <small>{measure}</small>}
                </button>
              );
            })}
          </div>
        </div>

        <button className="buy" disabled={!productTotal(p)} onClick={() => add(p, size)}>
          {productTotal(p) ? "В КОРЗИНУ" : "РАСПРОДАНО"}
        </button>

        <div className="prodDesc">
          <p>{p.description}</p>
          <p>{p.details}</p>
        </div>
      </aside>
    </main>
  );
}

function AdminModal({ title, onClose, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="adminModalOverlay" onClick={onClose}>
      <div className={`adminModal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="adminModalHead">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="adminModalBody">{children}</div>
      </div>
    </div>
  );
}

function buildProductPayload(form) {
  const images = (form.images || []).filter(Boolean);
  return {
    slug: String(form.slug || "").trim(),
    name: String(form.name || "").trim(),
    category: String(form.category || "").trim(),
    catalogs: [...new Set((form.catalogs || []).map((s) => String(s).trim()).filter(Boolean))],
    price: Number(form.price) || 0,
    color: form.color || "Black",
    accent: form.accent || "#111",
    badge: form.badge || "",
    isHit: Boolean(form.isHit),
    isNewArrival: Boolean(form.isNewArrival),
    description: form.description || "",
    details: form.details || "",
    image: images[0] || form.image || "",
    image2: images[1] || form.image2 || "",
    images,
    sizeMeasures: form.sizeMeasures || {},
    sizes: form.sizes || {},
  };
}

function AdminProductForm({ productSlug, products, catalogItems, onSaved, onDeleted, onBack, presetCatalogs = [] }) {
  const isNew = !productSlug;
  const existing = products.find((x) => x.slug === productSlug);
  const [form, setForm] = useState(() => {
    if (isNew) return { ...blank, catalogs: [...presetCatalogs], badge: "New" };
    const p = existing || blank;
    const images = p.images?.length ? p.images : [p.image, p.image2].filter(Boolean);
    return {
      ...p,
      images,
      catalogs: productCatalogSlugs(p),
      sizeMeasures: { ...blank.sizeMeasures, ...(p.sizeMeasures || {}) },
    };
  });
  const [msg, setMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [stockEditorOpen, setStockEditorOpen] = useState(false);

  useEffect(() => {
    if (!isNew || !presetCatalogs.length) return;
    setForm((f) => {
      const merged = [...new Set([...(f.catalogs || []), ...presetCatalogs])];
      return merged.length === (f.catalogs || []).length ? f : { ...f, catalogs: merged };
    });
  }, [isNew, presetCatalogs]);

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const stock = (s, v) => setForm((f) => ({ ...f, sizes: { ...f.sizes, [s]: Math.max(0, +v || 0) } }));
  const measure = (s, v) => setForm((f) => ({ ...f, sizeMeasures: { ...f.sizeMeasures, [s]: v } }));

  const addGalleryImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const images = [...(form.images || []), ev.target.result]; setForm((f) => ({ ...f, images, image: images[0] || "", image2: images[1] || "" })); };
    reader.readAsDataURL(file); e.target.value = "";
  };
  const removeGalleryImage = (i) => { const images = (form.images || []).filter((_, idx) => idx !== i); setForm((f) => ({ ...f, images, image: images[0] || "", image2: images[1] || "" })); };
  const toggleCatalog = (cs) => setForm((f) => { const list = f.catalogs || []; return { ...f, catalogs: list.includes(cs) ? list.filter((s) => s !== cs) : [...list, cs] }; });

  async function save(e) {
    e.preventDefault();
    const payload = buildProductPayload(form);
    const errors = validateProduct(payload);
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setMsg("Исправьте ошибки в форме"); return; }
    setMsg("Сохраняю...");
    try {
      const p = await apiFetch(isNew ? "/api/products" : `/api/products/${productSlug}`, { method: isNew ? "POST" : "PUT", body: payload });
      setForm((f) => ({ ...f, catalogs: productCatalogSlugs(p) }));
      setMsg("Сохранено ✓");
      onSaved(p);
    } catch (err) { setMsg("Ошибка: " + err.message); }
  }

  async function del() {
    if (!window.confirm("Удалить товар?")) return;
    await apiFetch(`/api/products/${productSlug}`, { method: "DELETE" });
    onDeleted();
  }

  const selectedCatalogs = form.catalogs || [];
  const total = sizes.reduce((n, s) => n + (+form.sizes?.[s] || 0), 0);
  const hitCount = products.filter((p) => p.isHit && p.slug !== form.slug).length + (form.isHit ? 1 : 0);
  const newCount = products.filter((p) => p.isNewArrival && p.slug !== form.slug).length + (form.isNewArrival ? 1 : 0);
  const hitLimit = 8;
  const newLimit = 12;

  return (
    <div className="adminProductFormWrap">
      <div className="adminFormBack">
        <button type="button" onClick={onBack} className="adminBackBtn">← Назад</button>
        <h2 className="adminFormTitle">{isNew ? "НОВЫЙ ТОВАР" : form.name || "РЕДАКТИРОВАТЬ"}</h2>
      </div>
      <form onSubmit={save}>
        <section className="galleryAdmin">
          <h3>Фото товара</h3>
          {fieldErrors.images && <span className="fieldError">{fieldErrors.images}</span>}
          <div className="galleryAdminGrid">
            {(form.images || []).map((img, i) => (
              <div key={i} className="galleryAdminItem">
                <img src={img} alt="" />
                <button type="button" onClick={() => removeGalleryImage(i)}><Trash2 size={14} /></button>
              </div>
            ))}
            <label className="galleryAdminAdd"><ImagePlus size={28} /><span>Добавить фото</span><input type="file" accept="image/*" onChange={addGalleryImage} style={{ display: "none" }} /></label>
          </div>
        </section>
        <div className="formGrid">
          {[["Название", "name"], ["Slug", "slug"], ["Тип (необязательно)", "category"], ["Цена (₽)", "price"], ["Бейдж (NEW/SALE)", "badge"]].map(([l, k]) => (
            <label key={k} className={fieldErrors[k] ? "inputInvalid" : ""}>{l}
              <input type={k === "price" ? "number" : "text"} min={k === "price" ? "0" : undefined} value={form[k] || ""} onChange={(e) => field(k, k === "price" ? +e.target.value : e.target.value)} />
              {fieldErrors[k] && <span className="fieldError">{fieldErrors[k]}</span>}
            </label>
          ))}
        </div>

        <section className="labelPicker">
          <div className="labelPickerHead">Метки витрины</div>
          <div className="labelPickerRow">
            <button
              type="button"
              className={`labelToggle ${form.isHit ? "on" : ""}`}
              onClick={() => field("isHit", !form.isHit)}
              disabled={!form.isHit && hitCount >= hitLimit}
            >
              <span className="labelToggleDot" />
              <span className="labelToggleText">
                <b>Хит продаж</b>
                <small>Блок «Хиты продаж» на главной</small>
              </span>
            </button>
            <span className={`labelCounter ${hitCount > hitLimit ? "over" : ""}`}>{hitCount}/{hitLimit}</span>
          </div>
          <div className="labelPickerRow">
            <button
              type="button"
              className={`labelToggle ${form.isNewArrival ? "on" : ""}`}
              onClick={() => field("isNewArrival", !form.isNewArrival)}
              disabled={!form.isNewArrival && newCount >= newLimit}
            >
              <span className="labelToggleDot" />
              <span className="labelToggleText">
                <b>Новинка</b>
                <small>Блок «Новинки» на главной</small>
              </span>
            </button>
            <span className={`labelCounter ${newCount > newLimit ? "over" : ""}`}>{newCount}/{newLimit}</span>
          </div>
          {(!form.isHit && hitCount >= hitLimit) && <p className="labelLimitMsg">Достигнут лимит хитов ({hitLimit}). Снимите метку с другого товара.</p>}
          {(!form.isNewArrival && newCount >= newLimit) && <p className="labelLimitMsg">Достигнут лимит новинок ({newLimit}). Снимите метку с другого товара.</p>}
        </section>

        <div className="adminPopupFields">
          <div className="adminPopupField">
            <div className="adminPopupFieldLabel">
              <span>Каталоги</span>
              {selectedCatalogs.length > 0 && <span className="adminPopupFieldCount">{selectedCatalogs.length}</span>}
            </div>
            <button type="button" className="adminPopupFieldBtn" onClick={() => setCatalogPickerOpen(true)}>
              {selectedCatalogs.length === 0
                ? "Не выбрано — нажмите чтобы выбрать"
                : catalogItems.filter((c) => selectedCatalogs.includes(c.slug)).map((c) => c.name).join(", ")}
            </button>
            {fieldErrors.catalogs && <span className="fieldError">{fieldErrors.catalogs}</span>}
          </div>
          <div className="adminPopupField">
            <div className="adminPopupFieldLabel">
              <span>Склад</span>
              <span className="adminPopupFieldCount">{total} шт.</span>
            </div>
            <button type="button" className="adminPopupFieldBtn" onClick={() => setStockEditorOpen(true)}>
              {total === 0 ? "Нет в наличии — нажмите чтобы добавить" : sizes.filter((s) => +form.sizes?.[s] > 0).map((s) => `${s}: ${form.sizes[s]}`).join(" · ")}
            </button>
          </div>
        </div>

        <label>Описание<textarea value={form.description} onChange={(e) => field("description", e.target.value)} /></label>
        <label>Детали<textarea value={form.details} onChange={(e) => field("details", e.target.value)} /></label>
        <div className="actions">
          <button type="submit" className="saveBtn"><Save /> СОХРАНИТЬ</button>
          {!isNew && <button type="button" className="deleteBtn" onClick={del}><Trash2 /> УДАЛИТЬ</button>}
          <span className="msg">{msg}</span>
        </div>
      </form>

      {catalogPickerOpen && (
        <AdminModal title="Выбрать каталоги" onClose={() => setCatalogPickerOpen(false)}>
          <div className="catalogPickerPopup">
            {catalogItems.map((c) => {
              const selected = selectedCatalogs.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  className={`catalogPickerPopupRow ${selected ? "on" : ""}`}
                  onClick={() => toggleCatalog(c.slug)}
                >
                  <span className="catalogPickerCheck">{selected ? "✓" : ""}</span>
                  <span>{c.name}</span>
                  <small>{catalogLink(c.slug)}</small>
                </button>
              );
            })}
          </div>
          <button type="button" className="saveBtn" style={{ marginTop: "16px", width: "100%" }} onClick={() => setCatalogPickerOpen(false)}>
            Готово ({selectedCatalogs.length} выбрано)
          </button>
        </AdminModal>
      )}

      {stockEditorOpen && (
        <AdminModal title="Склад и размеры" onClose={() => setStockEditorOpen(false)} wide>
          <div className="stockEditorGrid">
            {sizes.map((s) => (
              <div key={s} className="stockEditorRow">
                <div className="stockEditorSize">{s}</div>
                <label className="stockEditorField">
                  <span>Остаток</span>
                  <input type="number" min="0" value={form.sizes?.[s] || 0} onChange={(e) => stock(s, e.target.value)} />
                </label>
                <label className="stockEditorField">
                  <span>Замер, см</span>
                  <input type="text" placeholder="—" value={form.sizeMeasures?.[s] || ""} onChange={(e) => measure(s, e.target.value)} />
                </label>
              </div>
            ))}
          </div>
          <div className="stockEditorTotal">Итого: <b>{total} шт.</b></div>
          <button type="button" className="saveBtn" style={{ marginTop: "16px", width: "100%" }} onClick={() => setStockEditorOpen(false)}>Готово</button>
        </AdminModal>
      )}
    </div>
  );
}

function Admin({ products, refresh, settings }) {
  const [section, setSection] = useState("catalogs");
  const [editProduct, setEditProduct] = useState(null);
  const [catalogModal, setCatalogModal] = useState(null);
  const [createCatalogOpen, setCreateCatalogOpen] = useState(false);
  const [newCatalogForm, setNewCatalogForm] = useState({ name: "", slug: "", slugManual: false });
  const [newCatalogErrors, setNewCatalogErrors] = useState({});
  const [attachSearch, setAttachSearch] = useState("");
  const [presetCatalogs, setPresetCatalogs] = useState([]);
  const [msg, setMsg] = useState("");
  const [menuItems, setMenuItems] = useState(() => normalizeMenu(settings?.menu || []));
  const [catalogItems, setCatalogItems] = useState(settings?.catalogs?.length ? settings.catalogs : DEFAULT_CATALOGS);
  const [menuErrors, setMenuErrors] = useState({});
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (settings?.menu) setMenuItems(normalizeMenu(settings.menu));
    if (settings?.catalogs?.length) setCatalogItems(settings.catalogs);
  }, [settings]);

  function openNewProduct(presets = []) {
    setPresetCatalogs(presets);
    setCatalogModal(null);
    setEditProduct("new");
  }

  function handleSaved() {
    setEditProduct(null);
    refresh();
  }

  function handleDeleted() {
    setEditProduct(null);
    refresh();
  }

  const updateMenu = (idx, key, val) => {
    const n = [...menuItems]; n[idx][key] = val; setMenuItems(n);
  };

  const updateCatalog = (idx, key, val) => {
    const next = [...catalogItems];
    const item = { ...next[idx], [key]: val };
    if (key === "name" && !item.slugManual) { item.slug = slugifyCatalog(val); item.id = item.slug || item.id; }
    if (key === "slug") { item.slug = slugifyCatalog(val); item.slugManual = true; item.id = item.slug || item.id; }
    next[idx] = item; setCatalogItems(next);
  };

  const saveCatalogsAndMenu = async (cats, menu, message = "Сохранено ✓") => {
    const cleaned = cats.map(cleanCatalogForSave);
    const errors = validateCatalogs(cleaned);
    if (Object.keys(errors).length) { setMsg("Исправьте ошибки в каталогах"); return false; }
    const normalizedMenu = normalizeMenu(menu);
    setMsg("Сохраняю...");
    await apiFetch("/api/settings", { method: "POST", body: { catalogs: cleaned, menu: normalizedMenu } });
    setCatalogItems(cleaned);
    setMenuItems(normalizedMenu);
    setMsg(message);
    refresh();
    return true;
  };

  const submitNewCatalog = async () => {
    const slug = slugifyCatalog(newCatalogForm.slug || newCatalogForm.name);
    const cat = { id: slug, name: newCatalogForm.name.trim(), slug };
    const errors = validateCatalogs([...catalogItems.map(cleanCatalogForSave), cat]);
    const formErrors = {};
    if (!cat.name) formErrors.name = "Введите название";
    if (!slug) formErrors.slug = "Введите slug";
    if (errors[catalogItems.length]?.slug) formErrors.slug = "Такой slug уже есть";
    setNewCatalogErrors(formErrors);
    if (Object.keys(formErrors).length) return;

    const updatedCats = [...catalogItems.map(cleanCatalogForSave), cat];
    const updatedMenu = syncMenuForCatalog(menuItems, cat);
    const ok = await saveCatalogsAndMenu(updatedCats, updatedMenu, "Каталог создан и добавлен в меню ✓");
    if (ok) {
      setCreateCatalogOpen(false);
      setNewCatalogForm({ name: "", slug: "", slugManual: false });
      setNewCatalogErrors({});
    }
  };

  const attachProductToCatalog = async (productSlug, catalogSlug) => {
    const p = products.find((x) => x.slug === productSlug);
    if (!p) return;
    const catalogs = [...new Set([...productCatalogSlugs(p), catalogSlug])];
    setMsg("Привязываю товар...");
    await apiFetch(`/api/products/${productSlug}`, { method: "PUT", body: buildProductPayload({ ...p, catalogs }) });
    setMsg("Товар привязан к каталогу ✓");
    refresh();
  };

  const detachProductFromCatalog = async (productSlug, catalogSlug) => {
    const p = products.find((x) => x.slug === productSlug);
    if (!p) return;
    const catalogs = productCatalogSlugs(p).filter((s) => s !== catalogSlug);
    if (!catalogs.length) { setMsg("Товар должен быть хотя бы в одном каталоге"); return; }
    setMsg("Отвязываю...");
    await apiFetch(`/api/products/${productSlug}`, { method: "PUT", body: buildProductPayload({ ...p, catalogs }) });
    setMsg("Товар отвязан ✓");
    refresh();
  };

  const saveMenu = async () => {
    const normalized = normalizeMenu(menuItems);
    const errors = validateMenuItems(normalized);
    setMenuErrors(errors);
    if (Object.keys(errors).length) { setMsg("Исправьте ошибки в меню"); return; }
    setMsg("Сохраняю меню...");
    await apiFetch("/api/settings", { method: "POST", body: { menu: normalized } });
    setMenuItems(normalized);
    setMsg("Меню сохранено ✓");
    refresh();
  };

  const fixMenuLinks = async () => {
    const normalized = normalizeMenu(menuItems);
    setMenuItems(normalized);
    setMsg("Сохраняю исправленные ссылки...");
    await apiFetch("/api/settings", { method: "POST", body: { menu: normalized } });
    setMsg("Ссылки в меню обновлены ✓");
    refresh();
  };

  const handleReviewVideoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fileError = validateVideoFile(file);
    if (fileError) { setMsg(fileError); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const updated = [...(settings?.reviewVideos || []), { id: `rv-${Date.now()}`, caption: file.name.replace(/\.[^.]+$/, ""), video: ev.target.result }];
      setMsg("Загружаю...");
      await apiFetch("/api/settings", { method: "POST", body: { reviewVideos: updated } });
      setMsg("Видео добавлено ✓"); refresh();
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const removeReviewVideo = async (id) => {
    const updated = (settings?.reviewVideos || []).filter((v) => v.id !== id);
    await apiFetch("/api/settings", { method: "POST", body: { reviewVideos: updated } });
    refresh();
  };

  const updateReviewCaption = async (id, caption) => {
    const updated = (settings?.reviewVideos || []).map((v) => v.id === id ? { ...v, caption } : v);
    await apiFetch("/api/settings", { method: "POST", body: { reviewVideos: updated } });
    refresh();
  };

  const navItems = [
    { id: "catalogs", label: "Каталоги", icon: <FolderOpen size={20} /> },
    { id: "products", label: "Товары", icon: <List size={20} /> },
    { id: "menu", label: "Меню", icon: <Menu size={20} /> },
    { id: "reviews", label: "Видео-отзывы", icon: <Video size={20} /> },
  ];

  if (editProduct !== null) {
    return (
      <main className="admin adminV2">
        <nav className="adminNav">
          <Link to="/" className="adminNavLogo"><img src="/Lypovoi.svg" alt="Липовой" /></Link>
          {navItems.map((n) => (
            <button key={n.id} type="button" className={`adminNavItem ${section === n.id ? "active" : ""}`} onClick={() => { setSection(n.id); setEditProduct(null); }}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="adminBody">
          <AdminProductForm
            key={editProduct === "new" ? `new-${presetCatalogs.join(",")}` : editProduct}
            productSlug={editProduct === "new" ? null : editProduct}
            products={products}
            catalogItems={catalogItems}
            presetCatalogs={presetCatalogs}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onBack={() => setEditProduct(null)}
          />
        </div>
      </main>
    );
  }

  const catalogInModal = catalogModal ? catalogItems.find((c) => c.slug === catalogModal) : null;
  const modalProducts = catalogModal ? products.filter((p) => productInCatalog(p, catalogModal)) : [];
  const attachableProducts = catalogModal
    ? products.filter((p) => !productInCatalog(p, catalogModal) && (
        !attachSearch || p.name?.toLowerCase().includes(attachSearch.toLowerCase()) || p.slug?.includes(attachSearch.toLowerCase())
      ))
    : [];
  const filteredProducts = products.filter((p) => !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.slug?.includes(productSearch.toLowerCase()));

  return (
    <main className="admin adminV2">
      <nav className="adminNav">
        <Link to="/" className="adminNavLogo"><img src="/Lypovoi.svg" alt="Липовой" /></Link>
        {navItems.map((n) => (
          <button key={n.id} type="button" className={`adminNavItem ${section === n.id ? "active" : ""}`} onClick={() => { setSection(n.id); }}>
            {n.icon}<span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="adminBody">
        {section === "catalogs" && (
          <div className="adminSection">
            <div className="adminSectionHead">
              <h1>Каталоги</h1>
              <button className="newBtn" type="button" onClick={() => { setCreateCatalogOpen(true); setNewCatalogForm({ name: "", slug: "", slugManual: false }); setNewCatalogErrors({}); }}>
                + Новый каталог
              </button>
            </div>
            {msg && <p className="adminMsg">{msg}</p>}
            <p style={{ color: "var(--gray-dark)", fontSize: "13px", marginBottom: "20px" }}>
              Нажмите на карточку чтобы просмотреть товары. Новый каталог автоматически добавляется в меню сайта.
            </p>
            <div className="catalogAdminGrid">
              {catalogItems.map((c, i) => {
                const count = countCatalogProducts(products, c.slug);
                return (
                  <div key={c.id || i} className="catalogAdminCard">
                    {c._edit ? (
                      <div className="catalogAdminInlineEdit">
                        <input value={c.name} onChange={(e) => updateCatalog(i, "name", e.target.value)} placeholder="Название" />
                        <input value={c.slug} onChange={(e) => updateCatalog(i, "slug", e.target.value)} placeholder="slug" />
                        <button type="button" className="saveBtn" onClick={async () => {
                          const oldSlug = catalogItems[i].slug;
                          const updatedItem = cleanCatalogForSave({ ...catalogItems[i], _edit: false });
                          const next = catalogItems.map((x, idx) => idx === i ? updatedItem : cleanCatalogForSave(x));
                          const menu = syncMenuForCatalog(menuItems, updatedItem, oldSlug !== updatedItem.slug ? oldSlug : null);
                          await saveCatalogsAndMenu(next, menu);
                        }}>Сохранить</button>
                        <button type="button" className="adminBackBtn" onClick={() => updateCatalog(i, "_edit", false)}>Отмена</button>
                      </div>
                    ) : (
                      <button type="button" className="catalogAdminCardHead" onClick={() => setCatalogModal(c.slug)}>
                        <div>
                          <b>{c.name}</b>
                          <small>{count} {count === 1 ? "товар" : count < 5 && count > 0 ? "товара" : "товаров"} · {catalogLink(c.slug)}</small>
                        </div>
                        <div className="catalogAdminCardActions">
                          <button type="button" className="catalogAdminEdit" onClick={(e) => { e.stopPropagation(); updateCatalog(i, "_edit", true); }} title="Переименовать">✏️</button>
                          <button type="button" className="catalogAdminDel" onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Удалить каталог «${c.name}»?`)) {
                              const next = catalogItems.filter((_, idx) => idx !== i);
                              const menu = removeCatalogFromMenu(menuItems, c.slug);
                              setCatalogItems(next);
                              setMenuItems(menu);
                              saveCatalogsAndMenu(next.map(cleanCatalogForSave), menu, "Каталог удалён ✓");
                            }
                          }}><Trash2 size={14} /></button>
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section === "products" && (
          <div className="adminSection">
            <div className="adminSectionHead">
              <h1>Товары <span className="adminSectionCount">{products.length}</span></h1>
            </div>
            <p style={{ color: "var(--gray-dark)", fontSize: "13px", marginBottom: "16px" }}>
              Для создания нового товара — откройте каталог и нажмите «+ Добавить товар».
            </p>
            <input className="adminSearch" type="search" placeholder="Поиск по названию или slug…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            <div className="adminProductGrid">
              {filteredProducts.map((p) => (
                <div key={p.slug} role="button" tabIndex={0} className="adminProductCard" onClick={() => setEditProduct(p.slug)} onKeyDown={(e) => e.key === "Enter" && setEditProduct(p.slug)}>
                  <div className="adminProductCardImg">
                    {p.image ? <img src={p.image} alt={p.name} /> : <div className="adminProductCardNoImg"><ImagePlus size={24} /></div>}
                    {(p.isHit || p.isNewArrival) && (
                      <div className="adminCardLabels">
                        {p.isHit && <span className="adminCardLabel hit">ХИТ</span>}
                        {p.isNewArrival && <span className="adminCardLabel new">НОВИНКА</span>}
                      </div>
                    )}
                  </div>
                  <div className="adminProductCardInfo">
                    <b>{p.name}</b>
                    <small>{money(p.price)}</small>
                    <small className={productTotal(p) > 0 ? "inStock" : "noStock"}>{productTotal(p) > 0 ? `${productTotal(p)} в наличии` : "Распродано"}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "menu" && (
          <div className="adminSection">
            <div className="adminSectionHead">
              <h1>Меню сайта</h1>
              <button type="button" className="adminBackBtn" onClick={fixMenuLinks}>Исправить старые ссылки</button>
            </div>
            {msg && <p className="adminMsg">{msg}</p>}
            <p style={{ color: "var(--gray-dark)", fontSize: "14px", marginBottom: "20px" }}>
              Ссылки должны быть вида <code>/catalog/slug</code>. Если видите старые <code>?category=</code> — нажмите «Исправить старые ссылки».
            </p>
            <select className="menuCatalogPicker" defaultValue="" onChange={(e) => {
              const picked = catalogItems.find((c) => c.slug === e.target.value);
              if (!picked) return;
              const already = menuItems.some((m) => m.link === catalogLink(picked.slug));
              if (!already) setMenuItems([...menuItems, { label: picked.name.toUpperCase(), link: catalogLink(picked.slug) }]);
              e.target.value = "";
            }}>
              <option value="">+ Добавить пункт из каталога…</option>
              {catalogItems.map((c) => (<option key={c.slug} value={c.slug}>{c.name}</option>))}
            </select>
            <div className="menuAdminList">
              {menuItems.map((m, i) => (
                <div key={i} className="menuAdminRow">
                  <input value={m.label} onChange={(e) => updateMenu(i, "label", e.target.value)} placeholder="НАЗВАНИЕ" className={menuErrors[i]?.label ? "inputInvalid" : ""} />
                  <input value={m.link} onChange={(e) => updateMenu(i, "link", e.target.value)} placeholder="/catalog/slug" className={menuErrors[i]?.link ? "inputInvalid" : ""} />
                  <button type="button" onClick={() => setMenuItems(menuItems.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                  {(menuErrors[i]?.label || menuErrors[i]?.link) && <span className="fieldError menuFieldError">{[menuErrors[i]?.label, menuErrors[i]?.link].filter(Boolean).join(" · ")}</span>}
                </div>
              ))}
              <button type="button" className="menuAdminAddBtn" onClick={() => setMenuItems([...menuItems, { label: "", link: "" }])}>+ Добавить вручную</button>
            </div>
            <button type="button" onClick={saveMenu} className="saveBtn" style={{ marginTop: "20px" }}><Save /> Сохранить меню</button>
          </div>
        )}

        {section === "reviews" && (
          <div className="adminSection">
            <div className="adminSectionHead"><h1>Видео-отзывы</h1></div>
            {msg && <p className="adminMsg">{msg}</p>}
            <p style={{ color: "var(--gray-dark)", fontSize: "14px", marginBottom: "24px" }}>Вертикальные mp4 до 30 МБ — появятся в телефоне на главной.</p>
            <div className="reviewVideosGrid">
              {(settings?.reviewVideos || []).map((item) => (
                <div key={item.id} className="reviewVideoItem">
                  <video src={item.video} muted playsInline />
                  <button type="button" className="reviewVideoDelete" onClick={() => removeReviewVideo(item.id)}><Trash2 size={16} /></button>
                  <input defaultValue={item.caption || ""} onBlur={(e) => updateReviewCaption(item.id, e.target.value)} placeholder="Подпись" />
                </div>
              ))}
              <label className="reviewVideoAdd">
                <Video size={32} /><span>Добавить видео</span>
                <input type="file" accept="video/*" onChange={handleReviewVideoUpload} hidden />
              </label>
            </div>
          </div>
        )}
      </div>

      {catalogModal && catalogInModal && (
        <AdminModal title={catalogInModal.name} onClose={() => { setCatalogModal(null); setAttachSearch(""); }} wide>
          <div className="catalogModalHead">
            <span>{modalProducts.length} {modalProducts.length === 1 ? "товар" : modalProducts.length < 5 && modalProducts.length > 0 ? "товара" : "товаров"} в каталоге</span>
            <button type="button" className="newBtn" onClick={() => openNewProduct([catalogInModal.slug])}>+ Создать товар</button>
          </div>
          {modalProducts.length > 0 && (
            <div className="catalogModalProductList">
              {modalProducts.map((p) => (
                <div key={p.slug} className="catalogAdminProductRow catalogAdminProductRow--withActions">
                  <div role="button" tabIndex={0} className="catalogAdminProductRowMain" onClick={() => { setCatalogModal(null); setEditProduct(p.slug); }} onKeyDown={(e) => e.key === "Enter" && (setCatalogModal(null), setEditProduct(p.slug))}>
                    {p.image ? <img src={p.image} alt="" /> : <div className="catalogProductNoImg"><ImagePlus size={18} /></div>}
                    <div>
                      <b>{p.name}</b>
                      <small>{money(p.price)} · {productTotal(p)} в наличии</small>
                    </div>
                    <span className="catalogProductArrow">→</span>
                  </div>
                  <button type="button" className="catalogDetachBtn" title="Отвязать от каталога" onClick={() => detachProductFromCatalog(p.slug, catalogInModal.slug)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="catalogAttachSection">
            <h4>Привязать существующий товар</h4>
            <input className="adminSearch" type="search" placeholder="Поиск товара…" value={attachSearch} onChange={(e) => setAttachSearch(e.target.value)} />
            <div className="catalogAttachList">
              {attachableProducts.length === 0 ? (
                <p className="catalogAttachEmpty">{attachSearch ? "Ничего не найдено" : "Все товары уже в этом каталоге"}</p>
              ) : attachableProducts.slice(0, 8).map((p) => (
                <button key={p.slug} type="button" className="catalogAttachRow" onClick={() => attachProductToCatalog(p.slug, catalogInModal.slug)}>
                  {p.image ? <img src={p.image} alt="" /> : <div className="catalogProductNoImg"><ImagePlus size={16} /></div>}
                  <span>{p.name}</span>
                  <Plus size={16} />
                </button>
              ))}
            </div>
          </div>
        </AdminModal>
      )}

      {createCatalogOpen && (
        <AdminModal title="Новый каталог" onClose={() => setCreateCatalogOpen(false)}>
          <div className="catalogCreateForm">
            <label className={newCatalogErrors.name ? "inputInvalid" : ""}>
              Название
              <input
                value={newCatalogForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setNewCatalogForm((f) => ({
                    ...f,
                    name,
                    slug: f.slugManual ? f.slug : slugifyCatalog(name),
                  }));
                }}
                placeholder="Кепки"
                autoFocus
              />
              {newCatalogErrors.name && <span className="fieldError">{newCatalogErrors.name}</span>}
            </label>
            <label className={newCatalogErrors.slug ? "inputInvalid" : ""}>
              Slug (ссылка)
              <input
                value={newCatalogForm.slug}
                onChange={(e) => setNewCatalogForm((f) => ({ ...f, slug: slugifyCatalog(e.target.value), slugManual: true }))}
                placeholder="kepki"
              />
              {newCatalogForm.slug && <small className="catalogCreatePreview">Ссылка: {catalogLink(newCatalogForm.slug)}</small>}
              {newCatalogErrors.slug && <span className="fieldError">{newCatalogErrors.slug}</span>}
            </label>
            <button type="button" className="saveBtn" style={{ width: "100%", marginTop: "8px" }} onClick={submitNewCatalog}>
              Создать и добавить в меню
            </button>
          </div>
        </AdminModal>
      )}
    </main>
  );
}

function Cart({ cart, open, close, setCart }) {
  const sum = cart.reduce((n, x) => n + x.price * x.qty, 0);
  return (
    <>
      <aside className={`drawer ${open ? "open" : ""}`}>
        <div className="drawerHead">
          <h2>КОРЗИНА</h2>
          <button onClick={close}><X /></button>
        </div>
        <div className="cartItems">
          {!cart.length ? <p className="emptyCart">Корзина пуста.</p> : cart.map((x) => (
            <article key={x.key}>
              <img src={x.image} alt="" />
              <div className="cartInfo">
                <b>{x.name}</b>
                <small>{x.size}</small>
                <div className="cartControls">
                  <div className="qtyBox">
                    <button onClick={() => setCart((c) => c.map((i) => i.key === x.key ? { ...i, qty: i.qty - 1 } : i).filter((i) => i.qty > 0))}><Minus size={14}/></button>
                    {x.qty}
                    <button onClick={() => setCart((c) => c.map((i) => i.key === x.key ? { ...i, qty: i.qty + 1 } : i))}><Plus size={14}/></button>
                  </div>
                  <b>{money(x.price * x.qty)}</b>
                </div>
              </div>
            </article>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="cartFooter">
            <div className="total"><span>ИТОГО</span><b>{money(sum)}</b></div>
            <p className="taxesMsg">Налоги и доставка рассчитываются при оформлении</p>
            <button className="checkoutBtn">ОФОРМИТЬ ЗАКАЗ</button>
          </div>
        )}
      </aside>
      <button type="button" className={`shade ${open ? "open" : ""}`} onClick={close} aria-label="Закрыть корзину" />
    </>
  );
}

function MenuDrawer({ open, close, links }) {
  return (
    <>
      <aside className={`drawer left-drawer ${open ? "open" : ""}`}>
        <div className="drawerHead">
          <h2>МЕНЮ</h2>
          <button onClick={close}><X /></button>
        </div>
        <nav className="mobileNav">
          {links?.map((l, i) => (
            <Link key={i} to={l.link} onClick={close}>{l.label}</Link>
          ))}
        </nav>
      </aside>
      <button type="button" className={`shade shade--menu ${open ? "open" : ""}`} onClick={close} aria-label="Закрыть меню" />
    </>
  );
}

let globalIntroSeen = false;

function Shell() {
  const [products, setProducts] = useState(fallback);
  const { user, loading: authLoading, logout } = useAuth();
  const cartSaveTimer = useRef(null);
  const cartBootstrapped = useRef(false);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      offset: 50
    });
  }, []);

  const [settings, setSettings] = useState({
    catalogs: DEFAULT_CATALOGS,
    menu: [
      { label: "ВЕРХНЯЯ ОДЕЖДА", link: "/catalog/outerwear" },
      { label: "БРЮКИ", link: "/catalog/bottoms" },
      { label: "ФУТБОЛКИ", link: "/catalog/t-shirts" },
      { label: "ВЕРХ", link: "/catalog/tops" },
      { label: "АРХИВ", link: "/catalog/archive" },
    ],
    reviewVideos: [],
  });
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [hasSeenIntro, setHasSeenIntro] = useState(globalIntroSeen);
  const showIntroNow = isHome && !hasSeenIntro;

  useLenis(!showIntroNow && !open && !menuOpen && !logoutOpen);

  useEffect(() => {
    const locked = open || menuOpen || logoutOpen;
    document.body.classList.toggle("drawer-open", locked);
    return () => document.body.classList.remove("drawer-open");
  }, [open, menuOpen, logoutOpen]);

  function completeIntro() {
    globalIntroSeen = true;
    setHasSeenIntro(true);
  }

  async function refresh() {
    try {
      const r = await fetch(apiUrl("/api/products"));
      setProducts(await r.json());
      const s = await fetch(apiUrl("/api/settings"));
      setSettings(await s.json());
    } catch {
      setProducts(fallback);
    }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (authLoading) return;

    async function loadCart() {
      cartBootstrapped.current = false;
      if (user) {
        try {
          const guest = loadGuestCart();
          const data = await apiFetch("/api/cart");
          const serverItems = data.items || [];
          const merged = [...serverItems];
          guest.forEach((g) => {
            const key = g.key || `${g.slug}-${g.size}`;
            const idx = merged.findIndex((x) => (x.key || `${x.slug}-${x.size}`) === key);
            if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + g.qty };
            else merged.push({ ...g, key });
          });
          setCart(merged);
          if (guest.length) {
            await apiFetch("/api/cart", { method: "PUT", body: { items: merged } });
            clearGuestCart();
          }
        } catch {
          setCart(loadGuestCart());
        }
      } else {
        setCart(loadGuestCart());
      }
      cartBootstrapped.current = true;
    }

    loadCart();
  }, [user, authLoading]);

  useEffect(() => {
    if (!cartBootstrapped.current) return;

    if (user) {
      clearTimeout(cartSaveTimer.current);
      cartSaveTimer.current = setTimeout(() => {
        apiFetch("/api/cart", { method: "PUT", body: { items: cart } }).catch(() => {});
      }, 500);
      return () => clearTimeout(cartSaveTimer.current);
    }

    saveGuestCart(cart);
  }, [cart, user]);

  function add(p, size) {
    if (!productTotal(p)) return;
    const key = p.slug + size;
    setCart((c) => c.some((x) => x.key === key)
      ? c.map((x) => x.key === key ? { ...x, qty: x.qty + 1 } : x)
      : [...c, { ...p, key, size, qty: 1 }]);
    setOpen(true);
    setMenuOpen(false);
  }

  const openCart = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    setOpen(true);
  };

  const openMenu = () => {
    setOpen(false);
    setSearchOpen(false);
    setMenuOpen(true);
  };

  function handleSearchOpenChange(next) {
    if (next) {
      setOpen(false);
      setMenuOpen(false);
    }
    setSearchOpen(next);
  }

  function confirmLogout() {
    logout();
    setLogoutOpen(false);
    setCart([]);
    clearGuestCart();
  }

  return (
    <div className="app">
      <Header
        count={cart.reduce((n, x) => n + x.qty, 0)}
        open={openCart}
        solid={true}
        hidden={showIntroNow}
        onMenuClick={openMenu}
        user={user}
        onLogoutRequest={() => setLogoutOpen(true)}
        searchOpen={searchOpen}
        onSearchOpenChange={handleSearchOpenChange}
        products={products}
      />
      <Routes>
        <Route path="/" element={<Home products={products} settings={settings} add={add} hasSeenIntro={hasSeenIntro} onIntroComplete={completeIntro} />} />
        <Route path="/catalog" element={<CatalogPage products={products} settings={settings} />} />
        <Route path="/catalog/:catalogSlug" element={<CatalogPage products={products} settings={settings} />} />
        <Route path="/product/:slug" element={<Product products={products} add={add} />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/admin" element={<AdminRoute><Admin products={products} settings={settings} refresh={refresh} /></AdminRoute>} />
      </Routes>
      {!location.pathname.startsWith("/admin") && <footer>
        <div className="footerCols">
          <div>
            <img src="/Lypovoi.svg" alt="Липовой" className="footerLogo" />
            <p>Больше, чем одежда — это наследие</p>
          </div>
          <div>
            <h3>КОМПАНИЯ</h3>
            <Link to="/">О НАС</Link>
            <Link to="/">КОНТАКТЫ</Link>
            <Link to="/">МАГАЗИНЫ</Link>
          </div>
          <div>
            <h3>ПОМОЩЬ</h3>
            <Link to="/">ВОЗВРАТ И ОБМЕН</Link>
            <Link to="/">ДОСТАВКА И ВОЗВРАТ</Link>
            <Link to="/">ТАБЛИЦА РАЗМЕРОВ</Link>
          </div>
        </div>
        <div className="footerBottom">
          <p>© 2026, Липовой. Все права защищены.</p>
        </div>
      </footer>}
      <Cart cart={cart} open={open} close={() => setOpen(false)} setCart={setCart} />
      <MenuDrawer open={menuOpen} close={() => setMenuOpen(false)} links={settings?.menu || []} />
      <ConfirmModal
        open={logoutOpen}
        title="Выйти из аккаунта?"
        message="Корзина сохранена в профиле. Вы сможете войти снова в любой момент."
        confirmLabel="Выйти"
        cancelLabel="Остаться"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
