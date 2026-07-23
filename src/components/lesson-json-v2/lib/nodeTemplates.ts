import type { AtbActivity, AtbSrcAsset, SceneNode } from '../../../types/atbReactionV2'
import {
  isHomeworkActivity,
  isLectureWithPracticeActivity,
  isScenarioCoachActivity,
} from '../../../types/atbReactionV2'
import {
  createDefaultNode,
  createFollowReadingNode,
  createGuidedSpeakingNode,
  createNarrativeNode,
  createOralOutputNode,
  createPlayVideoNode,
  createScenarioCoachNode,
  createSingleChoiceNode,
  createVoiceQaSimpleNode,
  newNodeId,
} from '../../../types/atbReactionV2Editor'

export interface NodeTemplate {
  label: string
  create: () => SceneNode
}

/** 当前 Activity 类型下可添加的节点模板（快捷按钮与右键菜单共用） */
export function getNodeTemplates(activity: AtbActivity, src: AtbSrcAsset[]): NodeTemplate[] {
  // 作业活动的节点只承载口语输出作业，不提供「普通节点」
  if (isHomeworkActivity(activity)) {
    return [{ label: '口语输出节点', create: () => createOralOutputNode(src, newNodeId()) }]
  }
  const templates: NodeTemplate[] = [
    { label: '普通节点', create: () => createDefaultNode(activity.type, src, newNodeId()) },
  ]
  if (isLectureWithPracticeActivity(activity)) {
    templates.push(
      { label: 'playVideo 节点', create: () => createPlayVideoNode(src, newNodeId()) },
      { label: '跟读节点', create: () => createFollowReadingNode(src, newNodeId()) },
      { label: '选择题节点', create: () => createSingleChoiceNode(src, newNodeId()) },
      { label: '语音问答节点', create: () => createVoiceQaSimpleNode(src, newNodeId()) },
      { label: '引导口语节点', create: () => createGuidedSpeakingNode(src, newNodeId()) },
    )
  }
  if (isScenarioCoachActivity(activity)) {
    templates.push(
      { label: '讲解节点', create: () => createNarrativeNode(src, newNodeId()) },
      { label: '情景对话节点', create: () => createScenarioCoachNode(src, newNodeId()) },
    )
  }
  return templates
}
