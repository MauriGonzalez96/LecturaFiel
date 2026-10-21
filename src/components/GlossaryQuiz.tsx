import { useEffect, useState } from 'react'
import type { GlossaryItem } from '../types/lexicon'

interface Props {
  items: GlossaryItem[]
}

type Phase = 'prompt' | 'reveal'

/**
 * Repaso ligero: muestra la palabra y pide recordar el significado
 * (útil tras escuchar el capítulo adaptado).
 */
export function GlossaryQuiz({ items }: Props) {
  const itemKey = items.map((i) => i.id).join('|')
  const [deck, setDeck] = useState<GlossaryItem[]>(() => shuffle([...items]))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('prompt')
  const [known, setKnown] = useState(0)

  useEffect(() => {
    setDeck(shuffle([...items]))
    setIndex(0)
    setPhase('prompt')
    setKnown(0)
    // itemKey captura el cambio de capítulo / glosario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey])

  if (items.length === 0) {
    return (
      <div className="quiz empty">
        <p>No hay entradas para repasar en este capítulo.</p>
      </div>
    )
  }

  const card = deck[index % Math.max(deck.length, 1)]
  const done = index >= deck.length

  if (done || !card) {
    return (
      <div className="quiz done">
        <p className="quiz-score">
          Repaso terminado: reconociste <strong>{known}</strong> de{' '}
          <strong>{deck.length}</strong>.
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setDeck(shuffle([...items]))
            setIndex(0)
            setKnown(0)
            setPhase('prompt')
          }}
        >
          Repetir
        </button>
      </div>
    )
  }

  return (
    <div className="quiz">
      <p className="quiz-progress">
        {index + 1} / {deck.length}
      </p>
      <div className="quiz-card">
        <p className="quiz-word">{card.word}</p>
        {phase === 'reveal' ? (
          <>
            <p className="quiz-def">{card.definition}</p>
            {card.audioExpression && (
              <p className="quiz-meta">
                En el audio: <em>{card.audioExpression}</em>
              </p>
            )}
            <div className="quiz-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setPhase('prompt')
                  setIndex((i) => i + 1)
                }}
              >
                Aún no
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setKnown((k) => k + 1)
                  setPhase('prompt')
                  setIndex((i) => i + 1)
                }}
              >
                La sabía
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={() => setPhase('reveal')}
          >
            Ver significado
          </button>
        )}
      </div>
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}
