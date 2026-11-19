import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { migrateLegacyLocalStorage } from './storage/migrateLegacy'
import {
  applyResolvedTheme,
  readThemePreference,
  resolveTheme,
  systemPrefersDark,
} from './theme/theme'
import './index.css'

migrateLegacyLocalStorage()
applyResolvedTheme(resolveTheme(readThemePreference(), systemPrefersDark()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
