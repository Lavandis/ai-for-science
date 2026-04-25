import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { PageHeader } from "../../components/PageHeader";
import "./templateMatching.css"; 

interface PredictionResult {
  k1: number;
  k2: number;
  file_name: string;
  original_len: number;
}

interface DataPoint {
  index: number;
  angle: number;
}

export function TemplateMatchingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [previewData, setPreviewData] = useState<DataPoint[]>([]);

  // 处理文件上传与前端 2000 点数据预览
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null); // 重新上传文件时清空上一次的结果
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(1); // 跳过表头
        const data: DataPoint[] = lines
          .filter(line => line.trim() !== '')
          .slice(0, 4000) // 提取前 2000 个数据点
          .map((line, idx) => {
            const columns = line.split(',');
            const angleVal = parseFloat(columns[columns.length - 1]); // 提取最后一列作为角度
            return {
              index: idx,
              angle: isNaN(angleVal) ? 0 : angleVal
            };
          });
        setPreviewData(data);
      };
      reader.readAsText(selectedFile);
    }
  };

  // 发送数据到后端进行 HTPE 推理
  const startMatching = async () => {
    if (!file) return alert("请先上传数据");
    setLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/match-template", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      console.log("后端返回数据：", data); 

      if (data.error) {
        alert("推理错误: " + data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      alert("连接后端失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      {/* 🚀 核心动画样式：贝塞尔曲线缓动 */}
      <style>
        {`
          @keyframes slideFadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .smooth-enter {
            opacity: 0;
            animation: slideFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          .delay-1 { animation-delay: 0.1s; }
          .delay-2 { animation-delay: 0.2s; }
          .delay-3 { animation-delay: 0.3s; }
          
          .result-card {
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          }
          .result-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important;
          }

          /* 优化禁用的按钮样式 */
          .ir-btn-start:disabled {
            background-color: #e0e0e0;
            color: #9aa0a6;
            cursor: not-allowed;
            transform: none !important;
            box-shadow: none;
          }
        `}
      </style>

      {/* 顶部标题栏，去掉了 eyebrow 属性 */}
      <div className="smooth-enter">
        <PageHeader 
          title="HTPE 模板匹配" 
          description="上传 CSV 序列数据，提取角度值并利用混合 Transformer 模型反演系统的物理参数。" 
        />
      </div>

      <div className="module-layout" style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
        
        {/* 左侧：实验数据配置 */}
        <div className="ir-sidebar smooth-enter delay-1" style={{ width: '320px', flexShrink: 0 }}>
          <h2 className="ir-sidebar-title">实验数据配置</h2>
          
          <div className="ir-form-group">
            <label className="ir-label">上传序列数据 (.csv)</label>
            <div style={{
              border: '1px dashed #dadce0', borderRadius: '8px', padding: '16px', 
              backgroundColor: '#f8f9fa', transition: 'all 0.2s ease', cursor: 'pointer'
            }}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                style={{ width: '100%', outline: 'none' }}
              />
            </div>
            <p style={{ fontSize: '12px', color: '#80868b', marginTop: '8px', lineHeight: '1.5' }}>
              请上传包含时间与角度数据的 CSV 文件，系统将自动读取最后一列绘制前 4000 个采样点。
            </p>
          </div>

          <button 
            onClick={startMatching} 
            className="ir-btn-start" 
            disabled={loading || !file}
            style={{ 
              marginTop: '24px', 
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              transform: loading ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            {loading ? '⏳ 模型计算中...' : '▶ 开始物理参数反演'}
          </button>
        </div>

        {/* 右侧：图表与数据结果区 */}
        <div className="ir-main-content" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 上半部：数据曲线预览 */}
          <div className="ir-chart-card smooth-enter delay-2" style={{ height: '420px', margin: 0, position: 'relative' }}>
            <h3 className="ir-chart-title" style={{ paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
              输入序列预览 (前 4000 点)
            </h3>
            
            <div className="ir-chart-wrapper" style={{ height: 'calc(100% - 56px)', paddingTop: '16px' }}>
              {previewData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={previewData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                    <XAxis dataKey="index" hide />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#9aa0a6', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(value: number) => [value.toFixed(4), "Angle (rad)"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="angle" 
                      stroke="#1a73e8" 
                      dot={false} 
                      strokeWidth={2.5} 
                      isAnimationActive={true} 
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                // 优化后的无数据占位状态
                <div style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', color: '#bdc1c6', backgroundColor: '#fafbfc', borderRadius: '8px', border: '1px dashed #e8eaed'
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}>
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>等待上传 CSV 文件以生成波动曲线...</span>
                </div>
              )}
            </div>
          </div>

          {/* 下半部：物理参数结果卡片 */}
          <div className="smooth-enter delay-3" style={{ display: 'flex', gap: '24px' }}>
            
            {/* k1 阻尼系数卡片 */}
            <div className="result-card" style={{ 
              flex: 1, padding: '24px 28px', backgroundColor: '#ffffff', borderRadius: '12px', 
              border: '1px solid #f0f0f0', borderLeft: '6px solid #1a73e8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: '15px', color: '#5f6368', marginBottom: '12px', fontWeight: 500, display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontFamily: '"Times New Roman", Times, serif', fontStyle: 'italic', fontSize: '22px', marginRight: '6px', color: '#202124' }}>
                  k<sub>1</sub>
                </span> 
                (阻尼系数)
              </div>
              <div style={{ 
                fontSize: '40px', fontWeight: '800', color: result ? '#1a73e8' : '#dadce0', 
                fontFamily: 'monospace', letterSpacing: '-1px', lineHeight: '1.2'
              }}>
                {result && result.k1 !== undefined ? Number(result.k1).toFixed(6) : "---"}
              </div>
              <div style={{ fontSize: '13px', color: '#9aa0a6', marginTop: '8px' }}>
                HTPE 模型实时预测值
              </div>
            </div>

            {/* k2 刚度系数卡片 */}
            <div className="result-card" style={{ 
              flex: 1, padding: '24px 28px', backgroundColor: '#ffffff', borderRadius: '12px', 
              border: '1px solid #f0f0f0', borderLeft: '6px solid #34a853', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: '15px', color: '#5f6368', marginBottom: '12px', fontWeight: 500, display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontFamily: '"Times New Roman", Times, serif', fontStyle: 'italic', fontSize: '22px', marginRight: '6px', color: '#202124' }}>
                  k<sub>2</sub>
                </span> 
                (刚度系数)
              </div>
              <div style={{ 
                fontSize: '40px', fontWeight: '800', color: result ? '#34a853' : '#dadce0', 
                fontFamily: 'monospace', letterSpacing: '-1px', lineHeight: '1.2'
              }}>
                {result && result.k2 !== undefined ? Number(result.k2).toFixed(6) : "---"}
              </div>
              <div style={{ fontSize: '13px', color: '#9aa0a6', marginTop: '8px' }}>
                HTPE 模型实时预测值
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}