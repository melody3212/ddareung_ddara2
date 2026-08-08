import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyMapDefaultsFromPreferences } from './features/profile'
import './index.css'
import App from './App.tsx'

applyMapDefaultsFromPreferences()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
