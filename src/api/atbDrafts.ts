import http from './http'
import type { AtbReactionDocument } from '../types/atbReactionV2'
import type { NodeNote } from '../pages/lesson-json-design-v2/store'

export interface AtbDraft {
  id: string
  title: string
  latest_version_no: number
  created_at: string
  updated_at: string
}

export interface AtbDraftVersionMeta {
  id: string
  version_no: number
  remark: string | null
  note_count: number
  open_note_count: number
  created_at: string
}

export interface AtbDraftVersion {
  id: string
  draft_id: string
  version_no: number
  document: AtbReactionDocument
  notes: NodeNote[]
  remark: string | null
  created_at: string
}

export const atbDraftsApi = {
  list: (): Promise<AtbDraft[]> => http.get('/api/v1/atb-drafts'),

  create: (body: {
    title: string
    document: AtbReactionDocument
    notes: NodeNote[]
    remark?: string
  }): Promise<AtbDraft> => http.post('/api/v1/atb-drafts', body, { timeout: 60_000 }),

  rename: (draftId: string, title: string): Promise<AtbDraft> =>
    http.patch(`/api/v1/atb-drafts/${draftId}`, { title }),

  remove: (draftId: string): Promise<void> => http.delete(`/api/v1/atb-drafts/${draftId}`),

  saveVersion: (
    draftId: string,
    body: { document: AtbReactionDocument; notes: NodeNote[]; remark?: string },
  ): Promise<AtbDraftVersion> =>
    http.post(`/api/v1/atb-drafts/${draftId}/versions`, body, { timeout: 60_000 }),

  listVersions: (draftId: string): Promise<AtbDraftVersionMeta[]> =>
    http.get(`/api/v1/atb-drafts/${draftId}/versions`),

  getVersion: (draftId: string, versionNo: number): Promise<AtbDraftVersion> =>
    http.get(`/api/v1/atb-drafts/${draftId}/versions/${versionNo}`),
}
