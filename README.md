# AI for Science

一个面向科研工作流的前端原型项目，当前提供 3 个独立模块：

- 图像识别
- 模板匹配
- 时序预测

目前版本为纯前端静态原型，重点是页面结构、模块边界和后续模型接入的扩展点；暂未接入真实后端或模型服务。

## 功能模块

### 1. 图像识别

- 以单摆实验为默认示例
- 展示样本预览、识别对象、关键点坐标和整体置信度
- 后续可替换为真实图像识别/关键点检测模型

### 2. 模板匹配

- 展示目标模板、输入样本特征、约束条件和匹配策略
- 输出推荐模板、匹配度和候选模板列表
- 后续可接入模板库检索或相似度模型

### 3. 时序预测

- 以 PANORAMA 单摆实验真实模型输出为默认示例，展示预测配置、任务状态、趋势图、指标和评估表
- 使用前端 mock service 模拟任务式接口，流程为配置内置单摆数据集、运行预测任务、查看状态和预测结果
- 默认结果由 `assets/PANORAMA_PROJECT-master` 中的 `panorama_model.pth` 和 `pendulum_data_updated.csv` 生成
- 后续接入真实模型服务时，可替换 `src/features/timeSeriesForecast/mockForecastService.ts`

## 技术栈

- React 19
- Vite
- TypeScript
- React Router
- Vitest + Testing Library
- Docker + Nginx

## 本地启动

### 方式 1：开发模式

```bash
npm install
npm run dev
```

启动后打开终端输出的本地地址，通常是：

```text
http://localhost:5173
```

### 方式 2：Docker

```bash
docker compose up --build
```

启动后访问：

```text
http://localhost:8080
```

## 页面路由

- `/` 首页
- `/image-recognition` 图像识别
- `/template-matching` 模板匹配
- `/time-series-forecast` 时序预测

## 常用命令

```bash
npm test
npm run build
assets/PANORAMA_PROJECT-master/.venv/bin/python scripts/generate_panorama_forecast_fixture.py
docker build -t ai-for-science-frontend:test .
```

## 项目结构

```text
src/
  components/            共享 UI 组件
  features/
    imageRecognition/    图像识别模块
    templateMatching/    模板匹配模块
    timeSeriesForecast/  时序预测模块
  pages/                 页面级组件
  styles/                全局样式与布局
```

## 当前状态

- 已完成三模块前端原型
- 已支持响应式首页布局
- 已提供 Docker 部署方式
- 已通过本地测试与生产构建验证

## 后续可扩展方向

- 接入真实模型 API
- 增加文件上传与任务状态反馈
- 增加实验结果持久化
- 增加更多 AI for Science 子模块
