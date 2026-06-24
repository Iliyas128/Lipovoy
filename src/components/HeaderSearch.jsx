import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { money } from "../lib/productUtils";
import { apiUrl } from "../lib/api";

export default function HeaderSearch({ open, onOpenChange, products }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onOpenChange]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/products/search?q=${encodeURIComponent(q)}`));
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        const local = products.filter((p) =>
          [p.name, p.category, p.description, p.slug, p.badge]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q.toLowerCase())),
        );
        setResults(local.slice(0, 8));
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timerRef.current);
  }, [query, products]);

  function close() {
    onOpenChange(false);
  }

  return (
    <div ref={wrapRef} className={`headerSearch ${open ? "isOpen" : ""}`}>
      <button
        type="button"
        className="headerSearchToggle"
        aria-label={open ? "Закрыть поиск" : "Поиск"}
        aria-expanded={open}
        onClick={() => (open ? close() : onOpenChange(true))}
      >
        <Search size={22} />
      </button>
      <div className="headerSearchField">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск товаров…"
          aria-label="Поиск товаров"
          onKeyDown={(e) => e.key === "Escape" && close()}
        />
        <button type="button" className="headerSearchClear" onClick={close} aria-label="Закрыть поиск">
          <X size={18} />
        </button>
      </div>
      {open && query.trim() && (
        <div className="headerSearchDropdown">
          {loading && <p className="headerSearchHint">Ищем…</p>}
          {!loading && results.length === 0 && (
            <p className="headerSearchHint">Ничего не найдено</p>
          )}
          {!loading && results.length > 0 && (
            <ul className="headerSearchResults">
              {results.map((p) => (
                <li key={p.slug}>
                  <Link to={`/product/${p.slug}`} onClick={close}>
                    <img src={p.image || p.images?.[0]} alt="" />
                    <div>
                      <b>{p.name}</b>
                      <small>{p.category}</small>
                    </div>
                    <span>{money(p.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
