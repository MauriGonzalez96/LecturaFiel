import {
  clampSpeechRate,
  DEFAULT_SPEECH_RATE,
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  SPEECH_RATE_STEP,
  speechRateLabel,
} from '../voices/rate'

interface Props {
  rate: number
  onChange: (rate: number) => void
  compact?: boolean
  disabled?: boolean
}

/** Slider de velocidad de lectura (Windows / Piper / Neural). */
export function SpeechRateControl({
  rate,
  onChange,
  compact = false,
  disabled = false,
}: Props) {
  const value = clampSpeechRate(rate || DEFAULT_SPEECH_RATE)

  return (
    <label
      className={compact ? 'speech-rate speech-rate-compact' : 'speech-rate'}
      title="Velocidad de la voz"
    >
      <span className="speech-rate-label">
        Velocidad{' '}
        <strong>
          {speechRateLabel(value)} ({value.toFixed(2)}×)
        </strong>
      </span>
      <input
        type="range"
        min={SPEECH_RATE_MIN}
        max={SPEECH_RATE_MAX}
        step={SPEECH_RATE_STEP}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clampSpeechRate(Number(e.target.value)))}
      />
      {!compact && (
        <span className="speech-rate-ends" aria-hidden="true">
          <span>Lenta</span>
          <span>Rápida</span>
        </span>
      )}
    </label>
  )
}
