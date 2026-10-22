import { useCallback, useEffect, useState } from 'react'
import {
  addUserEveryday,
  clearUserEveryday,
  listUserEveryday,
  removeUserEveryday,
  subscribeUserEveryday,
} from '../data/userEveryday'

export function useUserEveryday() {
  const [words, setWords] = useState<string[]>(() => listUserEveryday())

  useEffect(() => subscribeUserEveryday(() => setWords(listUserEveryday())), [])

  const add = useCallback((...raw: string[]) => addUserEveryday(...raw), [])
  const remove = useCallback((word: string) => removeUserEveryday(word), [])
  const clear = useCallback(() => clearUserEveryday(), [])

  return { words, add, remove, clear, count: words.length }
}
