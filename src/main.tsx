import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfills for Node.js dependencies
import { Buffer } from 'buffer'

// Type declaration for global polyfills
declare global {
  interface Window {
    Buffer: typeof Buffer
    process: any
  }
}

// Global polyfills
window.Buffer = Buffer
window.process = {
  env: {},
  version: 'v18.0.0',
  platform: 'browser',
  browser: true,
  cwd: () => '/',
  nextTick: (callback: Function) => setTimeout(callback, 0),
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)