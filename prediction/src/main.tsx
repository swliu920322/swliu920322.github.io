/**
 * KOL Prediction — standalone static app (GitHub Pages).
 * 复用 Next 版 prediction 的展示组件，数据改走静态文件（kol/ 目录投放），无后端依赖。
 */
import { createRoot } from 'react-dom/client';
import PredictionApp from './prediction-app';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<PredictionApp />);
}