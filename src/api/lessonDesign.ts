import http from './http'

export type TranslateLessonDirection = 'en_to_zh' | 'zh_to_en'

export interface TranslateLessonTextResponse {
  translated: string
}

export const lessonDesignApi = {
  translateLessonText: (body: { direction: TranslateLessonDirection; text: string }) =>
    http.post('/dev/translate-lesson-text', body, {
      timeout: 120_000,
    }) as Promise<TranslateLessonTextResponse>,
}
