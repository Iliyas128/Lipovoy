import { useEffect, useRef, useState } from "react";

export default function Preloader({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const exitDelay = isMobile ? 1600 : 2500;
    const removeDelay = isMobile ? 2200 : 3300;

    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    const exitTimer = setTimeout(() => setExiting(true), exitDelay);
    const removeTimer = setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      document.body.style.overflow = "";
      setRemoved(true);
      onComplete?.();
    }, removeDelay);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
      if (!doneRef.current) document.body.style.overflow = "";
    };
  }, [onComplete]);

  if (removed) return null;

  return (
    <section className={`preloader ${exiting ? "slide-up" : ""}`} id="preloader-top">
      <div className="preloader-content">
        <img src="/kaskat58.svg" className="preloader-img punch-1" alt="Липовой Gym" />
        <div className="preloader-star-row punch-2">
          <div className="preloader-line"></div>
          <img src="/BlackStar.png" className="preloader-star" alt="Звезда" />
          <div className="preloader-line"></div>
        </div>
        <img src="/Russia.png" className="preloader-img russia punch-3" alt="Россия" />
      </div>
    </section>
  );
}
