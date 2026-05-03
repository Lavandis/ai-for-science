# AI for Science

一个面向科研工作流的前端原型项目，当前提供 3 个独立模块：

- 图像识别
- 模板匹配
- 时序预测

目前版本包含 React 前端和 FastAPI 后端。图像识别、模板匹配仍保留现有演示/接口入口；时序预测已接入 PANORAMA 后端实时推理。

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

- 以 PANORAMA 单摆实验真实模型为默认示例，展示预测配置、任务状态、趋势图、指标和评估表
- 前端点击“运行预测”后调用 FastAPI 任务接口，由后端实时加载 `panorama_model.pth` 和 `pendulum_data_updated.csv` 执行滚动预测
- 前端测试环境仍保留 mock service，真实运行默认调用 `http://127.0.0.1:8000`
- API 契约集中在 `src/features/timeSeriesForecast/forecastContract.ts`，HTTP service 位于 `src/features/timeSeriesForecast/forecastService.ts`

## 技术栈

- React 19
- Vite
- TypeScript
- React Router
- Vitest + Testing Library
- Docker + Nginx

## 本地启动

### 方式 1：前后端开发模式

```bash
npm install
assets/PANORAMA_PROJECT-master/.venv/bin/python -m pip install -r requirements-backend.txt
assets/PANORAMA_PROJECT-master/.venv/bin/python main.py
```

另开一个终端启动前端：

```bash
npm run dev
```

启动后打开前端地址，通常是：

```text
http://localhost:5173
```

后端默认运行在：

```text
http://127.0.0.1:8000
```

如果后端地址不同，可以在前端启动前设置：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
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
assets/PANORAMA_PROJECT-master/.venv/bin/python -m unittest tests.test_forecast_api tests.test_panorama_forecast_service
assets/PANORAMA_PROJECT-master/.venv/bin/python main.py
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
- 时序预测已支持 FastAPI 后端实时 PANORAMA 推理
- 已支持响应式首页布局
- 已提供 Docker 部署方式
- 已通过本地测试与生产构建验证

## 后续可扩展方向

- 将图像识别和模板匹配后端依赖整理为可移植配置
- 增加文件上传与任务状态反馈
- 增加实验结果持久化
- 增加更多 AI for Science 子模块
