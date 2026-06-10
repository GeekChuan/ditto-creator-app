import { Alert, Card, Image, Space, Steps, Typography } from 'antd'
import type {
  AtbReactionDocument,
  BackgroundImageComponent,
  ButtonComponent,
  SceneNode,
  SpeechComponent,
  TeacherAvatarComponent,
} from '../../types/atbReactionV2'
import { isSubmergeSequenceActivity } from '../../types/atbReactionV2'
import type { SelectionPath } from '../../types/atbReactionV2Editor'
import { validateDocument } from '../../types/atbReactionV2Editor'

const { Text, Paragraph } = Typography

interface Props {
  doc: AtbReactionDocument
  selection: SelectionPath
  onSelectNode: (activityIndex: number, nodeIndex: number) => void
}

function findBg(node: SceneNode): BackgroundImageComponent | undefined {
  const c = node.components.find((x) => x.type === 'background_image')
  return c?.type === 'background_image' ? c : undefined
}

function findSpeech(node: SceneNode): SpeechComponent | undefined {
  const c = node.components.find((x) => x.type === 'speech')
  return c?.type === 'speech' ? c : undefined
}

function findButton(node: SceneNode): ButtonComponent | undefined {
  const c = node.components.find((x) => x.type === 'button')
  return c?.type === 'button' ? c : undefined
}

function findAvatar(node: SceneNode): TeacherAvatarComponent | undefined {
  const c = node.components.find((x) => x.type === 'teacher_avatar')
  return c?.type === 'teacher_avatar' ? c : undefined
}

export default function AtbV2StructuralPreview({ doc, selection, onSelectNode }: Props) {
  const errors = validateDocument(doc)

  const activityIndex =
    selection.kind === 'activity' ||
    selection.kind === 'node' ||
    selection.kind === 'component'
      ? selection.activityIndex
      : 0
  const activity = doc.activities[activityIndex]
  const nodeIndex =
    selection.kind === 'node' || selection.kind === 'component'
      ? selection.nodeIndex
      : 0
  const node = activity?.nodes[nodeIndex]

  const bg = node ? findBg(node) : undefined
  const speech = node ? findSpeech(node) : undefined
  const button = node ? findButton(node) : undefined
  const avatarId = node ? findAvatar(node)?.source_id : undefined
  const avatarUrl = doc.src.find((s) => s.id === avatarId)?.url

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      {errors.length ? (
        <Alert
          type="warning"
          showIcon
          message="校验提示"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          }
        />
      ) : (
        <Alert type="success" showIcon message="结构校验通过" />
      )}

      {activity ? (
        <Card size="small" title={`场景预览 · Activity ${activity.id}`}>
          {node ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              {bg?.img_url ? (
                <Image src={bg.img_url} alt="background" style={{ maxHeight: 120, objectFit: 'cover' }} />
              ) : (
                <Text type="secondary">（无背景图）</Text>
              )}
              {avatarUrl ? (
                <Image src={avatarUrl} alt="avatar" width={48} height={48} style={{ borderRadius: '50%' }} />
              ) : null}
              {speech ? (
                <Paragraph style={{ margin: 0 }}>
                  <Text strong>旁白：</Text>
                  {speech.subtitles[0]?.text || '（无字幕）'}
                </Paragraph>
              ) : null}
              {button ? (
                <Text>
                  <Text strong>按钮：</Text>
                  {button.text} → {button.click_signal}
                </Text>
              ) : null}
              {isSubmergeSequenceActivity(activity) ? (
                <Text type="secondary">end_signal: {activity.end_signal}</Text>
              ) : null}
            </Space>
          ) : (
            <Text type="secondary">选择 Node 查看场景预览</Text>
          )}

          <Steps
            size="small"
            style={{ marginTop: 12 }}
            current={nodeIndex}
            onChange={(i) => onSelectNode(activityIndex, i)}
            items={activity.nodes.map((n) => ({
              title: `Node ${n.id}`,
              description: n.components.map((c) => c.type).join('+'),
            }))}
          />
        </Card>
      ) : (
        <Text type="secondary">添加 Activity 后可预览场景</Text>
      )}
    </Space>
  )
}
