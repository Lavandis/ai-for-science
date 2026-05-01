import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// 修复点：这里必须带有 {} 来引入 AppLayout
import { AppLayout } from "./components/AppLayout"; 

import { ImageRecognitionPage } from "./features/imageRecognition/ImageRecognitionPage";
import { TemplateMatchingPage } from "./features/templateMatching/TemplateMatchingPage";
import { HomePage } from "./pages/HomePage";
import { TimeSeriesForecastPage } from "./features/timeSeriesForecast/TimeSeriesForecastPage";

export default function App() {
  // 状态：视频是否还在DOM中
  const [showVideo, setShowVideo] = useState(true);
  // 状态：是否触发淡出动画
  const [fadeOut, setFadeOut] = useState(false);

  // 当视频播放结束（或发生错误加载不出来）时触发
  const handleVideoEnded = () => {
    setFadeOut(true); // 开始CSS淡出动画
    // 等待 1 秒动画结束后，将视频完全从 DOM 中移除
    setTimeout(() => {
      setShowVideo(false);
    }, 1000); 
  };

  return (
    <>
      {/* 1. 片头视频遮罩层（使用决定了层级和淡出动画的CSS） */}
      {showVideo && (
        <div className={`intro-overlay ${fadeOut ? 'fade-out' : ''}`}>
          <video
            src="0001-0220.mp4" 
            autoPlay
            muted     
            playsInline 
            onEnded={handleVideoEnded}
            onError={handleVideoEnded} /* 容错：如果找不到视频文件，立刻跳过白屏进入主页 */
            className="intro-video"
          />
        </div>
      )}

      {/* 2. 你的网页真实首页内容 (原封不动的路由配置) */}
      <div className="main-content">
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/image-recognition" element={<ImageRecognitionPage />} />
            <Route path="/template-matching" element={<TemplateMatchingPage />} />
            <Route path="/time-series-forecast" element={<TimeSeriesForecastPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </div>
    </>
  );
}
