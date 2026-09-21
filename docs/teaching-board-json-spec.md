# TeachingBoard JSON 规范

> 规范版本：1.0  
> 对应实现：`ditto.teaching-board.v1` / `ditto.teaching-board-project.v1`  
> 最后更新：2026-08-24

## 1. 适用范围

TeachingBoard 是教学页面中的动态内容板。它按 `blocks` 顺序从上到下排列标题、正文、教材原文、列表、图片和视频，并通过 Anchor 接收划线、圈画、高亮、变色和批注等教学动作。

本规范定义三类相互独立的数据：

| 数据 | Schema / 标识 | 用途 | 是否发送给 Learner |
| --- | --- | --- | --- |
| TeachingBoard Document | `ditto.teaching-board.v1` | 白板内容结构 | 是 |
| TeachingBoard Project | `ditto.teaching-board-project.v1` | Creator 编辑工程，包含 Document、动作和语音轴 | 否，发布前按业务编排转换 |
| Broadcast Message | `DITTO_TEACHING_BOARD_COMMAND` 的 payload | 播放过程中改变白板状态 | 是，按时间或教学事件发送 |

本文中的“必须”“应该”“可以”分别对应 MUST、SHOULD、MAY。

## 2. 核心设计原则

### 2.1 内容与视觉样式分离

TeachingBoard JSON 只描述内容、结构、语义变体和可交互目标，不保存具体视觉样式。

以下信息不得写入白板 JSON：

- 字体、字号、字重；
- 文字颜色、背景色、边框色；
- 宽高、内外边距、圆角、阴影；
- 绝对坐标和设备像素值；
- 手写线条的具体路径点。

页面按照统一主题渲染。当前移动端以 390 宽页面为设计基准，其他宽度由渲染层缩放或重排。`variant` 是允许进入 JSON 的语义样式，例如 `title.capsule`，但其具体颜色和尺寸仍由页面主题决定。

### 2.2 从上到下的组件容器

`blocks` 是有序数组，数组顺序就是白板的纵向展示顺序。除扩展组件外，当前不支持组件嵌套。

### 2.3 Anchor 只在可变化断点处分段

文字不是逐字嵌套节点，而是一维 `TeachingBoardText` 数组。只有预计会被圈画、批注或强调的文字边界才需要切分并设置 `anchor_id`。

```json
[
  { "text": "I’m " },
  { "text": "good at ", "anchor_id": "good-at" },
  { "text": "numbers", "anchor_id": "numbers" },
  { "text": "." }
]
```

### 2.4 ID 必须稳定

`board_id`、Block `id`、列表项 `id`、`anchor_id`、动作 `id` 和 `effect_id` 都是运行时寻址依据。内容发布后不应该因为文案微调而重新生成这些 ID。

推荐 ID 规则：

- 只使用小写字母、数字和连字符；
- 表达业务含义，例如 `jessie-quote`、`good-at`；
- 不使用数组下标作为长期业务 ID；
- 同一 Document 内 Block ID 和 Anchor ID 分别全局唯一。

## 3. 在课程 Node 中使用

TeachingBoard 作为一种 Node Component 出现：

```json
{
  "type": "teaching_board",
  "document": {
    "schema": "ditto.teaching-board.v1",
    "board_id": "jessie-expressions",
    "broadcast_channel": "lesson/jessie/expressions",
    "blocks": []
  }
}
```

`document` 之外的课程 Activity、Node、Speech 和底部公共操作栏由课程协议负责，不属于 TeachingBoard Document。

## 4. TeachingBoard Document

### 4.1 顶层结构

```json
{
  "schema": "ditto.teaching-board.v1",
  "board_id": "jessie-expressions",
  "broadcast_channel": "lesson/jessie/expressions",
  "blocks": []
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schema` | string | 是 | 固定为 `ditto.teaching-board.v1` |
| `board_id` | string | 是 | 当前白板的稳定唯一 ID |
| `broadcast_channel` | string | 否 | 广播隔离通道；省略时使用 `board_id` |
| `blocks` | array | 是 | 按展示顺序排列的组件数组 |

### 4.2 文本与 Anchor

所有含文字的预制组件都使用相同的文本结构：

```json
[
  { "text": "My major is " },
  { "text": "marketing", "anchor_id": "marketing" },
  { "text": "." }
]
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | string | 是 | 当前文字片段，可包含换行符 `\n` |
| `anchor_id` | string | 否 | 动作寻址 ID；仅在预计有样式变化的断点设置 |

约束：

- `anchor_id` 在整个 Document 内必须唯一；
- 相邻无 Anchor 且语义连续的文字应该合并；
- Anchor 不允许嵌套；
- 一个 Anchor 可以同时承载多个不同 `effect_id` 的效果；
- Anchor 区间只能连接同一个 `TeachingBoardText` 数组中的片段。例如同一段 Quote 可以连线，跨两个 Quote 段落不能合并为一笔。

## 5. 预制 Block 组件

所有 Block 都包含：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | Document 内唯一、稳定的 Block ID |
| `type` | string | 是 | 组件类型判别字段 |

### 5.1 Title

```json
{
  "id": "expressions-title",
  "type": "title",
  "variant": "capsule",
  "text": [
    { "text": "Expressions", "anchor_id": "title-expressions" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `variant` | `normal \| capsule` | 否 | 默认 `normal` |
| `text` | `TeachingBoardText` | 是 | 标题文字，支持 Anchor |

### 5.2 Content

```json
{
  "id": "expressions-lead",
  "type": "content",
  "variant": "normal",
  "text": [
    { "text": "Simple expressions make her\nbackground clear" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `variant` | `normal` | 否 | 当前仅支持 `normal` |
| `text` | `TeachingBoardText` | 是 | 正文文字，支持 Anchor |

### 5.3 Quote

Quote 用于呈现老师正在讲解的教材原文。

```json
{
  "id": "jessie-quote",
  "type": "quote",
  "variant": "normal",
  "paragraphs": [
    [
      { "text": "I’m " },
      { "text": "good at ", "anchor_id": "good-at" },
      { "text": "numbers", "anchor_id": "numbers" },
      { "text": "." }
    ]
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `variant` | `normal` | 否 | 当前仅支持 `normal` |
| `paragraphs` | `TeachingBoardText[]` | 是 | 原文段落数组；每个段落分别支持 Anchor |

### 5.4 Order List

```json
{
  "id": "interview-questions",
  "type": "order_list",
  "variant": "normal",
  "initial_active_item_id": "question-name",
  "items": [
    {
      "id": "question-name",
      "title": [{ "text": "NAME", "anchor_id": "question-name-title" }],
      "description": [{ "text": "How does she introduce herself?" }]
    },
    {
      "id": "question-school",
      "title": [{ "text": "SCHOOL", "anchor_id": "question-school-title" }],
      "description": [{ "text": "Where did she graduate from?" }]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `variant` | `normal \| simple` | 否 | 默认 `normal`；`simple` 为轻量列表 |
| `items` | array | 是 | 列表项，按展示顺序编号 |
| `items[].id` | string | 是 | 当前列表内唯一的稳定 ID |
| `items[].title` | `TeachingBoardText` | 是 | 列表项标题，支持 Anchor |
| `items[].description` | `TeachingBoardText` | 否 | 列表项说明，支持 Anchor |
| `initial_active_item_id` | string | 否 | 初始激活项，必须引用当前 `items[].id` |

播放中的激活项变化必须通过 `set_order_list_active_item` 命令完成，不应该修改原始 Document。

### 5.5 Image

```json
{
  "id": "interview-scene",
  "type": "image",
  "url": "https://example.oss-cn-shanghai.aliyuncs.com/interview.png",
  "alt": "Jessie attending a job interview",
  "caption": [
    { "text": "Jessie’s Job Interview", "anchor_id": "image-caption" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `source_id` | string | 条件必填 | 引用课程顶层 `src` 资源 |
| `url` | string | 条件必填 | 直接媒体地址；优先级高于 `source_id` |
| `alt` | string | 否 | 无障碍替代文字，建议提供 |
| `caption` | `TeachingBoardText` | 否 | 图片说明，支持 Anchor |

`source_id` 和 `url` 至少应该提供一个。OSS 地址保存永久原始 URL，Learner 在加载课程时统一加签，不应把临时签名 URL 持久化。

### 5.6 Video

```json
{
  "id": "interview-video",
  "type": "video",
  "source_id": "video-interview-opening",
  "poster_url": "https://example.oss-cn-shanghai.aliyuncs.com/poster.png",
  "controls": true,
  "autoplay": false,
  "loop": false,
  "muted": false,
  "caption": [{ "text": "Listen for four key details." }]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `source_id` | string | 条件必填 | 引用课程顶层 `src` 视频资源 |
| `url` | string | 条件必填 | 直接视频地址；优先级高于 `source_id` |
| `poster_source_id` | string | 否 | 引用课程顶层 `src` 封面资源 |
| `poster_url` | string | 否 | 直接封面地址；优先级高于 `poster_source_id` |
| `caption` | `TeachingBoardText` | 否 | 视频说明，支持 Anchor |
| `autoplay` | boolean | 否 | 是否自动播放，默认 `false` |
| `loop` | boolean | 否 | 是否循环播放，默认 `false` |
| `muted` | boolean | 否 | 是否静音，默认 `false` |
| `controls` | boolean | 否 | 是否显示控制条，默认 `true` |

`source_id` 和 `url` 至少应该提供一个。移动端始终使用行内播放模式。

### 5.7 扩展 Block

尚未进入公共协议的组件必须使用 `x_` 前缀：

```json
{
  "id": "grammar-chart",
  "type": "x_grammar_chart",
  "version": 1,
  "data": {}
}
```

当前客户端遇到未注册的 `x_*` Block 会安全忽略。扩展组件必须遵循以下要求：

- `id` 和 `type` 必填；
- `type` 必须以 `x_` 开头；
- 自定义字段不得改变已有公共字段的语义；
- 成为稳定公共能力后，再在下一版协议中升级为预制 Block。

## 6. 动作与效果

动作属于 Creator Project 或课程编排层，不写入 TeachingBoard Document。

### 6.1 Action

```json
{
  "id": "action-underline-good-at",
  "name": "划线 good at",
  "at_ms": 30580,
  "time_ref": {
    "segment_id": "segment-16",
    "token_id": "segment-16-token-5",
    "boundary": "start"
  },
  "command": {
    "type": "apply_effect",
    "effect": {
      "effect_id": "underline-good-at",
      "type": "underline",
      "tone": "annotation",
      "target": { "anchor_id": "good-at" }
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 动作稳定 ID |
| `name` | string | 是 | Creator 中显示的动作名称 |
| `at_ms` | integer | 是 | 最终执行时间，非负毫秒；运行时唯一时间真值 |
| `time_ref` | object | 否 | Creator 可编辑的字幕字词引用 |
| `command` | object | 是 | 要发送给白板的命令 |

运行规则：

- 动作按 `at_ms` 从小到大执行；
- 相同时间的动作应该按 `actions` 数组顺序执行；
- 即使存在 `time_ref`，播放器也只使用 `at_ms`；
- 字幕轴被替换时，Creator 可以用 `time_ref` 重算 `at_ms`；
- 手动修改 `at_ms` 时应该移除 `time_ref`，避免产生虚假的绑定关系。

### 6.2 Effect

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `effect_id` | string | 是 | 效果实例 ID；重复应用同一 ID 会替换旧效果 |
| `type` | enum | 是 | 效果类型 |
| `target` | object | 是 | 单 Anchor 或 Anchor 区间 |
| `tone` | enum | 否 | 颜色语义，默认 `annotation` |
| `text` | string | 条件必填 | `label` 的批注文字 |

效果类型：

| `type` | 语义 |
| --- | --- |
| `underline` | 划线 |
| `circle` | 圈画 |
| `highlight` | 高亮底色 |
| `text_emphasis` | 文字着重或变色 |
| `label` | 在文字附近显示批注 |

颜色语义：

| `tone` | 语义 |
| --- | --- |
| `primary` | 教学主强调 |
| `annotation` | 主要批注，默认值 |
| `secondary` | 次要批注 |

JSON 不得把 `tone` 替换为具体颜色。颜色映射由 TeachingBoard 主题统一管理。

### 6.3 Target

单个 Anchor：

```json
{
  "anchor_id": "marketing"
}
```

连续 Anchor 区间：

```json
{
  "anchor_range": {
    "start_anchor_id": "good-at",
    "end_anchor_id": "numbers"
  }
}
```

区间包含起点、终点及二者之间的全部文字片段。起点和终点必须属于同一个 `TeachingBoardText` 数组，才能合并为一笔连续效果。

## 7. Command 协议

### 7.1 应用效果 `apply_effect`

```json
{
  "type": "apply_effect",
  "effect": {
    "effect_id": "label-marketing",
    "type": "label",
    "tone": "annotation",
    "text": "市场营销",
    "target": { "anchor_id": "marketing" }
  }
}
```

同一 `effect_id` 再次应用时覆盖旧效果，适合更新批注内容或目标。

### 7.2 移除单个效果 `remove_effect`

```json
{
  "type": "remove_effect",
  "effect_id": "label-marketing"
}
```

当前协议和 Learner 支持该命令；Creator Studio 暂未提供对应的可视化命令选项，可通过 JSON 或上层编排器生成。

### 7.3 清空效果 `clear_effects`

```json
{
  "type": "clear_effects"
}
```

只清空圈画、划线、高亮、变色和批注效果，不改变 Document，也不负责切换列表项。

### 7.4 切换列表激活项 `set_order_list_active_item`

```json
{
  "type": "set_order_list_active_item",
  "block_id": "interview-questions",
  "item_id": "question-school"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `block_id` | string | 是 | 必须引用 `order_list` Block |
| `item_id` | string | 否 | 引用该列表的 `items[].id`；省略时移除运行时覆盖，恢复初始状态 |

## 8. Broadcast Message

标准消息 payload：

```json
{
  "message_id": "action-underline-good-at-1724471200000",
  "channel": "lesson/jessie/expressions",
  "board_id": "jessie-expressions",
  "command": {
    "type": "apply_effect",
    "effect": {
      "effect_id": "underline-good-at-numbers",
      "type": "underline",
      "tone": "annotation",
      "target": {
        "anchor_range": {
          "start_anchor_id": "good-at",
          "end_anchor_id": "numbers"
        }
      }
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `message_id` | string | 是 | 消息唯一 ID；Learner 使用它防止重复处理 |
| `channel` | string | 是 | 必须匹配 Document 的有效广播通道 |
| `board_id` | string | 否 | 建议提供，用于同通道内进一步隔离白板 |
| `command` | object | 是 | 第 7 节定义的命令 |

白板的有效通道为：

```text
document.broadcast_channel ?? document.board_id
```

在当前 Creator 与 Mobile iframe 联调中，外层消息格式为：

```json
{
  "type": "DITTO_TEACHING_BOARD_COMMAND",
  "payload": {
    "message_id": "message-unique-id",
    "channel": "lesson/jessie/expressions",
    "board_id": "jessie-expressions",
    "command": { "type": "clear_effects" }
  }
}
```

`postMessage`、应用内事件总线或服务端推送只是传输方式，不改变 payload 规范。

## 9. Creator Project

Creator Project 是完整可编辑工程：

```json
{
  "schema": "ditto.teaching-board-project.v1",
  "name": "Jessie · Expressions",
  "document": {},
  "actions": [],
  "narration": {}
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schema` | string | 是 | 固定为 `ditto.teaching-board-project.v1` |
| `name` | string | 是 | Creator 工程名称 |
| `document` | object | 是 | 第 4 节定义的 TeachingBoard Document |
| `actions` | array | 是 | 第 6 节定义的动作时间线 |
| `narration` | object | 否 | 教师语音及逐字字幕轴 |

Project 是 Creator 的编辑与导出格式。课程发布管线应该显式决定如何把 `actions` 和 `narration` 接入 Node/Activity 编排，不应把整个 Project 直接作为 `teaching_board.document`。

## 10. 语音与逐字字幕轴

### 10.1 Narration

```json
{
  "audio_url": "https://example.oss-cn-shanghai.aliyuncs.com/teacher/jessie.mp3",
  "audio_name": "jessie-expressions.mp3",
  "duration_ms": 62485,
  "subtitle_axis": {
    "source_task_id": "d59b8ad9-32c3-4e22-bb93-14e168123862",
    "segments": []
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `audio_url` | string | 否 | OSS 永久原始地址；预览和播放时加签 |
| `audio_name` | string | 否 | Creator 展示名称 |
| `duration_ms` | integer | 否 | 音频总时长，非负毫秒 |
| `subtitle_axis` | object | 否 | 句子级和字词级字幕轴 |

不得把有过期时间的签名 URL 写入 `audio_url`。

### 10.2 Subtitle Axis

```json
{
  "source_task_id": "speech-recognition-task-id",
  "segments": [
    {
      "id": "segment-16",
      "text": "I'm good at numbers",
      "start_ms": 30334,
      "end_ms": 31653,
      "tokens": [
        {
          "id": "segment-16-token-1",
          "text": "I'm",
          "start_ms": 30334,
          "end_ms": 30580
        },
        {
          "id": "segment-16-token-2",
          "text": "good",
          "start_ms": 30580,
          "end_ms": 30720
        },
        {
          "id": "segment-16-token-3",
          "text": "at",
          "start_ms": 30720,
          "end_ms": 30950
        },
        {
          "id": "segment-16-token-4",
          "text": "numbers",
          "start_ms": 30950,
          "end_ms": 31653
        }
      ]
    }
  ]
}
```

Segment 字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 句子稳定 ID |
| `text` | string | 是 | 完整句子文案 |
| `start_ms` | integer | 是 | 句子开始时间 |
| `end_ms` | integer | 是 | 句子结束时间 |
| `tokens` | array | 是 | 字、单词、标点或空格的细粒度时间数组 |

Token 字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 当前字幕轴内稳定的 Token ID |
| `text` | string | 是 | 一个汉字、英文单词、标点或空格 |
| `start_ms` | integer | 是 | Token 开始时间 |
| `end_ms` | integer | 是 | Token 结束时间 |

时间约束：

- 所有时间为非负整数毫秒；
- `start_ms <= end_ms`；
- Segment 应按 `start_ms` 升序排列；
- Token 应按语音顺序排列，并处于所属 Segment 时间范围内；
- 标点或空格允许零时长，即 `start_ms === end_ms`；
- `segment.text` 应与 `tokens[].text` 拼接后的可见文本保持一致。

### 10.3 字幕导入兼容格式

Creator 可以导入语音识别服务的原始格式：

```json
{
  "task_id": "speech-recognition-task-id",
  "segments": [
    {
      "text": "好，视频看完了",
      "start_time": 134,
      "end_time": 1813,
      "words": [
        {
          "text": "好",
          "start_time": 134,
          "end_time": 345,
          "attribute": {}
        }
      ]
    }
  ]
}
```

导入后标准化规则：

| 原始字段 | 标准字段 |
| --- | --- |
| `task_id` | `source_task_id` |
| `segments[].start_time` | `segments[].start_ms` |
| `segments[].end_time` | `segments[].end_ms` |
| `segments[].words` | `segments[].tokens` |
| `words[].start_time` | `tokens[].start_ms` |
| `words[].end_time` | `tokens[].end_ms` |

缺少 ID 时，Creator 按顺序生成 `segment-{n}` 和 `segment-{n}-token-{m}`。为了让动作的 `time_ref` 在重新导入后仍然有效，上游正式数据最好直接提供稳定 ID。

### 10.4 Action Time Reference

```json
{
  "segment_id": "segment-16",
  "token_id": "segment-16-token-2",
  "boundary": "end"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `segment_id` | string | 是 | 引用 `subtitle_axis.segments[].id` |
| `token_id` | string | 是 | 引用该 Segment 的 `tokens[].id` |
| `boundary` | `start \| end` | 是 | 使用 Token 的开始或结束时间 |

例如 `boundary = end` 时：

```text
action.at_ms = referencedToken.end_ms
```

## 11. 完整 Project 样例

```json
{
  "schema": "ditto.teaching-board-project.v1",
  "name": "Jessie · Expressions",
  "document": {
    "schema": "ditto.teaching-board.v1",
    "board_id": "jessie-expressions",
    "broadcast_channel": "lesson/jessie/expressions",
    "blocks": [
      {
        "id": "expressions-title",
        "type": "title",
        "variant": "capsule",
        "text": [
          { "text": "Expressions", "anchor_id": "title-expressions" }
        ]
      },
      {
        "id": "expressions-lead",
        "type": "content",
        "variant": "normal",
        "text": [
          { "text": "Simple expressions make her\nbackground clear" }
        ]
      },
      {
        "id": "jessie-quote",
        "type": "quote",
        "variant": "normal",
        "paragraphs": [
          [
            { "text": "Hi, I’m " },
            { "text": "Jessie Chen", "anchor_id": "name" },
            { "text": "." }
          ],
          [
            { "text": "I’m " },
            { "text": "good at ", "anchor_id": "good-at" },
            { "text": "numbers", "anchor_id": "numbers" },
            { "text": "." }
          ]
        ]
      },
      {
        "id": "expression-list",
        "type": "order_list",
        "variant": "simple",
        "items": [
          {
            "id": "pattern-good-at",
            "title": [
              { "text": "BE GOOD AT", "anchor_id": "list-good-at-title" }
            ],
            "description": [
              { "text": "be good at + noun/-ing" }
            ]
          }
        ]
      }
    ]
  },
  "actions": [
    {
      "id": "action-underline-range",
      "name": "连线 good at 到 numbers",
      "at_ms": 30720,
      "time_ref": {
        "segment_id": "segment-1",
        "token_id": "segment-1-token-good",
        "boundary": "end"
      },
      "command": {
        "type": "apply_effect",
        "effect": {
          "effect_id": "underline-good-at-numbers",
          "type": "underline",
          "tone": "annotation",
          "target": {
            "anchor_range": {
              "start_anchor_id": "good-at",
              "end_anchor_id": "numbers"
            }
          }
        }
      }
    },
    {
      "id": "action-active-pattern",
      "name": "激活句型卡片",
      "at_ms": 31653,
      "command": {
        "type": "set_order_list_active_item",
        "block_id": "expression-list",
        "item_id": "pattern-good-at"
      }
    }
  ],
  "narration": {
    "audio_url": "https://example.oss-cn-shanghai.aliyuncs.com/teacher/jessie.mp3",
    "audio_name": "jessie-expressions.mp3",
    "duration_ms": 31653,
    "subtitle_axis": {
      "source_task_id": "speech-recognition-task-id",
      "segments": [
        {
          "id": "segment-1",
          "text": "I'm good at numbers",
          "start_ms": 30334,
          "end_ms": 31653,
          "tokens": [
            {
              "id": "segment-1-token-im",
              "text": "I'm",
              "start_ms": 30334,
              "end_ms": 30580
            },
            {
              "id": "segment-1-token-good",
              "text": "good",
              "start_ms": 30580,
              "end_ms": 30720
            },
            {
              "id": "segment-1-token-at",
              "text": "at",
              "start_ms": 30720,
              "end_ms": 30950
            },
            {
              "id": "segment-1-token-numbers",
              "text": "numbers",
              "start_ms": 30950,
              "end_ms": 31653
            }
          ]
        }
      ]
    }
  }
}
```

## 12. 校验规则

发布前必须通过以下校验：

### 12.1 Document

- `schema === "ditto.teaching-board.v1"`；
- `board_id` 非空；
- `blocks` 是数组，正式白板至少包含一个 Block；
- Block ID 不重复；
- Anchor ID 不重复；
- `initial_active_item_id` 引用同一个列表的有效 Item；
- `source_id` 引用课程 `src` 中存在的资源；
- `x_*` 之外的未知 Block 类型判为错误。

### 12.2 Action 与 Command

- `at_ms` 是非负整数；
- `apply_effect` 的 Anchor 必须存在；
- Anchor Range 两端必须位于同一个文本数组；
- `label` 必须提供非空 `text`；
- `set_order_list_active_item.block_id` 必须引用 `order_list`；
- `item_id` 存在时必须引用对应列表的 Item；
- `time_ref` 存在时，Segment 和 Token 必须存在；
- `time_ref` 解析出的时间应该等于 `at_ms`。

### 12.3 字幕轴

- Segment ID、Token ID 分别唯一；
- 时间均为非负整数；
- 开始时间不晚于结束时间；
- Segment 和 Token 按时间顺序排列；
- Token 位于所属 Segment 的时间范围内；
- 至少包含一个有字词时间信息的 Segment。

## 13. 版本与兼容策略

- 新增可选字段属于向后兼容修改，可以保持 `v1`；
- 新增实验组件优先使用 `x_*` 扩展机制；
- 删除字段、改变既有字段语义或改变必填规则属于破坏性修改，必须升级 Schema；
- 客户端必须安全忽略未注册的 `x_*` Block；
- 客户端不得静默渲染未知的非 `x_*` 公共 Block；
- 发布数据不得依赖 Creator 的本地状态或临时 URL。

## 14. 当前实现索引

- Creator 类型：`src/types/teachingBoard.ts`
- Creator Studio：`src/pages/teaching-board-studio/`
- 字幕标准化：`src/pages/teaching-board-studio/subtitleAxis.ts`
- Learner 类型：`frontend/ditto-mobile-app/src/pages/atb-v2/types/teachingBoard.ts`
- Learner Renderer：`frontend/ditto-mobile-app/src/pages/atb-v2/components/teaching-board/TeachingBoard.tsx`
- 广播运行时：`frontend/ditto-mobile-app/src/pages/atb-v2/lib/teachingBoardBroadcast.ts`

配套生成流程参见：[Agent 生成 TeachingBoard 与 Action 的顺序 SOP](./teaching-board-agent-generation-sop.md)。
