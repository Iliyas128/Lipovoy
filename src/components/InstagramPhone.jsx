import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Volume2, VolumeX } from "lucide-react";

const IG_LOGO = "/lipovoy-ig-logo.png";

export default function InstagramPhone({ videos = [], username = "lipovoygym.shop" }) {
  const [index, setIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  const list = videos.filter((v) => v?.video);
  const current = list[index];

  useEffect(() => {
    setIndex(0);
  }, [list.length]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.muted = isMuted;
    node.currentTime = 0;
    node.play().catch(() => {});
  }, [index, current?.video, isMuted]);

  function toggleSound() {
    setIsMuted((m) => !m);
    videoRef.current?.play().catch(() => {});
  }

  function togglePlay() {
    const node = videoRef.current;
    if (!node) return;
    setIsMuted(false);
    node.muted = false;
    if (node.paused) node.play().catch(() => {});
    else node.pause();
  }

  function goNext() {
    if (list.length < 2) return;
    setIndex((i) => (i + 1) % list.length);
  }

  function goPrev() {
    if (list.length < 2) return;
    setIndex((i) => (i - 1 + list.length) % list.length);
  }

  return (
    <div className="igPhone">
      <div className="igPhoneShell">
        <div className="igPhoneNotch" aria-hidden="true" />
        <div className="igPhoneScreen">
          <div className="igStatusBar">
            <span>9:41</span>
            <span className="igStatusIcons">●●●</span>
          </div>

          <div className="igAppHeader">
            <div className="igAppUser">
              <img src={IG_LOGO} alt="" className="igAvatarImg" />
              <div>
                <b>{username}</b>
                <small>Reels · отзывы</small>
              </div>
            </div>
          </div>

          <div className="igVideoWrap">
            {current ? (
              <>
                <video
                  ref={videoRef}
                  className="igVideo"
                  src={current.video}
                  playsInline
                  muted={isMuted}
                  loop
                  onClick={togglePlay}
                />
                <button
                  type="button"
                  className="igSoundBtn"
                  onClick={toggleSound}
                  aria-label={isMuted ? "Включить звук" : "Выключить звук"}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                {list.length > 1 && (
                  <div className="igReelNav">
                    <button type="button" onClick={goPrev} aria-label="Предыдущее видео">
                      <ChevronUp size={18} />
                    </button>
                    <button type="button" onClick={goNext} aria-label="Следующее видео">
                      <ChevronDown size={18} />
                    </button>
                  </div>
                )}
                {list.length > 1 && (
                  <div className="igReelDots">
                    {list.map((item, i) => (
                      <span key={item.id || i} className={i === index ? "on" : ""} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="igVideoEmpty">
                <img src={IG_LOGO} alt="Липовой Gym" />
                <p>Видео-отзывы скоро появятся</p>
              </div>
            )}
          </div>

          {current?.caption && (
            <div className="igCaption">
              <b>{username}</b> {current.caption}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
