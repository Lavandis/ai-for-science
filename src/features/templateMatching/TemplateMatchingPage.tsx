import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import "./templateMatching.css"; 

interface PredictionResult {
  k1: number;
  k2: number;
  file_name: string;
  original_len: number;
  predicted_sequence?: number[];
}

interface DataPoint {
  index: number;
  realAngle: number | null;
  predAngle: number | null;
}

export function TemplateMatchingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  
  const [fullData, setFullData] = useState<DataPoint[]>([]);
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null); 
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const allLines = text.split('\n');
        const headers = allLines[0].split(',').map(h => h.trim());
        const angleIdx = headers.indexOf('Angle_rad') !== -1
          ? headers.indexOf('Angle_rad')
          : headers.length - 1;
        const lines = allLines.slice(1);
        const parsedData: DataPoint[] = lines
          .filter(line => line.trim() !== '')
          .map((line, idx) => {
            const columns = line.split(',');
            const angleVal = parseFloat(columns[angleIdx]);
            return {
              index: idx,
              realAngle: isNaN(angleVal) ? 0 : angleVal,
              predAngle: null
            };
          });
          
        setFullData(parsedData);
        setChartData(parsedData.slice(0, 2000));
      };
      reader.readAsText(selectedFile);
    }
  };

  const startMatching = async () => {
    if (!file || fullData.length === 0) return alert("请先上传 CSV 文件。");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/match-template", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        alert("连接后端失败，请确认已运行 ./tunnel/start.sh（HTTP " + response.status + "）");
        return;
      }
      const data = await response.json();

      if (data.error) {
        alert("推理错误：" + data.error);
      } else {
        setResult(data);
        
        if (data.predicted_sequence && data.predicted_sequence.length > 0) {
            const lastRealIdx = fullData.length - 1;
            const viewStartIdx = Math.max(0, lastRealIdx - 1000); 
            
            const tailRealData = fullData.slice(viewStartIdx).map(d => ({...d}));
            tailRealData[tailRealData.length - 1].predAngle = tailRealData[tailRealData.length - 1].realAngle;
            
            const predData = data.predicted_sequence.map((angle: number, i: number) => ({
                index: lastRealIdx + 1 + i,
                realAngle: null,
                predAngle: angle
            }));
            
            setChartData([...tailRealData, ...predData]);
        }
      }
    } catch (err: any) {
      alert("连接后端失败：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 修改为 100vw 强行占满视口
    <div className="page-stack" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', color: '#3c4043', fontFamily: 'Product Sans, Segoe UI, Roboto, Helvetica, Arial, sans-serif', padding: '100px 0 0', margin: '0', width: '100vw', maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>
        {`
          /* 🚀 终极杀手锏：强制打破 Vite/React 根节点的 1280px 宽度限制 */
          #root, body, html {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden;
          }

          @keyframes slideFadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          .smooth-enter { opacity: 0; animation: slideFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .delay-1 { animation-delay: 0.1s; } .delay-2 { animation-delay: 0.2s; } .delay-3 { animation-delay: 0.3s; }
          
          .google-card {
            background-color: #fff;
            border: 1px solid #dadce0;
            border-radius: 8px;
            transition: all 0.3s ease;
          }
          .google-card:hover {
            border-color: #dadce0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          }
          .google-btn {
            background-color: #1a73e8;
            color: #ffffff;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .google-btn:hover:not(:disabled) {
            background-color: #1a65d3;
            box-shadow: 0 1px 3px rgba(66, 133, 244, 0.3);
          }
          .google-btn:disabled {
            background-color: #dadce0;
            color: #9aa0a6;
            cursor: not-allowed;
          }
          .google-input-area {
            background-color: #f1f3f4;
            border: 2px dashed #dadce0;
            border-radius: 8px;
            transition: border-color 0.3s;
          }
          .google-input-area:hover {
            border-color: #1a73e8;
          }
          
          .bubble-blue { background: #e8f0fe; color: #1a73e8; font-weight: bold; padding: 4px 10px; border-radius: 20px; font-size: 13px; margin-right: 8px; }
          .bubble-green { background: #e6f4ea; color: #1e8e3e; font-weight: bold; padding: 4px 10px; border-radius: 20px; font-size: 13px; margin-right: 8px; }
        `}
      </style>

      {/* 顶部标题栏 */}
      <div className="smooth-enter" style={{ margin: '0 0 28px' }}>
        <div style={{ padding: '20px 40px 10px', display: 'flex', alignItems: 'center' }}>
          <span className="bubble-blue">AI for Science</span>
          <h1 style={{ color: '#202124', fontSize: '32px', fontWeight: 500, margin: '0', letterSpacing: '-0.5px', fontFamily: '"Product Sans", serif' }}>HTPE 模板匹配</h1>
        </div>
        <p style={{ color: '#5f6368', padding: '0 40px', fontSize: '16px', margin: '0' }}>上传 CSV 时序数据，提取角度序列，并使用混合 Transformer 模型反演物理参数。</p>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexGrow: 1, padding: '0 40px 40px 40px', width: '100%', boxSizing: 'border-box' }}>
        
        <div className="google-card smooth-enter delay-1" style={{ flex: '0 0 340px', width: '340px', padding: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#202124', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             实验数据配置
          </h2>
          
          <div style={{ marginBottom: 'auto' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#5f6368', marginBottom: '12px' }}>
              序列数据源（.csv）
            </label>
            <label className="google-input-area" style={{ display: 'block', padding: '20px', cursor: 'pointer', textAlign: 'center', overflow: 'hidden' }}>
              <input type="file" accept=".csv" onChange={handleFileChange} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
              <span style={{ display: 'block', color: '#202124', fontWeight: 700 }}>
                选择 CSV 文件
              </span>
              <span style={{ display: 'block', color: '#5f6368', fontSize: '13px', marginTop: '8px', wordBreak: 'break-all' }}>
                {file ? file.name : "尚未选择文件"}
              </span>
            </label>
          </div>

          <button onClick={startMatching} className="google-btn" disabled={loading || !file}
            style={{ width: '100%', padding: '16px', fontSize: '14px', marginTop: '30px' }}>
            {loading ? '正在反演参数...' : '▶ 开始参数反演'}
          </button>
        </div>

        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div className="google-card smooth-enter delay-2" style={{ flexGrow: 1, minHeight: '450px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#202124', paddingBottom: '16px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {result ? "动力学仿真验证（CPU）" : "序列预览"}
              </span>
              {result && <span style={{ fontSize: '13px', color: '#777', fontWeight: 400 }}>🔵 观测值 | <span style={{color: '#1e8e3e', fontWeight: 'bold'}}>🟢 预测值</span></span>}
            </h3>
            
            <div style={{ flexGrow: 1, paddingTop: '20px', margin: '0 -10px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dadce0" />
                    <XAxis dataKey="index" hide />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#bdc1c6', fontSize: 12 }} axisLine={false} tickLine={false} />
                    
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #dadce0', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: '#202124' }}
                      labelStyle={{ display: 'none' }}
                      itemStyle={{ color: '#202124', fontSize: '13px' }}
                      formatter={(value, name) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                        return [
                          numericValue.toFixed(4),
                          name === 'realAngle' ? "观测角度（rad）" : "预测角度（rad）"
                        ];
                      }}
                    />
                    
                    <Line type="monotone" dataKey="realAngle" stroke="#1a73e8" dot={false} strokeWidth={2.5} opacity={0.9} isAnimationActive={!result} />

                    {result && (
                      <Line type="monotone" dataKey="predAngle" stroke="#1e8e3e" strokeDasharray="6 4" dot={false} strokeWidth={3} isAnimationActive={true} animationDuration={1500} />
                    )}

                    {result && (
                      <ReferenceLine x={fullData.length - 1} stroke="#bdc1c6" strokeDasharray="3 3" 
                        label={{ position: 'top', value: '仿真起点', fill: '#9aa0a6', fontSize: 13, fontWeight: 'bold' }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#444', backgroundColor: '#fff', border: '1px dashed #dadce0', borderRadius: '8px', margin: '0 10px' }}>
                  <span style={{ fontSize: '13px', textTransform: 'uppercase', color: '#9aa0a6' }}>等待数据流...</span>
                </div>
              )}
            </div>
          </div>

          <div className="smooth-enter delay-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
            <div className="google-card" style={{ flex: '1 1 200px', padding: '24px', borderLeft: 'none', backgroundColor: '#fff' }}>
              <div style={{ fontSize: '15px', color: '#5f6368', marginBottom: '12px', fontWeight: 500, display: 'flex', alignItems: 'baseline' }}>
                <span className="bubble-blue">k<sub>1</sub></span>
                阻尼系数
              </div>
              <div style={{ fontSize: '38px', fontWeight: '800', color: result ? '#1a73e8' : '#e0e0e0', fontFamily: 'monospace', letterSpacing: '-1px' }}>
                {result && result.k1 !== undefined ? Number(result.k1).toFixed(6) : "---"}
              </div>
            </div>

            <div className="google-card" style={{ flex: '1 1 200px', padding: '24px', borderLeft: 'none', backgroundColor: '#fff' }}>
              <div style={{ fontSize: '15px', color: '#5f6368', marginBottom: '12px', fontWeight: 500, display: 'flex', alignItems: 'baseline' }}>
                <span className="bubble-green">k<sub>2</sub></span>
                刚度系数
              </div>
              <div style={{ fontSize: '38px', fontWeight: '800', color: result ? '#1e8e3e' : '#e0e0e0', fontFamily: 'monospace', letterSpacing: '-1px' }}>
                {result && result.k2 !== undefined ? Number(result.k2).toFixed(6) : "---"}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
