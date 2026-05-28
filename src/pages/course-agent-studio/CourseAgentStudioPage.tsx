import { useCallback, useEffect, useRef, useState } from 'react'
import { Input, Segmented, Switch, Typography } from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import VideoDropZone from './components/VideoDropZone'
import OptionsBar from './components/OptionsBar'
import StartBar from './components/StartBar'
import AgentWorkbench from './components/AgentWorkbench'
import CompletionPanel from './components/CompletionPanel'
import { PIPELINE_STEPS, DEFAULT_OPTIONS, buildInitialLogLines } from './constants'
import type { StudioOptions, StudioPhase, StepStatus } from './types'
import './course-agent-studio.css'

const { TextArea } = Input
const { Title, Text } = Typography

export default function CourseAgentStudioPage() {
  const [phase, setPhase] = useState<StudioPhase>('idle')
  const [demoMode, setDemoMode] = useState(false)

  // Idle inputs
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [options, setOptions] = useState<StudioOptions>(DEFAULT_OPTIONS)

  // Running state
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    PIPELINE_STEPS.map(() => 'pending'),
  )
  const [logLines, setLogLines] = useState<string[]>([])
  const [totalProgress, setTotalProgress] = useState(0)

  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []
  }

  const appendLog = useCallback((lines: string[]) => {
    setLogLines((prev) => [...prev, ...lines])
  }, [])

  const startPipeline = useCallback(() => {
    setPhase('running')
    setCurrentStep(0)
    setStepStatuses(PIPELINE_STEPS.map(() => 'pending'))
    setTotalProgress(0)
    const initLines = buildInitialLogLines(options)
    setLogLines(initLines)

    let elapsed = 500

    PIPELINE_STEPS.forEach((step, i) => {
      // Mark step as running
      const startTimer = setTimeout(() => {
        setCurrentStep(i)
        setStepStatuses((prev) => {
          const next = [...prev]
          next[i] = 'running'
          return next
        })
        setTotalProgress(Math.round((i / PIPELINE_STEPS.length) * 100))

        // Feed logs for this step gradually
        const logChunk = step.logTemplates
        const logInterval = step.durationMs / (logChunk.length + 1)
        logChunk.forEach((line, li) => {
          const lt = setTimeout(() => appendLog([line]), logInterval * (li + 1))
          timerRefs.current.push(lt)
        })
      }, elapsed)
      timerRefs.current.push(startTimer)

      elapsed += step.durationMs

      // Mark step as done
      const doneTimer = setTimeout(() => {
        setStepStatuses((prev) => {
          const next = [...prev]
          next[i] = 'done'
          return next
        })
        setTotalProgress(Math.round(((i + 1) / PIPELINE_STEPS.length) * 100))

        if (i === PIPELINE_STEPS.length - 1) {
          setTimeout(() => setPhase('done'), 400)
        }
      }, elapsed)
      timerRefs.current.push(doneTimer)
    })
  }, [options, appendLog])

  const handleCancel = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setCurrentStep(0)
    setStepStatuses(PIPELINE_STEPS.map(() => 'pending'))
    setLogLines([])
    setTotalProgress(0)
  }, [])

  const handleReset = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setCurrentStep(0)
    setStepStatuses(PIPELINE_STEPS.map(() => 'pending'))
    setLogLines([])
    setTotalProgress(0)
  }, [])

  const handleVideoChange = useCallback((file: File, url: string) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(file)
    setVideoUrl(url)
  }, [videoUrl])

  const handleVideoClear = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
  }, [videoUrl])

  useEffect(() => {
    return () => {
      clearTimers()
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canStart = !!(videoFile || topic.trim())

  return (
    <div
      className={`cas-root${demoMode ? ' cas-demo-mode' : ''}`}
      style={{ margin: '-24px', padding: '32px 40px' }}
    >
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RocketOutlined style={{ fontSize: 22, color: '#6366f1' }} />
          <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
            Ditto Course Agent
          </Title>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(99,102,241,0.1)',
              color: '#4f46e5',
              padding: '2px 8px',
              borderRadius: 100,
            }}
          >
            BETA
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            演示模式
          </Text>
          <Switch size="small" checked={demoMode} onChange={setDemoMode} />
        </div>
      </div>

      {/* Decorative mode selector (Genspark style) */}
      {!demoMode && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Segmented
            value="专业"
            options={['专业', '创意', '自动', '引导模式']}
            style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 100 }}
          />
        </div>
      )}

      {/* Main content area */}
      {phase === 'done' ? (
        <CompletionPanel courseTitle={topic} onReset={handleReset} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxWidth: phase === 'running' ? '100%' : 760,
            margin: '0 auto',
          }}
        >
          {/* Main input card */}
          <div
            className="cas-card"
            style={{
              padding: '20px 20px 16px',
              opacity: phase === 'running' ? 0.55 : 1,
              pointerEvents: phase === 'running' ? 'none' : undefined,
              transition: 'opacity 0.4s',
            }}
          >
            <VideoDropZone
              file={videoFile}
              objectUrl={videoUrl}
              onChange={handleVideoChange}
              onClear={handleVideoClear}
            />
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '14px 0' }} />
            <TextArea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="请输入课程主题与制作要求，例如：「针对 K12 学生的自然拼读基础课，强调口语互动」"
              autoSize={{ minRows: 2, maxRows: 5 }}
              variant="borderless"
              style={{ fontSize: 14, padding: 0, resize: 'none', color: '#374151' }}
            />
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '14px 0' }} />
            <OptionsBar options={options} onChange={(patch) => setOptions((o) => ({ ...o, ...patch }))} />
            <div style={{ height: 14 }} />
            <StartBar canStart={canStart} onStart={startPipeline} />
          </div>

          {/* Agent workbench (only in running phase) */}
          {phase === 'running' && (
            <AgentWorkbench
              statuses={stepStatuses}
              currentStep={currentStep}
              logLines={logLines}
              totalProgress={totalProgress}
              onCancel={handleCancel}
            />
          )}
        </div>
      )}
    </div>
  )
}
