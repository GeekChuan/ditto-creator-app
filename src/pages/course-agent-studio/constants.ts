import type { PipelineStep, StudioOptions } from './types'

export const STYLE_OPTIONS = ['专业', '创意', '轻松'] as const
export const FORMAT_OPTIONS = ['互动课', '讲解课', '测验驱动'] as const
export const LANGUAGE_OPTIONS = ['全英文', '中英混合', '全中文'] as const

export const DEFAULT_OPTIONS: StudioOptions = {
  style: '专业',
  format: '互动课',
  language: '中英混合',
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 'video-understanding',
    label: '视频理解与镜头切分',
    durationMs: 3200,
    logTemplates: [
      '> [vision] loading video stream ...',
      '> [vision] extracting keyframes at 1fps ...',
      '> [vision] detected 12 scene boundaries',
      '> [vision] scene 01 → label: "classroom_intro" (conf=0.94)',
      '> [vision] scene 02 → label: "whiteboard_diagram" (conf=0.88)',
      '> [vision] scene 03 → label: "presenter_closeup" (conf=0.91)',
      '> [vision] shot segmentation complete — 12 clips',
    ],
  },
  {
    id: 'knowledge-extraction',
    label: '知识点抽取与课程大纲',
    durationMs: 3600,
    logTemplates: [
      '> [llm] transcribing audio track ...',
      '> [llm] transcript length: 2,841 tokens',
      '> [llm] extracting key concepts ...',
      '> [llm] concept [1/6]: "Phonics Blending" (salience=0.92)',
      '> [llm] concept [2/6]: "Short Vowel Rules" (salience=0.87)',
      '> [llm] concept [3/6]: "Sight Words: CEFR A1" (salience=0.79)',
      '> [llm] generating lesson outline ...',
      '> [llm] outline ready — 6 nodes mapped',
    ],
  },
  {
    id: 'interaction-design',
    label: '互动节点与测验设计',
    durationMs: 3000,
    logTemplates: [
      '> [agent] designing interaction nodes ...',
      '> [agent] node L1 → type: hook, trigger: t=00:08',
      '> [agent] node L2 → type: concept, duration: 45s',
      '> [agent] node L3 → type: practice, question_count: 3',
      '> [agent] node L4 → type: practice, question_count: 2',
      '> [agent] node L5 → type: practice, question_count: 4',
      '> [agent] node L6 → type: quiz, pass_threshold: 0.75',
      '> [agent] interaction graph validated ✓',
    ],
  },
  {
    id: 'script-generation',
    label: '多语言脚本生成',
    durationMs: 4000,
    logTemplates: [
      '> [script] language_mode=zh_en_mixed',
      '> [script] style=professional, format=interactive',
      '> [script] rendering node L1 script ...',
      '> [script] rendering node L2 script — bilingual overlay enabled',
      '> [script] rendering node L3 prompts (3 items) ...',
      '> [script] rendering node L4 prompts (2 items) ...',
      '> [script] rendering node L5 prompts (4 items) ...',
      '> [script] rendering node L6 quiz (6 items) ...',
      '> [script] all scripts rendered — 1,204 tokens',
    ],
  },
  {
    id: 'tts-render',
    label: 'TTS 与字幕渲染',
    durationMs: 3400,
    logTemplates: [
      '> [tts] initializing voice model: "nova-bilingual-v2"',
      '> [tts] synthesizing L1 audio (00:08) ...',
      '> [tts] synthesizing L2 audio (00:45) ...',
      '> [tts] synthesizing L3 prompts ...',
      '> [tts] subtitle alignment: WebVTT format',
      '> [tts] subtitle confidence avg: 0.97',
      '> [tts] all audio + subtitle tracks ready',
    ],
  },
  {
    id: 'qa-export',
    label: '课程包质检与导出',
    durationMs: 2800,
    logTemplates: [
      '> [qa] running schema validation ...',
      '> [qa] checking node timing constraints ...',
      '> [qa] checking CEFR level consistency ...',
      '> [qa] all checks passed ✓',
      '> [export] bundling lesson package ...',
      '> [export] lesson.json — 48 KB',
      '> [export] assets bundle — 12.3 MB',
      '> [export] package fingerprint: sha256:3a9f...',
      '> Course Render Agent completed successfully ✓',
    ],
  },
]

export function buildInitialLogLines(options: StudioOptions): string[] {
  const langCode =
    options.language === '全英文'
      ? 'en_only'
      : options.language === '全中文'
        ? 'zh_only'
        : 'zh_en_mixed'
  return [
    '> Course Render Agent v2.1.0 starting ...',
    `> config: style=${options.style === '专业' ? 'professional' : options.style === '创意' ? 'creative' : 'casual'}`,
    `> config: format=${options.format === '互动课' ? 'interactive' : options.format === '讲解课' ? 'lecture' : 'quiz_driven'}`,
    `> config: language_mode=${langCode}`,
    '> pipeline initialized — 6 steps queued',
  ]
}

export const MOCK_LESSON_JSON = `{
  "lesson_id": "ditto-gen-001",
  "title": "Phonics & Blending Fundamentals",
  "cefr_range": "A1-A2",
  "language_mode": "zh_en_mixed",
  "nodes": [
    { "type": "hook",     "id": "L1", "trigger_at": 8 },
    { "type": "concept",  "id": "L2", "duration": 45 },
    { "type": "practice", "id": "L3", "questions": 3 },
    { "type": "practice", "id": "L4", "questions": 2 },
    { "type": "practice", "id": "L5", "questions": 4 },
    { "type": "quiz",     "id": "L6", "pass_threshold": 0.75 }
  ],
  "estimated_duration_min": 12,
  "interaction_count": 9
}`
