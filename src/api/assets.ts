import axios from 'axios'
import http from './http'

export interface VideoAsset {
  id: string
  title: string | null
  video_url: string
  video_access_url?: string | null
  cover_url: string | null
  cover_access_url?: string | null
  cover_width: number | null
  cover_height: number | null
  video_width: number | null
  video_height: number | null
  duration: number | null
  source_url: string | null
  author: string | null
  description: string | null
  subtitle_status: 'none' | 'processing' | 'ready'
  created_at: string
  updated_at: string
}

export interface PaginatedAssets {
  total: number
  page: number
  page_size: number
  items: VideoAsset[]
}

export interface AssetListParams {
  page?: number
  page_size?: number
  keyword?: string
}

export interface PresignRequest {
  filename: string
  content_type: string
}

export interface PresignResponse {
  upload_url: string
  public_url: string
}

export interface AssetUploadResponse {
  public_url: string
  object_key: string
}

/** 本地联调默认走后端转存，避免 OSS 桶未配 CORS 导致浏览器 PUT 失败 */
function preferServerSideUpload(): boolean {
  if (import.meta.env.VITE_OSS_DIRECT_UPLOAD === 'true') return false
  if (import.meta.env.VITE_OSS_UPLOAD_PROXY === 'true') return true
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  try {
    const host = new URL(base).hostname
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return base.includes('localhost') || base.includes('127.0.0.1')
  }
}

export interface PlaybackUrlRequest {
  file_url: string
  expires?: number
  nonce?: number
}

export interface PlaybackUrlResponse {
  play_url: string
  expires: number
}

export interface VideoAssetUpdate {
  title?: string | null
  author?: string | null
  description?: string | null
  source_url?: string | null
  cover_url?: string | null
  cover_width?: number | null
  cover_height?: number | null
}

export interface MinimaxTtsRequest {
  text: string
  model?: string
  voice_id?: string
  speed?: number
  vol?: number
  pitch?: number
  emotion?: string
  pronunciation_tones?: string[]
  subtitle_enable?: boolean
  subtitle_type?: string
  sample_rate?: number
  bitrate?: number
  audio_format?: string
  channel?: number
  /** 与 Minimax 一致；标准返回常为 url */
  output_format?: 'hex' | 'url'
}

export interface MinimaxTtsResponse {
  audio_url: string
  audio_duration: number | null
}

export interface XiaohongshuImportRequest {
  note_url: string
  title?: string | null
}

export interface VideoAssetCreate {
  title?: string | null
  video_url: string
  cover_url?: string | null
  cover_width?: number | null
  cover_height?: number | null
  video_width?: number | null
  video_height?: number | null
  duration?: number | null
  source_url?: string | null
  author?: string | null
  description?: string | null
}

export interface SubtitleTaskCreate {
  tool_id: 'speech-recognition-bigmodel'
  language: string
  note?: string
}

export interface SubtitleTask {
  id: string
  video_asset_id: string
  tool_id: string
  status: string
  created_at: string
}

export interface SubtitleData {
  id: string
  video_asset_id: string
  text: string | null
  segments: Array<Record<string, unknown>> | null
  source_tool: string
  created_at: string
  updated_at: string
}

export const assetsApi = {
  list: (params?: AssetListParams): Promise<PaginatedAssets> =>
    http.get('/api/v1/assets', { params }),

  presign: (body: PresignRequest): Promise<PresignResponse> =>
    http.post('/api/v1/assets/presign', body),

  inferContentType: (filename: string, fileType?: string): string => {
    if (fileType && fileType.trim()) return fileType
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const mimeMap: Record<string, string> = {
      // image
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      // video
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      m4v: 'video/x-m4v',
      // audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      flac: 'audio/flac',
      ogg: 'audio/ogg',
    }
    return mimeMap[ext] || 'application/octet-stream'
  },

  uploadToCos: async (
    uploadUrl: string,
    file: File,
    contentType: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> => {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': contentType,
      },
      timeout: 0,
      onUploadProgress: (event) => {
        if (!event.total) return
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100))
        onProgress?.(percent)
      },
    })
  },

  uploadViaServer: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<AssetUploadResponse> => {
    const form = new FormData()
    form.append('file', file)
    return http.post('/api/v1/assets/upload', form, {
      timeout: 0,
      onUploadProgress: (event) => {
        if (!event.total) return
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100))
        onProgress?.(percent)
      },
    })
  },

  /** 预签名直传 OSS，或经后端转存（本地默认后者，规避桶 CORS） */
  uploadFile: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ public_url: string }> => {
    if (preferServerSideUpload()) {
      return assetsApi.uploadViaServer(file, onProgress)
    }
    const ct = assetsApi.inferContentType(file.name, file.type)
    const presign = await assetsApi.presign({ filename: file.name, content_type: ct })
    onProgress?.(10)
    await assetsApi.uploadToCos(presign.upload_url, file, ct, onProgress)
    return { public_url: presign.public_url }
  },

  create: (body: VideoAssetCreate): Promise<VideoAsset> =>
    http.post('/api/v1/assets', body),

  importFromXiaohongshu: (body: XiaohongshuImportRequest): Promise<VideoAsset> =>
    http.post('/api/v1/assets/import/xiaohongshu', body, { timeout: 0 }),

  minimaxTts: (body: MinimaxTtsRequest): Promise<MinimaxTtsResponse> =>
    http.post('/api/v1/assets/tts/minimax', body, { timeout: 120_000 }),

  update: (id: string, body: VideoAssetUpdate): Promise<VideoAsset> =>
    http.patch(`/api/v1/assets/${id}`, body),

  getPlaybackUrl: (body: PlaybackUrlRequest): Promise<PlaybackUrlResponse> =>
    http.post('/api/v1/assets/playback-url', body, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    }),

  createSubtitleTask: (assetId: string, body: SubtitleTaskCreate): Promise<SubtitleTask> =>
    http.post(`/api/v1/assets/${assetId}/subtitle-tasks`, body),

  getSubtitle: (assetId: string): Promise<SubtitleData> =>
    http.get(`/api/v1/assets/${assetId}/subtitle`),
}
