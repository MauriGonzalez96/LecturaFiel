import { useRef, useState } from 'react'
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_LABEL,
  ingestFile,
} from '../ingest/ingestFile'
import type { IngestedBook } from '../ingest/types'

interface Props {
  onBook: (book: IngestedBook) => void
}

export function FileUpload({ onBook }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File | undefined | null) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const book = await ingestFile(file)
      onBook(book)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="upload">
      <div
        className={`dropzone${dragOver ? ' over' : ''}${busy ? ' busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void handleFile(e.dataTransfer.files[0])
        }}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          hidden
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <p className="drop-title">
          {busy ? 'Leyendo el archivo…' : 'Subí tu libro'}
        </p>
        <p className="drop-hint">
          Arrastrá o elegí un archivo · {ACCEPTED_LABEL}
        </p>
      </div>
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
