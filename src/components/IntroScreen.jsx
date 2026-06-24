import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

const slides = [
  { n: "001", title: "Streetwear без правил", text: "Дроп 2026 / Almaty energy" },
  { n: "002", title: "Каталог lookbook", text: "Одежда, которая двигается как editorial" },
  { n: "003", title: "Остатки в реальном времени", text: "Размеры и склад — без сюрпризов" },
  { n: "004", title: "Доставка по Казахстану", text: "Заказ, резерв и отправка за пару кликов" },
];

const PDF_SRC = "/intro.pdf";
const FALLBACK = "https://images.unsplash.com/photo-1484516758160-94c6f28f7b0f?auto=format&fit=crop&w=2200&q=90";

export default function IntroScreen({ featured }) {
  const stageRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const total = stage.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(total > 0 ? scrolled / total : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = Math.min(slides.length - 1, Math.floor(progress * slides.length * 1.05));
  const fade = 1 - Math.pow(progress, 1.15);
  const scale = 1 - progress * 0.08;
  const lift = progress * -42;

  return (
    <section className="introStage" ref={stageRef} id="top">
      <div
        className="introPinned"
        style={{
          opacity: fade,
          transform: `translate3d(0, ${lift}px, 0) scale(${scale})`,
        }}
      >
        <div className="introMedia">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="introVideo"
            poster={featured?.image || FALLBACK}
          >
            {/* Ссылка на качественное абстрактное видео с Unsplash/Pexels или локальное из public */}
            <source src="https://cdn.pixabay.com/video/2023/10/22/185960-876801948_large.mp4" type="video/mp4" />
          </video>
          <div className="introVeil" />
        </div>

        <div className="introCopy">
          <p className="introEyebrow">Последний дроп</p>
          <p className="introSub">каталог для бренда одежды</p>
          <h1 className="introBrand">{featured?.name?.split(" ")[0] || "NO RULES"}</h1>
        </div>

        <div className="introRail" aria-hidden>
          {slides.map((s, i) => (
            <article key={s.n} className={i === active ? "on" : ""}>
              <span>{s.n}/</span>
              <h2>{s.title}/</h2>
              <p>{s.text}</p>
            </article>
          ))}
        </div>

        <a className="introScroll" href="#main">
          <span>Scroll to explore</span>
          <ArrowDown />
        </a>

        <div className="introProgress">
          <i style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
        </div>
      </div>
    </section>
  );
}
