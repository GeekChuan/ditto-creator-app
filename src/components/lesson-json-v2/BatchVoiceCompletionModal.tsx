import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Modal, Progress, Space, Typography } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { assetsApi } from '../../api/assets'
import { toolsApi } from '../../api/tools'
import type {
  AtbReactionDocument,
  FollowReadingComponent,
  SingleChoiceComponent,
  SpeechComponent,
  SubtitleCue,
} from '../../types/atbReactionV2'
import TtsVoiceSelect from './components/TtsVoiceSelect'
import { mapForcedAlignSegments, resolvePlayableAudioUrl } from './lib/subtitleAlign'
import { useTtsVoiceStore } from './lib/ttsVoiceStore'

const { Text } = Typography


type TaskKind =
  | 'speech'
  | 'single_choice_correct'
  | 'single_choice_incorrect'
  | 'follow_reading_reference'
  | 'follow_reading_feedback'

interface VoiceTask {
  key: string
  /** 展示用位置描述，如 Activity 1 › Node 2 › speech */
  label: string
  kind: TaskKind
  activityIndex: number
  nodeIndex: number
  componentIndex: number
  /** follow_reading 反馈音频下标 */
  feedbackIndex?: number
  /** TTS 输入与打轴对照文本 */
  text: string
  /** 是否需要生成音频（已有音频则只补打轴） */
  needsTts: boolean
  /** 该类任务是否需要打轴 */
  needsAlign: boolean
  /** 仅补打轴时使用的已有音频 URL */
  existingAudio?: string
}

type LogLevel = 'info' | 'success' | 'warning' | 'error'

interface LogEntry {
  time: string
  level: LogLevel
  text: string
}

const KIND_LABEL: Record<TaskKind, string> = {
  speech: 'speech 讲解',
  single_choice_correct: 'single_choice 正确反馈',
  single_choice_incorrect: 'single_choice 错误反馈',
  follow_reading_reference: 'follow_reading 原音',
  follow_reading_feedback: 'follow_reading 鼓励反馈',
}

function subtitlesText(subtitles: SubtitleCue[] | undefined): string {
  return (subtitles ?? []).map((s) => s.text).join(' ').trim()
}

function hasAlignedSubtitles(subtitles: SubtitleCue[] | undefined): boolean {
  return (subtitles ?? []).some((s) => s.text.trim())
}

interface ScanResult {
  tasks: VoiceTask[]
  /** 已有音频且已打轴，无需处理的语音点数量 */
  doneCount: number
  /** 缺少文本无法处理的语音点描述 */
  missingText: string[]
}

/** 扫描文档中所有可能需要语音的节点，生成待处理任务列表 */
function collectVoiceTasks(doc: AtbReactionDocument): ScanResult {
  const tasks: VoiceTask[] = []
  const missingText: string[] = []
  let doneCount = 0

  doc.activities.forEach((activity, activityIndex) => {
    activity.nodes.forEach((node, nodeIndex) => {
      node.components.forEach((comp, componentIndex) => {
        const at = `Activity ${activity.id} › Node ${node.id}`
        const baseKey = `${activityIndex}-${nodeIndex}-${componentIndex}`

        if (comp.type === 'speech') {
          const text = comp.source_text?.trim() || subtitlesText(comp.subtitles)
          const hasAudio = Boolean(comp.audio?.trim())
          const aligned = hasAlignedSubtitles(comp.subtitles)
          if (hasAudio && aligned) {
            doneCount += 1
            return
          }
          if (!text) {
            missingText.push(`${at} › ${KIND_LABEL.speech}`)
            return
          }
          tasks.push({
            key: baseKey,
            label: `${at} › ${KIND_LABEL.speech}`,
            kind: 'speech',
            activityIndex,
            nodeIndex,
            componentIndex,
            text,
            needsTts: !hasAudio,
            needsAlign: true,
            existingAudio: hasAudio ? comp.audio : undefined,
          })
          return
        }

        if (comp.type === 'single_choice') {
          const feedbacks = [
            {
              kind: 'single_choice_correct' as const,
              audio: comp.correct_feedback_audio,
              subtitles: comp.correct_feedback_subtitles,
            },
            {
              kind: 'single_choice_incorrect' as const,
              audio: comp.incorrect_feedback_audio,
              subtitles: comp.incorrect_feedback_subtitles,
            },
          ]
          for (const fb of feedbacks) {
            const text = subtitlesText(fb.subtitles)
            const hasAudio = Boolean(fb.audio?.trim())
            if (hasAudio && hasAlignedSubtitles(fb.subtitles)) {
              doneCount += 1
              continue
            }
            if (!text) {
              missingText.push(`${at} › ${KIND_LABEL[fb.kind]}`)
              continue
            }
            tasks.push({
              key: `${baseKey}-${fb.kind}`,
              label: `${at} › ${KIND_LABEL[fb.kind]}`,
              kind: fb.kind,
              activityIndex,
              nodeIndex,
              componentIndex,
              text,
              needsTts: !hasAudio,
              needsAlign: true,
              existingAudio: hasAudio ? fb.audio : undefined,
            })
          }
          return
        }

        if (comp.type === 'follow_reading') {
          if (!comp.reference_audio?.trim()) {
            const text = comp.text_en?.trim()
            if (!text) {
              missingText.push(`${at} › ${KIND_LABEL.follow_reading_reference}`)
            } else {
              tasks.push({
                key: `${baseKey}-reference`,
                label: `${at} › ${KIND_LABEL.follow_reading_reference}`,
                kind: 'follow_reading_reference',
                activityIndex,
                nodeIndex,
                componentIndex,
                text,
                needsTts: true,
                needsAlign: false,
              })
            }
          } else {
            doneCount += 1
          }
          ;(comp.positive_feedback_audios ?? []).forEach((item, feedbackIndex) => {
            if (item.audio_url?.trim()) {
              doneCount += 1
              return
            }
            const text = item.text_en?.trim()
            if (!text) {
              missingText.push(
                `${at} › ${KIND_LABEL.follow_reading_feedback} #${feedbackIndex + 1}`,
              )
              return
            }
            tasks.push({
              key: `${baseKey}-feedback-${feedbackIndex}`,
              label: `${at} › ${KIND_LABEL.follow_reading_feedback} #${feedbackIndex + 1}`,
              kind: 'follow_reading_feedback',
              activityIndex,
              nodeIndex,
              componentIndex,
              feedbackIndex,
              text,
              needsTts: true,
              needsAlign: false,
            })
          })
        }
      })
    })
  })

  return { tasks, doneCount, missingText }
}

async function runForcedAlign(audioUrl: string, text: string): Promise<SubtitleCue[]> {
  const playableUrl = await resolvePlayableAudioUrl(audioUrl)
  const res = await toolsApi.runTool('asr-forced-align', {
    payload: {
      audio_url: playableUrl,
      text,
      caption_type: 'speech',
    },
  })
  if (res.status !== 'ok' || !res.result) {
    throw new Error(res.error || '字幕打轴失败')
  }
  const segments = (res.result.segments as Array<Record<string, unknown>> | undefined) ?? []
  const subtitles = mapForcedAlignSegments(segments)
  if (!subtitles.length) {
    throw new Error('打轴结果为空，请检查原文与音频是否匹配')
  }
  return subtitles
}

interface TaskOutcome {
  audioUrl: string
  audioDuration: number | null
  subtitles: SubtitleCue[] | null
}

/** 将单个任务的产出写回文档草稿（原地修改 draft） */
function applyOutcome(draft: AtbReactionDocument, task: VoiceTask, outcome: TaskOutcome) {
  const comp = draft.activities[task.activityIndex]?.nodes[task.nodeIndex]?.components[
    task.componentIndex
  ]
  if (!comp) return

  if (task.kind === 'speech' && comp.type === 'speech') {
    const next = comp as SpeechComponent
    next.audio = outcome.audioUrl
    next.source_text = task.text
    if (outcome.subtitles) next.subtitles = outcome.subtitles
    const lastEndMs = outcome.subtitles?.[outcome.subtitles.length - 1]?.end_ms ?? 0
    const alignedDuration = Math.round((lastEndMs / 1000) * 10) / 10
    next.audio_duration = Math.max(
      outcome.audioDuration ?? 0,
      alignedDuration,
      next.audio_duration ?? 0,
    )
    return
  }

  if (
    (task.kind === 'single_choice_correct' || task.kind === 'single_choice_incorrect') &&
    comp.type === 'single_choice'
  ) {
    const next = comp as SingleChoiceComponent
    if (task.kind === 'single_choice_correct') {
      next.correct_feedback_audio = outcome.audioUrl
      if (outcome.subtitles) next.correct_feedback_subtitles = outcome.subtitles
    } else {
      next.incorrect_feedback_audio = outcome.audioUrl
      if (outcome.subtitles) next.incorrect_feedback_subtitles = outcome.subtitles
    }
    return
  }

  if (comp.type === 'follow_reading') {
    const next = comp as FollowReadingComponent
    if (task.kind === 'follow_reading_reference') {
      next.reference_audio = outcome.audioUrl
    } else if (task.kind === 'follow_reading_feedback' && task.feedbackIndex != null) {
      const item = next.positive_feedback_audios?.[task.feedbackIndex]
      if (item) item.audio_url = outcome.audioUrl
    }
  }
}

interface Props {
  open: boolean
  doc: AtbReactionDocument
  onClose: () => void
  onApply: (next: AtbReactionDocument) => void
}

export default function BatchVoiceCompletionModal({ open, doc, onClose, onApply }: Props) {
  // 全局音色偏好：与各组件表单同步
  const storeVoiceId = useTtsVoiceStore((s) => s.voiceId)
  const setVoiceId = useTtsVoiceStore((s) => s.setVoiceId)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  // 执行期间文档被逐步写回会触发重新扫描，任务总数须在启动时冻结
  const [runTotal, setRunTotal] = useState(0)
  const [doneTaskCount, setDoneTaskCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const cancelRef = useRef(false)
  const logBoxRef = useRef<HTMLDivElement>(null)

  const scan = useMemo(() => (open ? collectVoiceTasks(doc) : null), [open, doc])
  const totalTasks = scan?.tasks.length ?? 0
  const voiceId = storeVoiceId.trim()

  useEffect(() => {
    if (open) {
      setLogs([])
      setRunTotal(0)
      setDoneTaskCount(0)
      setErrorCount(0)
      setFinished(false)
      cancelRef.current = false
    }
  }, [open])

  useEffect(() => {
    logBoxRef.current?.scrollTo({ top: logBoxRef.current.scrollHeight })
  }, [logs])

  const appendLog = (level: LogLevel, text: string) => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), level, text },
    ])
  }

  const run = async () => {
    if (!scan || !scan.tasks.length || !voiceId) return
    setRunning(true)
    setFinished(false)
    setRunTotal(scan.tasks.length)
    setDoneTaskCount(0)
    setErrorCount(0)
    setLogs([])
    cancelRef.current = false

    appendLog(
      'info',
      `扫描完成：${scan.tasks.length} 个语音点待处理，${scan.doneCount} 个已完成跳过，音色 ${voiceId}`,
    )
    for (const item of scan.missingText) {
      appendLog('warning', `跳过（缺少文本）：${item}`)
    }

    // 在草稿副本上累积产出，每完成一个任务同步回页面，避免中途失败丢进度
    const draft = structuredClone(doc)
    let completed = 0
    let failed = 0

    for (const task of scan.tasks) {
      if (cancelRef.current) {
        appendLog('warning', '已手动停止，之前完成的任务已保存')
        break
      }
      try {
        let audioUrl = task.existingAudio ?? ''
        let audioDuration: number | null = null

        if (task.needsTts) {
          appendLog('info', `${task.label}：TTS 生成中（${voiceId}）…`)
          const res = await assetsApi.minimaxTts({ text: task.text, voice_id: voiceId })
          audioUrl = res.audio_url
          audioDuration = res.audio_duration
          appendLog('success', `${task.label}：语音已生成`)
        } else {
          appendLog('info', `${task.label}：已有音频，跳过 TTS`)
        }

        let subtitles: SubtitleCue[] | null = null
        if (task.needsAlign) {
          appendLog('info', `${task.label}：字幕打轴中…`)
          subtitles = await runForcedAlign(audioUrl, task.text)
          appendLog('success', `${task.label}：打轴完成（${subtitles.length} 条字幕）`)
        } else {
          appendLog('info', `${task.label}：无需打轴`)
        }

        applyOutcome(draft, task, { audioUrl, audioDuration, subtitles })
        onApply(structuredClone(draft))
      } catch (e: unknown) {
        failed += 1
        setErrorCount(failed)
        const err = e as { response?: { data?: { detail?: string } } }
        const detail =
          err?.response?.data?.detail ?? (e instanceof Error ? e.message : '未知错误')
        appendLog('error', `${task.label}：失败 - ${detail}`)
      } finally {
        completed += 1
        setDoneTaskCount(completed)
      }
    }

    if (!cancelRef.current) {
      appendLog(
        failed ? 'warning' : 'success',
        failed
          ? `全部执行完毕：成功 ${completed - failed}，失败 ${failed}（可重新执行补跑失败项）`
          : `全部执行完毕：${completed} 个语音点已补全`,
      )
    }
    setRunning(false)
    setFinished(true)
  }

  const progressTotal = running || finished ? runTotal : totalTasks
  const percent = progressTotal ? Math.round((doneTaskCount / progressTotal) * 100) : 0
  const progressStatus = running
    ? 'active'
    : errorCount > 0
      ? 'exception'
      : finished && runTotal > 0
        ? 'success'
        : 'normal'

  const logColor: Record<LogLevel, string> = {
    info: '#8c8c8c',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
  }

  return (
    <Modal
      title="一键补全所有语音并打轴"
      open={open}
      width={720}
      maskClosable={!running}
      closable={!running}
      onCancel={() => {
        if (running) return
        onClose()
      }}
      footer={
        <Space>
          {running ? (
            <Button
              danger
              onClick={() => {
                cancelRef.current = true
                appendLog('warning', '正在停止，等待当前任务结束…')
              }}
            >
              停止
            </Button>
          ) : (
            <Button onClick={onClose}>关闭</Button>
          )}
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={running}
            disabled={!totalTasks || !voiceId}
            onClick={() => void run()}
          >
            {finished ? '重新执行' : '开始补全'}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message={
            scan
              ? `扫描到 ${totalTasks} 个语音点待处理（speech / single_choice 反馈 / follow_reading），${scan.doneCount} 个已完成将跳过${scan.missingText.length ? `，${scan.missingText.length} 个缺少文本无法处理` : ''}`
              : '正在扫描…'
          }
        />

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            选择语音音色
          </Text>
          <TtsVoiceSelect
            size="middle"
            value={storeVoiceId}
            onChange={setVoiceId}
            disabled={running}
            style={{ width: 280 }}
          />
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            全局记忆，与各组件表单的音色同步
          </Text>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            进度（{doneTaskCount} / {progressTotal}）
          </Text>
          <Progress percent={percent} status={progressStatus} />
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            任务日志
          </Text>
          <div
            ref={logBoxRef}
            style={{
              height: 240,
              overflowY: 'auto',
              background: '#1f1f1f',
              borderRadius: 8,
              padding: '8px 12px',
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            {logs.length === 0 ? (
              <Text style={{ color: '#595959', fontFamily: 'monospace', fontSize: 12 }}>
                点击「开始补全」后，将在此显示每个节点的语音生成与打轴日志
              </Text>
            ) : (
              logs.map((entry, i) => (
                <div key={i} style={{ color: logColor[entry.level] }}>
                  <span style={{ color: '#595959' }}>[{entry.time}]</span> {entry.text}
                </div>
              ))
            )}
          </div>
        </div>
      </Space>
    </Modal>
  )
}
