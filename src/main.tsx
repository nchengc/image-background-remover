import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/App';
import '@/index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('未找到挂载节点 #root，请检查 index.html');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
