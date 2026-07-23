import { create } from 'zustand'
import type { AtbReactionDocument } from '../../types/atbReactionV2'
import type { EditorSelection } from '../../types/atbReactionV2Editor'
import {
  DRAFT_STORAGE_KEY,
  createEmptyDocument,
  normalizeSelection,
  parseDocumentImport,
} from '../../types/atbReactionV2Editor'

const HISTORY_LIMIT = 100
/** 同组编辑（如连续打字）在该时间窗内合并为一条撤销记录 */
const HISTORY_GROUP_WINDOW_MS = 1200
const PERSIST_DEBOUNCE_MS = 400
const NOTES_STORAGE_KEY = 'atb_v2_editor_notes_v1'

function loadInitialDoc(): AtbReactionDocument {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (raw) return parseDocumentImport(raw)
  } catch {
    // 草稿损坏时从空文档开始
  }
  return createEmptyDocument()
}

/** 教研走查备注：挂在具体节点上，可标记出问题的组件类型 */
export interface NodeNote {
  id: string
  activityId: string
  nodeId: string
  /** 创建时的位置快照（如 A2 · 节点3），节点被删后仍可阅读 */
  locationLabel: string
  /** 出问题的组件/维度，如 语音、字幕 */
  tag: string | null
  text: string
  createdAt: number
  done: boolean
}

function loadInitialNotes(): NodeNote[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as NodeNote[]
    }
  } catch {
    // 备注损坏时从空列表开始
  }
  return []
}

export interface UpdateDocOptions {
  /**
   * 相同 historyGroup 且间隔小于合并窗口的连续更新，只记一条撤销记录。
   * 文本输入类更新务必传入（如 `speech-text:{nodeId}`）。
   */
  historyGroup?: string
}

interface AtbV2EditorState {
  doc: AtbReactionDocument
  selection: EditorSelection
  past: AtbReactionDocument[]
  future: AtbReactionDocument[]
  lastHistoryGroup: string | null
  lastHistoryAt: number
  notes: NodeNote[]

  setSelection: (selection: EditorSelection) => void
  addNote: (note: Omit<NodeNote, 'id' | 'createdAt' | 'done'>) => void
  toggleNoteDone: (id: string) => void
  removeNote: (id: string) => void
  /** 常规编辑入口：记录撤销历史 */
  updateDoc: (
    updater: (prev: AtbReactionDocument) => AtbReactionDocument,
    options?: UpdateDocOptions,
  ) => void
  /** 导入 / 批量应用：整体替换并记一条历史 */
  replaceDoc: (doc: AtbReactionDocument) => void
  /** 清空草稿并清空历史 */
  resetDraft: () => void
  importDocument: (text: string) => void
  undo: () => void
  redo: () => void
}

export const useAtbV2EditorStore = create<AtbV2EditorState>((set, get) => ({
  doc: loadInitialDoc(),
  selection: { kind: 'lesson' },
  past: [],
  future: [],
  lastHistoryGroup: null,
  lastHistoryAt: 0,
  notes: loadInitialNotes(),

  setSelection: (selection) => set({ selection }),

  addNote: (note) =>
    set((state) => ({
      notes: [
        { ...note, id: crypto.randomUUID(), createdAt: Date.now(), done: false },
        ...state.notes,
      ],
    })),

  toggleNoteDone: (id) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)),
    })),

  removeNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

  updateDoc: (updater, options) => {
    const { doc, past, lastHistoryGroup, lastHistoryAt, selection } = get()
    const next = updater(doc)
    if (next === doc) return

    const now = Date.now()
    const group = options?.historyGroup ?? null
    const mergeWithLast =
      group !== null &&
      group === lastHistoryGroup &&
      now - lastHistoryAt < HISTORY_GROUP_WINDOW_MS &&
      past.length > 0

    const nextPast = mergeWithLast ? past : [...past, doc].slice(-HISTORY_LIMIT)

    set({
      doc: next,
      past: nextPast,
      future: [],
      lastHistoryGroup: group,
      lastHistoryAt: now,
      selection: normalizeSelection(next, selection),
    })
  },

  replaceDoc: (next) => {
    const { doc, past, selection } = get()
    set({
      doc: next,
      past: [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      lastHistoryGroup: null,
      lastHistoryAt: 0,
      selection: normalizeSelection(next, selection),
    })
  },

  resetDraft: () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    set({
      doc: createEmptyDocument(),
      past: [],
      future: [],
      lastHistoryGroup: null,
      lastHistoryAt: 0,
      selection: { kind: 'lesson' },
    })
  },

  importDocument: (text) => {
    const parsed = parseDocumentImport(text)
    get().replaceDoc(parsed)
  },

  undo: () => {
    const { doc, past, future, selection } = get()
    if (!past.length) return
    const prev = past[past.length - 1]!
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [doc, ...future].slice(0, HISTORY_LIMIT),
      lastHistoryGroup: null,
      lastHistoryAt: 0,
      selection: normalizeSelection(prev, selection),
    })
  },

  redo: () => {
    const { doc, past, future, selection } = get()
    if (!future.length) return
    const next = future[0]!
    set({
      doc: next,
      past: [...past, doc].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      lastHistoryGroup: null,
      lastHistoryAt: 0,
      selection: normalizeSelection(next, selection),
    })
  },
}))

if (import.meta.env.DEV) {
  // 本地调试 / 自动化测试探针
  ;(window as unknown as Record<string, unknown>).__atbV2Store = useAtbV2EditorStore
}

// 草稿持久化：文档变化后防抖写入 localStorage
let persistTimer: number | undefined
let lastPersistedDoc = useAtbV2EditorStore.getState().doc
useAtbV2EditorStore.subscribe((state) => {
  if (state.doc === lastPersistedDoc) return
  lastPersistedDoc = state.doc
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(useAtbV2EditorStore.getState().doc))
    } catch {
      // localStorage 配额不足时静默失败（大文档建议尽快导出 JSON）
    }
  }, PERSIST_DEBOUNCE_MS)
})

// 备注持久化：变化即写（数据量小，无需防抖）
let lastPersistedNotes = useAtbV2EditorStore.getState().notes
useAtbV2EditorStore.subscribe((state) => {
  if (state.notes === lastPersistedNotes) return
  lastPersistedNotes = state.notes
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(state.notes))
  } catch {
    // 忽略配额错误
  }
})
