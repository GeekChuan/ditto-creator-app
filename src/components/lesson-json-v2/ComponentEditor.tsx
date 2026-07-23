import { Form, Input, InputNumber, Switch } from 'antd'
import type {
  AtbActivity,
  AtbSrcAsset,
  SceneComponent,
  SubtitleCue,
} from '../../types/atbReactionV2'
import { isSubmergeSequenceActivity } from '../../types/atbReactionV2'
import ImageOssUploadField from '../ImageOssUploadField'
import FollowReadingPreview from './FollowReadingPreview'
import GuidedSpeakingPreview from './GuidedSpeakingPreview'
import KnowledgeCardPreview from './KnowledgeCardPreview'
import SingleChoicePreview from './SingleChoicePreview'
import TeacherAvatarPreview from './TeacherAvatarPreview'
import VoiceQaSimplePreview from './VoiceQaSimplePreview'
import SrcIdSelect from './SrcIdSelect'
import FollowReadingComponentForm from './components/FollowReadingComponentForm'
import SingleChoiceComponentForm from './components/SingleChoiceComponentForm'
import SpeechComponentForm from './components/SpeechComponentForm'
import VoiceQaSimpleComponentForm from './components/VoiceQaSimpleComponentForm'
import GuidedSpeakingComponentForm from './components/GuidedSpeakingComponentForm'
import OralOutputComponentForm from './components/OralOutputComponentForm'
import VideoPlayComponentForm from './components/VideoPlayComponentForm'

interface Props {
  component: SceneComponent
  activity: AtbActivity
  src: AtbSrcAsset[]
  onChange: (next: SceneComponent) => void
}

function multilineToLines(raw: string): string[] {
  return raw.split('\n')
}

function cuesToText(cues: SubtitleCue[] | undefined): string {
  return (cues ?? [])
    .map((cue) => [cue.start_ms, cue.end_ms, cue.text, cue.translation_zh ?? ''].join(' | '))
    .join('\n')
}

function textToCues(raw: string): SubtitleCue[] {
  return raw.split('\n').map((line, index) => {
    const pipeParts = line.split('|')
    if (pipeParts.length >= 3) {
      const start = Number(pipeParts[0]?.trim())
      const end = Number(pipeParts[1]?.trim())
      const text = pipeParts.slice(2, pipeParts.length >= 4 ? -1 : undefined).join('|')
      const translationRaw = pipeParts.length >= 4 ? pipeParts[pipeParts.length - 1] : undefined
      return {
        start_ms: Number.isFinite(start) ? start : index * 3000,
        end_ms: Number.isFinite(end) ? end : index * 3000 + 2800,
        text,
        translation_zh: translationRaw?.trim() || undefined,
      }
    }
    return {
      start_ms: index * 3000,
      end_ms: index * 3000 + 2800,
      text: line,
    }
  })
}

export default function ComponentEditor({ component, activity, src, onChange }: Props) {
  switch (component.type) {
    case 'background_image':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="description">
            <Input
              value={component.description ?? ''}
              onChange={(e) => onChange({ ...component, description: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="img_url" required>
            <ImageOssUploadField
              value={component.img_url}
              onChange={(url) => onChange({ ...component, img_url: url })}
              enableCompression
            />
          </Form.Item>
        </Form>
      )
    case 'teacher_avatar':
      return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Form layout="vertical" size="small" style={{ flex: 1, minWidth: 280 }}>
            <Form.Item label="source_id" required>
              <SrcIdSelect
                src={src}
                filterType="image"
                value={component.source_id}
                onChange={(id) => onChange({ ...component, source_id: id })}
              />
            </Form.Item>
          </Form>
          <TeacherAvatarPreview component={component} src={src} />
        </div>
      )
    case 'speech':
      return <SpeechComponentForm value={component} onChange={onChange} />
    case 'button':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="text" required>
            <Input
              value={component.text}
              onChange={(e) => onChange({ ...component, text: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="click_signal" required>
            <Input
              value={component.click_signal}
              onChange={(e) => onChange({ ...component, click_signal: e.target.value })}
              addonAfter={
                isSubmergeSequenceActivity(activity) ? (
                  <a
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onChange({ ...component, click_signal: activity.end_signal })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onChange({ ...component, click_signal: activity.end_signal })
                      }
                    }}
                  >
                    对齐 end_signal
                  </a>
                ) : null
              }
            />
          </Form.Item>
        </Form>
      )
    case 'material_follow_reading_anchor':
      return (
        <Form layout="vertical" size="small">
          <Form.Item
            label="id"
            help="自学课跟读列表中的句子 index，0 表示第一句；该组件不在学员端画面中展示。"
          >
            <InputNumber
              min={0}
              step={1}
              precision={0}
              style={{ width: '100%' }}
              value={Number(component.id) || 0}
              onChange={(v) => onChange({ ...component, id: v ?? 0 })}
            />
          </Form.Item>
        </Form>
      )
    case 'knowledge_card':
      return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Form layout="vertical" size="small" style={{ flex: 1, minWidth: 280 }}>
            <Form.Item label="tag">
              <Input
                value={component.tag ?? ''}
                onChange={(e) => onChange({ ...component, tag: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="title" required help="含「=」时，学员端会高亮等号左侧的英文部分">
              <Input
                value={component.title}
                onChange={(e) => onChange({ ...component, title: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="content" required>
              <Input.TextArea
                rows={2}
                value={component.content}
                onChange={(e) => onChange({ ...component, content: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="collocations（每行一条）">
              <Input.TextArea
                rows={3}
                value={(component.collocations ?? []).join('\n')}
                onChange={(e) =>
                  onChange({
                    ...component,
                    collocations: multilineToLines(e.target.value),
                  })
                }
              />
            </Form.Item>
            <Form.Item label="illustration_url">
              <ImageOssUploadField
                value={component.illustration_url ?? ''}
                onChange={(url) => onChange({ ...component, illustration_url: url })}
              />
            </Form.Item>
          </Form>
          <KnowledgeCardPreview card={component} />
        </div>
      )
    case 'whiteboard':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="img_url">
            <ImageOssUploadField
              value={component.img_url ?? ''}
              onChange={(url) => onChange({ ...component, img_url: url })}
              onUploaded={({ width, height, url }) =>
                onChange({
                  ...component,
                  img_url: url,
                  img_width: width,
                  img_height: height,
                })
              }
            />
          </Form.Item>
          <Form.Item label="img_width">
            <InputNumber
              style={{ width: '100%' }}
              value={component.img_width ?? 0}
              onChange={(v) => onChange({ ...component, img_width: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="img_height">
            <InputNumber
              style={{ width: '100%' }}
              value={component.img_height ?? 0}
              onChange={(v) => onChange({ ...component, img_height: v ?? 0 })}
            />
          </Form.Item>
        </Form>
      )
    case 'video_play':
      return <VideoPlayComponentForm value={component} src={src} onChange={onChange} />
    case 'narrative_video':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="source_id" required>
            <SrcIdSelect
              src={src}
              filterType="video"
              value={component.source_id}
              onChange={(id) => onChange({ ...component, source_id: id })}
              placeholder="选择老师竖屏讲解视频"
            />
          </Form.Item>
          <Form.Item label="start_ms">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={component.start_ms ?? 0}
              onChange={(v) => onChange({ ...component, start_ms: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="end_ms" help="0 表示播放完整视频">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={component.end_ms ?? 0}
              onChange={(v) => onChange({ ...component, end_ms: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="subtitles（每行：start_ms | end_ms | text | translation_zh）">
            <Input.TextArea
              rows={5}
              value={cuesToText(component.subtitles)}
              onChange={(e) => onChange({ ...component, subtitles: textToCues(e.target.value) })}
            />
          </Form.Item>
          <Form.Item label="autoplay">
            <Switch
              checked={component.autoplay !== false}
              onChange={(v) => onChange({ ...component, autoplay: v })}
            />
          </Form.Item>
        </Form>
      )
    case 'scenario_video':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="visual_source_id" required>
            <SrcIdSelect
              src={src}
              filterType={['video', 'image']}
              value={component.visual_source_id}
              onChange={(id) => onChange({ ...component, visual_source_id: id })}
              placeholder="选择场景视频或图片"
            />
          </Form.Item>
          <Form.Item label="audio_source_id" help="图片场景建议配置；视频自带声音时可留空">
            <SrcIdSelect
              src={src}
              filterType="audio"
              value={component.audio_source_id ?? ''}
              onChange={(id) => onChange({ ...component, audio_source_id: id })}
              placeholder="选择场景音频"
            />
          </Form.Item>
          <Form.Item label="prompt_text">
            <Input
              value={component.prompt_text ?? ''}
              placeholder="Can you do me a favor?"
              onChange={(e) => onChange({ ...component, prompt_text: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="start_ms">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={component.start_ms ?? 0}
              onChange={(v) => onChange({ ...component, start_ms: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="end_ms" help="0 表示播放完整素材">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={component.end_ms ?? 0}
              onChange={(v) => onChange({ ...component, end_ms: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="subtitles（每行：start_ms | end_ms | text | translation_zh）">
            <Input.TextArea
              rows={5}
              value={cuesToText(component.subtitles)}
              onChange={(e) => onChange({ ...component, subtitles: textToCues(e.target.value) })}
            />
          </Form.Item>
          <Form.Item label="autoplay">
            <Switch
              checked={component.autoplay !== false}
              onChange={(v) => onChange({ ...component, autoplay: v })}
            />
          </Form.Item>
          <Form.Item label="pause_at_ms" help="毫秒；未填、0 或 -1 表示停在 end_ms 处，若无 end_ms 则停在视频/音频结尾">
            <InputNumber
              min={-1}
              style={{ width: '100%' }}
              value={component.pause_at_ms ?? -1}
              onChange={(v) => onChange({ ...component, pause_at_ms: v ?? -1 })}
            />
          </Form.Item>
          <Form.Item label="confused_prompt_text" help="判题失败时老外的困惑台词，将自动 TTS 合成播放">
            <Input
              value={component.confused_prompt_text ?? ''}
              placeholder="Sorry? I didn't quite get that."
              onChange={(e) => onChange({ ...component, confused_prompt_text: e.target.value })}
            />
          </Form.Item>
        </Form>
      )
    case 'foreigner_prompt':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="foreigner_line_en" required>
            <Input
              value={component.foreigner_line_en}
              onChange={(e) => onChange({ ...component, foreigner_line_en: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="foreigner_line_zh">
            <Input
              value={component.foreigner_line_zh ?? ''}
              onChange={(e) => onChange({ ...component, foreigner_line_zh: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="teaching_objective" required>
            <Input
              value={component.teaching_objective}
              onChange={(e) => onChange({ ...component, teaching_objective: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="model_answer_en" required>
            <Input
              value={component.model_answer_en}
              onChange={(e) => onChange({ ...component, model_answer_en: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="model_answer_zh">
            <Input
              value={component.model_answer_zh ?? ''}
              onChange={(e) => onChange({ ...component, model_answer_zh: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="acceptable_answers（每行一条）">
            <Input.TextArea
              rows={4}
              value={(component.acceptable_answers ?? []).join('\n')}
              onChange={(e) =>
                onChange({
                  ...component,
                  acceptable_answers: multilineToLines(e.target.value),
                })
              }
            />
          </Form.Item>
          <Form.Item label="rubric_lines（每行一条）">
            <Input.TextArea
              rows={3}
              value={(component.rubric_lines ?? []).join('\n')}
              onChange={(e) =>
                onChange({
                  ...component,
                  rubric_lines: multilineToLines(e.target.value),
                })
              }
            />
          </Form.Item>
          <Form.Item label="asr_language">
            <Input
              value={component.asr_language ?? 'en-US'}
              onChange={(e) => onChange({ ...component, asr_language: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="confused_tts_voice_id" help="判题失败时困惑台词 TTS 音色（Minimax voice_id）">
            <Input
              value={component.confused_tts_voice_id ?? 'English_magnetic_voiced_man'}
              onChange={(e) => onChange({ ...component, confused_tts_voice_id: e.target.value })}
            />
          </Form.Item>
        </Form>
      )
    case 'eva_coach':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="avatar_source_id" required>
            <SrcIdSelect
              src={src}
              filterType="image"
              value={component.avatar_source_id}
              onChange={(id) => onChange({ ...component, avatar_source_id: id })}
            />
          </Form.Item>
          <Form.Item label="ask_intro_text">
            <Input.TextArea
              rows={2}
              value={component.ask_intro_text ?? ''}
              onChange={(e) => onChange({ ...component, ask_intro_text: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="retry_coach_text">
            <Input.TextArea
              rows={2}
              value={component.retry_coach_text ?? ''}
              onChange={(e) => onChange({ ...component, retry_coach_text: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="hint_board.title">
            <Input
              value={component.hint_board.title ?? ''}
              onChange={(e) =>
                onChange({
                  ...component,
                  hint_board: { ...component.hint_board, title: e.target.value },
                })
              }
            />
          </Form.Item>
          <Form.Item label="hint_board.lines（每行一条）" required>
            <Input.TextArea
              rows={5}
              value={component.hint_board.lines.join('\n')}
              onChange={(e) =>
                onChange({
                  ...component,
                  hint_board: {
                    ...component.hint_board,
                    lines: multilineToLines(e.target.value),
                  },
                })
              }
            />
          </Form.Item>
          <Form.Item label="hint_board.model_sentence">
            <Input
              value={component.hint_board.model_sentence ?? ''}
              onChange={(e) =>
                onChange({
                  ...component,
                  hint_board: { ...component.hint_board, model_sentence: e.target.value },
                })
              }
            />
          </Form.Item>
          <Form.Item label="initially_open">
            <Switch
              checked={component.initially_open !== false}
              onChange={(v) => onChange({ ...component, initially_open: v })}
            />
          </Form.Item>
          <Form.Item label="tts_voice_id">
            <Input
              value={component.tts_voice_id ?? 'ZxueliLLS'}
              onChange={(e) => onChange({ ...component, tts_voice_id: e.target.value })}
            />
          </Form.Item>
        </Form>
      )
    case 'hint_board':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="title">
            <Input
              value={component.title ?? ''}
              placeholder="提示板"
              onChange={(e) => onChange({ ...component, title: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="lines（每行一条）" required>
            <Input.TextArea
              rows={5}
              value={component.lines.join('\n')}
              onChange={(e) =>
                onChange({
                  ...component,
                  lines: multilineToLines(e.target.value),
                })
              }
            />
          </Form.Item>
          <Form.Item label="initially_open">
            <Switch
              checked={component.initially_open !== false}
              onChange={(v) => onChange({ ...component, initially_open: v })}
            />
          </Form.Item>
        </Form>
      )
    case 'countdown':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="duration_sec" help="倒计时结束后才开始播放视频，默认 3 秒">
            <InputNumber
              min={0}
              max={60}
              step={1}
              style={{ width: '100%' }}
              value={component.duration_sec ?? 3}
              onChange={(v) => onChange({ ...component, duration_sec: v ?? 3 })}
            />
          </Form.Item>
        </Form>
      )
    case 'kol_avatar':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="source_id" required help="引用 src 中的 KOL 头像（type=image）">
            <SrcIdSelect
              src={src}
              filterType="image"
              value={component.source_id}
              onChange={(id) => onChange({ ...component, source_id: id })}
              placeholder="选择 KOL 头像"
            />
          </Form.Item>
        </Form>
      )
    case 'play_video_brief':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="status_title" help="默认「视频播放中」">
            <Input
              value={component.status_title ?? ''}
              placeholder="视频播放中"
              onChange={(e) => onChange({ ...component, status_title: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="description" required>
            <Input.TextArea
              rows={3}
              value={component.description}
              placeholder="正在播放视频0-31s，正常速度，请仔细听哦～"
              onChange={(e) => onChange({ ...component, description: e.target.value })}
            />
          </Form.Item>
        </Form>
      )
    case 'follow_reading':
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <FollowReadingComponentForm value={component} onChange={onChange} />
          </div>
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 8 }}>
              <FollowReadingPreview component={component} />
            </div>
          </div>
        </div>
      )
    case 'single_choice':
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <SingleChoiceComponentForm value={component} src={src} onChange={onChange} />
          </div>
          {/* 表单很长，预览吸顶跟随滚动 */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 8 }}>
              <SingleChoicePreview component={component} />
            </div>
          </div>
        </div>
      )
    case 'voice_qa_simple':
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <VoiceQaSimpleComponentForm value={component} onChange={onChange} />
          </div>
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 8 }}>
              <VoiceQaSimplePreview component={component} />
            </div>
          </div>
        </div>
      )
    case 'guided_speaking':
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <GuidedSpeakingComponentForm value={component} onChange={onChange} />
          </div>
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 8 }}>
              <GuidedSpeakingPreview component={component} />
            </div>
          </div>
        </div>
      )
    case 'oral_output':
      return <OralOutputComponentForm value={component} src={src} onChange={onChange} />
    default: {
      const _e: never = component
      return _e
    }
  }
}
