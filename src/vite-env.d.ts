/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_LEARNER_ADMIN_API_BASE_URL?: string
  readonly VITE_LEARNER_PREVIEW_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
