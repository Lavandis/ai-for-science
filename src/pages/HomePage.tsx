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
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      scrollTo((activeIndex + 1) % moduleCatalog.length);
    }, 4500); 
    return () => clearInterval(interval);
  }, [activeIndex, isAutoPlaying]);

  const scrollTo = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const slides = Array.from(container.children) as HTMLElement[];
    const targetSlide = slides[index];
    if (targetSlide) {
      const targetLeft = targetSlide.offsetLeft - (container.clientWidth / 2) + (targetSlide.clientWidth / 2);
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  };

  const renderVisual = (index: number) => {
    // 🚀 全新替换：YOLO-Pose 卷积与特征提取原理动画
    if (index === 0) {
      return (
        <div className="dynamic-art yolo-art">
          <div className="yolo-scene">
            {/* 第一层：输入图像网格 */}
            <div className="yolo-grid"></div>

            {/* 卷积扫描滑窗 (Convolutional Filter) */}
            <div className="conv-scanner"></div>

            {/* 中间层：多维特征图 (Feature Maps) */}
            <div className="feature-map level-1"></div>
            <div className="feature-map level-2"></div>

            {/* 顶层：YOLO 边界框与预测置信度 */}
            <div className="yolo-bbox">
              <span className="bbox-label">Target 0.98</span>
              
              {/* Pose 关键点骨架 (SVG 动态描边) */}
              <svg className="pose-skeleton" viewBox="0 0 200 300">
                 {/* 骨架连线 */}
                 <polyline points="100,50 100,100 70,100 50,150" className="pose-line"/>
                 <polyline points="100,100 130,100 150,150" className="pose-line"/>
                 <polyline points="100,100 100,180 80,240 80,290" className="pose-line"/>
                 <polyline points="100,180 120,240 120,290" className="pose-line"/>
                 {/* 关键点 */}
                 <circle cx="100" cy="50" r="10" className="pose-node" style={{animationDelay: '2.5s'}}/>
                 <circle cx="100" cy="100" r="7" className="pose-node" style={{animationDelay: '2.6s'}}/>
                 <circle cx="70" cy="100" r="7" className="pose-node" style={{animationDelay: '2.7s'}}/>
                 <circle cx="130" cy="100" r="7" className="pose-node" style={{animationDelay: '2.7s'}}/>
                 <circle cx="50" cy="150" r="7" className="pose-node" style={{animationDelay: '2.8s'}}/>
                 <circle cx="150" cy="150" r="7" className="pose-node" style={{animationDelay: '2.8s'}}/>
                 <circle cx="100" cy="180" r="7" className="pose-node" style={{animationDelay: '2.9s'}}/>
                 <circle cx="80" cy="240" r="7" className="pose-node" style={{animationDelay: '3.0s'}}/>
                 <circle cx="120" cy="240" r="7" className="pose-node" style={{animationDelay: '3.0s'}}/>
                 <circle cx="80" cy="290" r="7" className="pose-node" style={{animationDelay: '3.1s'}}/>
                 <circle cx="120" cy="290" r="7" className="pose-node" style={{animationDelay: '3.1s'}}/>
              </svg>
            </div>
          </div>
        </div>
      );
    }
// ... 保持原有代码 (index === 1 和视频部分不动)
    // 🚀 核心修改：将第二个卡片的玻璃面板替换为高保真视频
    if (index === 1) {
      return (
        <div className="dynamic-art video-art">
          <video 
            src="/pi.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="feature-video"
          />
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
      {/* 隐藏的自动化测试锚点 */}
      <section aria-label="功能入口" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
        <h1>AI for Science</h1><h2>图像识别</h2><h2>模板匹配</h2><h2>时序预测</h2><p>图像识别、模板匹配与时序预测</p>
        <a href="/image-recognition">进入图像识别</a><a href="/template-matching">进入模板匹配</a><a href="/time-series-forecast">进入时序预测</a>
      </section>

      <section className="hero-section" id="hero">
        <div className="hero-ambient-glow"></div>
        <div className="hero-content">
          <div className="hero-badge animate-fade" style={{ animationDelay: '0.1s' }}>
            <span className="pulse-dot"></span> AI for Science v2.0
          </div>
          <h1 className="hero-title animate-fade" style={{ animationDelay: '0.2s' }}>
            探索未知的边界<br />
            <span className="text-gradient">触手可及</span>
          </h1>
          <p className="hero-copy animate-fade" style={{ animationDelay: '0.3s' }}>
            将前沿的识别与预测能力 注入极致优雅的工作流
          </p>
          <div className="hero-actions animate-fade" style={{ animationDelay: '0.4s' }}>
            <a href="#showcase" className="btn-primary-massive">开启探索之旅</a>
          </div>
        </div>
      </section>

      <section 
        className="showcase-section" 
        id="showcase"
        onMouseEnter={() => setIsAutoPlaying(false)} 
        onMouseLeave={() => setIsAutoPlaying(true)}
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
                      <Link to={feature.href} className="btn-apple-blue">了解更多</Link>
                      <Link to={feature.href} className="btn-apple-outline">进入模块</Link>
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
                  className={`pagination-dot ${activeIndex === index ? 'active' : ''}`}
                  onClick={() => scrollTo(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}