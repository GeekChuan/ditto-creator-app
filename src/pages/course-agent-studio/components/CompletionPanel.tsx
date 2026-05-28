import { Button, Collapse, Tag, Typography, message } from 'antd'
import {
  CheckCircleFilled,
  ReloadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  InteractionOutlined,
  BookOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

// act_type → Tag 颜色 & 显示标签
const ACT_META: Record<string, { color: string; label: string }> = {
  IntroMusic:              { color: 'default',  label: 'IntroMusic' },
  'CUI-Bubble':            { color: 'blue',     label: 'CUI-Bubble' },
  ShowImage:               { color: 'cyan',     label: 'ShowImage' },
  PlayVideo:               { color: 'purple',   label: 'PlayVideo' },
  'CUI-Card-ChoiceSingle': { color: 'orange',   label: 'ChoiceSingle' },
  'CUI-FreeTalk-Practice': { color: 'green',    label: 'FreeTalk' },
}

const MOCK_NODES = [
  {
    id: 'N01',
    act_type: 'IntroMusic',
    label: '开场音乐',
    desc: '氛围引入，奠定学习基调',
  },
  {
    id: 'N02',
    act_type: 'CUI-Bubble',
    label: 'Tutor 开场对话',
    desc: '"Hi! Today we\'re going to learn a very special color — purple!"',
  },
  {
    id: 'N03',
    act_type: 'PlayVideo',
    label: '视频片段 01',
    desc: '00:00 – 00:18 · 紫色物品亮相',
  },
  {
    id: 'N04',
    act_type: 'CUI-Bubble',
    label: '词汇讲解',
    desc: '"purple" 发音拆解 · 音节 pur-ple',
  },
  {
    id: 'N05',
    act_type: 'ShowImage',
    label: '紫色物品图集',
    desc: '葡萄 · 薰衣草 · 茄子 · 紫水晶',
  },
  {
    id: 'N06',
    act_type: 'CUI-Card-ChoiceSingle',
    label: '颜色辨别选择',
    desc: '点选正确的紫色物品 · 3 道题',
  },
  {
    id: 'N07',
    act_type: 'PlayVideo',
    label: '视频片段 02',
    desc: '00:18 – 00:42 · 句型 "This is purple"',
  },
  {
    id: 'N08',
    act_type: 'CUI-Bubble',
    label: '句型输入',
    desc: '"This is ___." 结构精讲 · 双语对照',
  },
  {
    id: 'N09',
    act_type: 'CUI-Card-ChoiceSingle',
    label: '句型填空',
    desc: '"This is ___." × 4 道题',
  },
  {
    id: 'N10',
    act_type: 'CUI-FreeTalk-Practice',
    label: 'FreeTalk 口语练习',
    desc: '用 "This is purple." 描述身边紫色物品',
  },
]

const MOCK_LESSON_JSON = `{
  "metadata": {
    "title_en": "This Is Purple",
    "title_zh": "这是紫色",
    "cefr_level": "B1",
    "language_mode": "zh_en_mixed",
    "estimated_duration_min": 15
  },
  "nodes": [
    { "tree_id": 1,  "act_type": "IntroMusic",              "actor": "Tutor"   },
    { "tree_id": 2,  "act_type": "CUI-Bubble",              "actor": "Tutor",
      "payload": { "text_en": "Hi! Today we're going to learn a very special color — purple!" } },
    { "tree_id": 3,  "act_type": "PlayVideo",               "actor": "Tutor",
      "payload": { "start_time": 0, "end_time": 18000 } },
    { "tree_id": 4,  "act_type": "CUI-Bubble",              "actor": "Tutor",
      "payload": { "text_en": "Let's say it together: pur-ple!" } },
    { "tree_id": 5,  "act_type": "ShowImage",               "actor": "Tutor",
      "payload": { "items": ["grape","lavender","eggplant","amethyst"] } },
    { "tree_id": 6,  "act_type": "CUI-Card-ChoiceSingle",   "actor": "Student",
      "payload": { "question_count": 3, "topic": "color_recognition" } },
    { "tree_id": 7,  "act_type": "PlayVideo",               "actor": "Tutor",
      "payload": { "start_time": 18000, "end_time": 42000 } },
    { "tree_id": 8,  "act_type": "CUI-Bubble",              "actor": "Tutor",
      "payload": { "text_en": "Great sentence: \\"This is purple.\\" Can you try?" } },
    { "tree_id": 9,  "act_type": "CUI-Card-ChoiceSingle",   "actor": "Student",
      "payload": { "question_count": 4, "topic": "sentence_fill" } },
    { "tree_id": 10, "act_type": "CUI-FreeTalk-Practice",   "actor": "Student",
      "payload": { "task_type": "describe_color", "target_color": "purple",
                   "max_student_turns": 6, "tts": { "enabled": true } } }
  ],
  "interaction_count": 55
}`

interface Props {
  courseTitle: string
  onReset: () => void
}

export default function CompletionPanel({ courseTitle, onReset }: Props) {
  const title = courseTitle.trim() || 'This Is Purple · 这是紫色'

  return (
    <div style={{ animation: 'cas-fade-scale 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
      {/* Success header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(99,102,241,0.06) 100%)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <CheckCircleFilled style={{ fontSize: 36, color: '#22c55e' }} />
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
            {title}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            课程已由 AI 生成 · Course Render Agent v2.1.0
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<EyeOutlined />}
            onClick={() => message.info('演示模式：课程已生成，可在课程管理中查看')}
          >
            查看课程
          </Button>
          <Button type="primary" icon={<ReloadOutlined />} onClick={onReset}>
            重新配置
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { icon: <ClockCircleOutlined />, label: '预计时长', value: '15 分钟', color: '#6366f1' },
          { icon: <InteractionOutlined />, label: '互动节点', value: '55 个', color: '#0ea5e9' },
          { icon: <BookOutlined />, label: 'CEFR 难度', value: 'B1', color: '#a855f7' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20, color: stat.color }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Node grid */}
      <div style={{ marginBottom: 20 }}>
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 10,
          }}
        >
          课程节点结构 · This Is Purple
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {MOCK_NODES.map((node, i) => {
            const meta = ACT_META[node.act_type] ?? { color: 'default', label: node.act_type }
            return (
              <div
                key={node.id}
                className="cas-node-card"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag color={meta.color} style={{ margin: 0, fontSize: 11 }}>
                    {meta.label}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>{node.id}</Text>
                </div>
                <Text strong style={{ fontSize: 13 }}>{node.label}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{node.desc}</Text>
              </div>
            )
          })}
        </div>
      </div>

      {/* JSON preview */}
      <Collapse
        ghost
        items={[
          {
            key: 'json',
            label: (
              <Text type="secondary" style={{ fontSize: 12 }}>
                查看 lesson.json 原始结构
              </Text>
            ),
            children: (
              <pre
                style={{
                  background: '#0f172a',
                  color: '#a5f3fc',
                  borderRadius: 10,
                  padding: '14px 18px',
                  fontSize: 12,
                  fontFamily: 'Menlo, Monaco, monospace',
                  overflowX: 'auto',
                  margin: 0,
                }}
              >
                {MOCK_LESSON_JSON}
              </pre>
            ),
          },
        ]}
      />
    </div>
  )
}
