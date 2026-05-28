import http from './http'

export interface VideoMetadataTaskOut {
  id: string
  video_asset_id: string
  language: string
  status: string
  error_message: string | null
  progress_detail: Record<string, unknown> | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface VideoMetadataBundleOut {
  subtitle_id: string | null
  vocabulary_id: string | null
  phrases_id: string | null
  expressions_id: string | null
  subtitle_text: string | null
}

export const videoMetadataApi = {
  getActiveTask: (assetId: string): Promise<VideoMetadataTaskOut> =>
    http.get(`/api/v1/assets/${assetId}/metadata-tasks/active`),
  getBundle: (assetId: string): Promise<VideoMetadataBundleOut> =>
    http.get(`/api/v1/assets/${assetId}/metadata`),
}
