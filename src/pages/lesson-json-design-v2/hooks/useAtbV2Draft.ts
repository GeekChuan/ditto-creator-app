import { useCallback, useEffect, useRef, useState } from 'react'
import type { AtbReactionDocument } from '../../../types/atbReactionV2'
import {
  DRAFT_STORAGE_KEY,
  createEmptyDocument,
  parseDocumentImport,
} from '../../../types/atbReactionV2Editor'

export function useAtbV2Draft() {
  const [doc, setDoc] = useState<AtbReactionDocument>(createEmptyDocument)
  const [hydrated, setHydrated] = useState(false)
  const skipSave = useRef(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        setDoc(parseDocumentImport(raw))
      }
    } catch {
      // ignore corrupt draft
    }
    setHydrated(true)
    skipSave.current = false
  }, [])

  useEffect(() => {
    if (!hydrated || skipSave.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(doc))
      } catch {
        // quota exceeded
      }
    }, 400)
    return () => clearTimeout(t)
  }, [doc, hydrated])

  const resetDraft = useCallback(() => {
    skipSave.current = true
    const empty = createEmptyDocument()
    setDoc(empty)
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    skipSave.current = false
  }, [])

  const importDocument = useCallback((text: string) => {
    const parsed = parseDocumentImport(text)
    setDoc(parsed)
  }, [])

  const updateDoc = useCallback(
    (updater: AtbReactionDocument | ((prev: AtbReactionDocument) => AtbReactionDocument)) => {
      setDoc((prev) => (typeof updater === 'function' ? updater(prev) : updater))
    },
    [],
  )

  return { doc, setDoc: updateDoc, hydrated, resetDraft, importDocument }
}
