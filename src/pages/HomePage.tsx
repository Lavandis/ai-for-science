import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { moduleCatalog } from "../moduleCatalog";

const visualCards = [
  {
    title: "图像识别",
    subtitle: "毫秒级视觉洞察",
    themeClass: "visual-lens"
  },
  {
    title: "模板匹配",
    subtitle: "海量特征智能适配",
    themeClass: "visual-layers"
  },
  {
    title: "时序预测",
    subtitle: "演变前瞻预警",
    themeClass: "visual-wave"
  }
];

export function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isUserPaused, setIsUserPaused] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setIsUserPaused(true);
    }
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollCenter = container.scrollLeft + container.clientWidth / 2;
      const slides = Array.from(container.children) as HTMLElement[];
      let closestIndex = 0;
      let minDistance = Infinity;

      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
        const distance = Math.abs(scrollCenter - slideCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      if (activeIndex !== closestIndex) setActiveIndex(closestIndex);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex]);

  useEffect(() => {
    if (!isAutoPlaying || isUserPaused) return;
    const interval = setInterval(() => {
      scrollTo((activeIndex + 1) % moduleCatalog.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeIndex, isAutoPlaying, isUserPaused]);

  const scrollTo = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const slides = Array.from(container.children) as HTMLElement[];
    const targetSlide = slides[index];
    if (targetSlide) {
      const targetLeft = targetSlide.offsetLeft - (container.clientWidth / 2) + (targetSlide.clientWidth / 2);
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  };

  const renderVisual = (index: number) => {
    if (index === 0) {
      return (
        <div className="dynamic-art lens-art">
          <div className="lens-halo"></div>
          <div className="lens-outer">
            <div className="lens-shutter"></div>
            <div className="lens-inner">
              <div className="lens-core">
                <div className="lens-glare"></div>
              </div>
            </div>
            <div className="scan-laser"></div>
          </div>
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="dynamic-art layers-art">
          <div className="layers-projector-light"></div>
          <div className="glass-panel panel-1">
             <div className="panel-grid"></div>
             <div className="match-target"></div>
          </div>
          <div className="glass-panel panel-2">
             <div className="match-target"></div>
          </div>
          <div className="glass-panel panel-3">
             <div className="match-target"></div>
          </div>
        </div>
      );
    }
    return (
      <div className="dynamic-art wave-art">
        <svg viewBox="0 0 800 300" preserveAspectRatio="none">
          <path className="glow-line" d="M0,150 C100,150 150,50 250,50 C350,50 400,250 500,250 C600,250 650,100 800,100" />
          <path className="core-line" d="M0,150 C100,150 150,50 250,50 C350,50 400,250 500,250 C600,250 650,100 800,100" />
          <circle cx="500" cy="250" r="8" className="pulse-point" />
        </svg>
      </div>
    );
  };

  return (
    <div className="home-container">
      <section className="hero-section" id="hero">
        <div className="hero-ambient-glow"></div>
        <div className="hero-content">
          <div className="hero-badge animate-fade" style={{ animationDelay: "0.1s" }}>
            <span className="pulse-dot"></span> AI for Science v2.0
          </div>
          <h1 className="hero-title animate-fade" style={{ animationDelay: "0.2s" }}>
            探索未知的边界<br />
            <span className="text-gradient">触手可及</span>
          </h1>
          <p className="hero-copy animate-fade" style={{ animationDelay: "0.3s" }}>
            将前沿的识别与预测能力 注入极致优雅的工作流
          </p>
          <div className="hero-actions animate-fade" style={{ animationDelay: "0.4s" }}>
            <a href="#showcase" className="btn-primary-massive">开启探索之旅</a>
          </div>
        </div>
      </section>

      <section
        aria-label="功能入口"
        className="showcase-section"
        id="showcase"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
        onFocusCapture={() => setIsAutoPlaying(false)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsAutoPlaying(true);
          }
        }}
      >
        <div className="showcase-inner">
          <div className="carousel-container" ref={scrollRef}>
            {moduleCatalog.map((feature, index) => (
              <div className="carousel-slide" key={feature.href}>
                <div className={`apple-card ${visualCards[index].themeClass}`}>
                  <div className="card-header">
                    <div className="card-titles">
                      <h2>{visualCards[index].title}</h2>
                      <p>{visualCards[index].subtitle}</p>
                    </div>
                    <div className="card-actions">
                      <Link to={feature.href} className="btn-apple-blue" aria-label={`了解更多：${feature.title}`}>
                        了解更多
                      </Link>
                      <Link to={feature.href} className="btn-apple-outline">{feature.actionLabel}</Link>
                    </div>
                  </div>
                  <div className="card-visual">
                    {renderVisual(index)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="carousel-pagination">
            <div className="pagination-pill">
              {moduleCatalog.map((_, index) => (
                <button
                  key={index}
                  className={`pagination-dot ${activeIndex === index ? "active" : ""}`}
                  aria-label={`切换到${visualCards[index].title}`}
                  onClick={() => scrollTo(index)}
                />
              ))}
            </div>
            <button
              type="button"
              className="carousel-toggle"
              aria-pressed={isUserPaused}
              onClick={() => setIsUserPaused((current) => !current)}
            >
              {isUserPaused ? "继续轮播" : "暂停轮播"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
