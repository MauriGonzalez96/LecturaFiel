import { useMemo, useState } from 'react'
import {
  DEFAULT_AI_CONFIG,
  aiConfigured,
  loadAiConfig,
  saveAiConfig,
} from '../ai/config'
import {
  AI_PROVIDERS,
  detectProvider,
  type AiProviderId,
} from '../ai/providers'
import type { AiConfig } from '../ai/types'

const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey'

interface Props {
  onClose: () => void
  onSaved?: () => void
}

/** Configuración de IA para resúmenes (Gemini / OpenAI / Ollama…). */
export function AiSettingsPanel({ onClose, onSaved }: Props) {
  const [form, setForm] = useState<AiConfig>(() => {
    const loaded = loadAiConfig()
    // Si nunca configuró nada, arrancar en Gemini
    if (!loaded.apiKey && detectProvider(loaded) !== 'gemini') {
      return { ...DEFAULT_AI_CONFIG }
    }
    return loaded
  })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const provider = useMemo(() => detectProvider(form), [form.baseUrl])
  const preset = AI_PROVIDERS.find((p) => p.id === provider)
  const ok = aiConfigured(form)
  const isGemini = provider === 'gemini'

  function update<K extends keyof AiConfig>(key: K, value: AiConfig[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  function applyProvider(id: AiProviderId) {
    const p = AI_PROVIDERS.find((x) => x.id === id)
    if (!p) return
    setForm((f) => ({
      ...f,
      baseUrl: p.config.baseUrl,
      model: p.config.model,
    }))
    setSaved(false)
  }

  function handleSave() {
    saveAiConfig(form)
    setSaved(true)
    onSaved?.()
  }

  function handleReset() {
    setForm({ ...DEFAULT_AI_CONFIG })
    setSaved(false)
  }

  return (
    <div className="ai-settings">
      <header className="ai-settings-head">
        <div>
          <h2>Resúmenes con IA</h2>
          <p className="muted">
            Conectá Gemini (u otro proveedor) con una API key. Se guarda solo en
            este equipo; no hay login dentro de Lectura Fiel.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      </header>

      <div className="ai-provider-row" role="group" aria-label="Proveedor">
        {AI_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`btn ghost ai-provider-btn${provider === p.id ? ' active' : ''}`}
            onClick={() => applyProvider(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isGemini && (
        <ol className="ai-guide">
          <li>
            Abrí{' '}
            <a href={GEMINI_KEY_URL} target="_blank" rel="noopener noreferrer">
              Google AI Studio → API keys
            </a>{' '}
            e iniciá sesión con tu cuenta de Google.
          </li>
          <li>
            Pulsá <strong>Create API key</strong> (Crear clave de API). Si te
            pide un proyecto, elegí el que ofrezca o creá uno nuevo.
          </li>
          <li>
            Copiá la clave completa (empieza con algo como{' '}
            <code>AIza…</code>). No la compartas.
          </li>
          <li>
            Volvé acá, pegala en el campo <strong>API key</strong> de abajo y
            pulsá <strong>Guardar</strong>.
          </li>
          <li>
            Andá a la pestaña <strong>Resumen IA</strong> del libro y generá el
            resumen del capítulo.
          </li>
        </ol>
      )}

      {!isGemini && preset && (
        <p className="settings-hint">{preset.hint}</p>
      )}

      <label className="ai-field">
        API key {isGemini ? '(Gemini)' : ''}
        <div className="ai-key-row">
          <input
            type={showKey ? 'text' : 'password'}
            value={form.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder={
              preset && !preset.needsKey
                ? '(opcional en Ollama local)'
                : isGemini
                  ? 'Pegá acá la key de AI Studio (AIza…)'
                  : 'Pegá tu API key…'
            }
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowKey((v) => !v)}
            title={showKey ? 'Ocultar key' : 'Mostrar key'}
          >
            {showKey ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </label>

      <details className="ai-advanced">
        <summary>Opciones avanzadas (URL y modelo)</summary>
        <label className="ai-field">
          URL base
          <input
            type="url"
            value={form.baseUrl}
            onChange={(e) => update('baseUrl', e.target.value)}
            placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
            autoComplete="off"
          />
        </label>
        <label className="ai-field">
          Modelo
          <input
            type="text"
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            placeholder="gemini-3-flash-preview"
            autoComplete="off"
          />
        </label>
        {isGemini && (
          <p className="settings-hint">
            Recomendado: <code>gemini-3-flash-preview</code>. Alternativas:{' '}
            <code>gemini-flash-latest</code>,{' '}
            <code>gemini-3.1-flash-lite-preview</code>. Si un modelo satura o
            fue retirado, la app prueba otro automáticamente.
          </p>
        )}
      </details>

      <p className={`ai-status ${ok ? 'ok' : 'warn'}`}>
        {ok
          ? isGemini
            ? 'Gemini configurado. Ya podés generar resúmenes.'
            : 'Listo para resumir capítulos.'
          : isGemini
            ? 'Falta pegar la API key de Google AI Studio.'
            : 'Falta la API key (o elegí Ollama local).'}
      </p>

      <div className="ai-actions">
        <button
          type="button"
          className="btn primary"
          onClick={handleSave}
          disabled={!ok && Boolean(preset?.needsKey)}
        >
          Guardar
        </button>
        <button type="button" className="btn ghost" onClick={handleReset}>
          Restablecer
        </button>
        {isGemini && (
          <a
            className="btn ghost"
            href={GEMINI_KEY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir AI Studio
          </a>
        )}
        {saved && <span className="muted">Guardado.</span>}
      </div>
    </div>
  )
}
