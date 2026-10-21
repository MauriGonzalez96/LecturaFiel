export type VoiceSource = 'windows' | 'neural' | 'piper'

export interface VoicePrefs {
  source: VoiceSource | null
  voiceId: string | null
  /** Velocidad de lectura (≈0.7–1.35). Default ~0.92. */
  rate?: number
  firstRunDone?: boolean
  defaultApplied?: boolean
  piperFailed?: boolean
}

export interface NeuralVoice {
  id: string
  name: string
  locale: string
  gender: string
  source: 'neural'
}

export interface PiperVoiceInfo {
  id: string
  name: string
  locale: string
  quality: string
  source: 'piper'
  installed: boolean
}

export interface WindowsVoiceInfo {
  id: string
  name: string
  locale: string
  source: 'windows'
}
