import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── IndexedDB: initialise the local cache database at app startup ─────────────
// This is fire-and-forget. If IndexedDB is unavailable the app still works
// normally — it just won't have local caching capability.
import { initializeDatabase } from './services/indexeddb/index.js'
initializeDatabase().catch((err) => {
  console.warn('[INDEXEDDB] Startup initialisation failed (non-fatal):', err)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
