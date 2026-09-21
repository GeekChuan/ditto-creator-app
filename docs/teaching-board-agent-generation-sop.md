# Agent 生成 TeachingBoard 与 Action 的顺序 SOP

> SOP 版本：1.0  
> 适用协议：`ditto.teaching-board.v1` / `ditto.teaching-board-project.v1`  
> 前提：课节讲解逐字稿已经确认，不由本流程重新创作  
> 最后更新：2026-08-24

## 1. 目标

本 SOP 用于指导 Agent 在已有讲解逐字稿的前提下，为每个课节稳定生成：

1. TeachingBoard 静态内容；
2. 可被圈画、划线、批注的 Anchor；
3. 与讲解语音同步的 Action；
4. 可导入 Creator Studio 的 TeachingBoard Project；
5. 可审计的生成与校验报告。

核心原则是：

```text
先理解讲解顺序
→ 再规划白板场景
→ 再冻结静态内容
→ 再设置 Anchor
→ 再规划动作语义
→ 最后绑定时间
```

Agent 不得在同一步中同时猜测白板内容、Anchor 和动作时间。

## 2. 输入契约

### 2.1 必须输入

| 输入 | 说明 |
| --- | --- |
| `lesson_id` | 课节稳定 ID |
| `lesson_goal` | 本课节的学习目标 |
| `teacher_transcript` | 已确认的教师讲解逐字稿 |
| `subtitle_axis` | 至少句子级时间轴；生成精确 Action 时必须包含字词级时间 |
| `target_level` | 学员水平和语言控制要求 |
| `component_registry` | 当前允许使用的 TeachingBoard Block 类型与 variant |
| `action_registry` | 当前允许使用的 Command、Effect type 和 tone |
| `asset_catalog` | 可用图片、视频及课程 `src` 资源；没有素材时传空数组 |

### 2.2 推荐输入

| 输入 | 说明 |
| --- | --- |
| `teaching_points` | 教研确认的词汇、句型、听力或文化重点 |
| `node_plan` | 已确认的 Activity / Node 切分 |
| `reference_boards` | 已通过审核的视觉或 JSON 样例 |
| `forbidden_content` | 不得上白板的答案、敏感信息或未教内容 |
| `max_board_scenes` | 当前课节允许的白板场景上限 |
| `course_src` | `source_id` 可以引用的课程资源列表 |

### 2.3 逐字稿冻结规则

`teacher_transcript` 是本流程的只读事实源。

Agent 必须：

- 保留句子顺序；
- 保留原始语义；
- 使用字幕轴中的真实时间；
- 把发现的口误、拼写或时间异常写入 QA 报告。

Agent 不得：

- 为了适配白板而重写讲解逐字稿；
- 静默修改原句；
- 编造字幕中不存在的字词时间；
- 把推测内容当成老师已经讲过的内容。

如果逐字稿需要修改，必须退出本 SOP，先完成逐字稿修订与重新打轴，再重新执行本流程。

## 3. 输出契约

每个课节应该输出以下文件或等价数据对象：

| 顺序 | 建议文件名 | 类型 | 用途 |
| --- | --- | --- | --- |
| 01 | `01_transcript_map.json` | 中间产物 | 逐字稿语义和教学节拍 |
| 02 | `02_board_scene_plan.json` | 中间产物 | 白板场景及 Block 规划 |
| 03 | `03_teaching_board.json` | 生产候选 | 静态 TeachingBoard Document |
| 04 | `04_anchor_manifest.json` | 中间产物 | Anchor 设计清单 |
| 05 | `05_action_plan.json` | 中间产物 | 尚未或已经绑定时间的动作意图 |
| 06 | `06_teaching_board_project.json` | 生产候选 | Document、Action 与 Narration 完整工程 |
| 07 | `07_generation_qa.json` | 审核产物 | 自动检查、风险与人工审核项 |

只有通过前一步 Gate 后，Agent 才能生成下一份产物。

## 4. 总体状态机

```text
S0 输入检查
 ↓ Gate 0
S1 逐字稿语义切片
 ↓ Gate 1
S2 白板场景规划
 ↓ Gate 2
S3 静态 Document 生成
 ↓ Gate 3
S4 Anchor 设计与冻结
 ↓ Gate 4
S5 Action 语义规划
 ↓ Gate 5
S6 字词级时间绑定
 ↓ Gate 6
S7 Project 编译与回放验证
 ↓ Gate 7
S8 发布候选
```

禁止跳过 S3/S4 直接从逐字稿生成 Action，因为此时 Action 没有稳定的视觉目标。

## 5. S0：输入检查与标准化

### 5.1 Agent 操作

1. 校验必填输入是否存在；
2. 确认逐字稿和字幕轴覆盖相同讲解音频；
3. 把原始 `segments[].words[]` 标准化为 `segments[].tokens[]`；
4. 确认时间单位统一为整数毫秒；
5. 记录逐字稿版本或内容 Hash；
6. 读取允许的 Block、Action 和资源范围；
7. 不生成任何白板内容。

### 5.2 Gate 0

必须满足：

- 逐字稿非空；
- 字幕 Segment 按时间顺序排列；
- 所有时间非负且 `start_ms <= end_ms`；
- 字幕文本与逐字稿整体顺序一致；
- 已知本课节教学目标；
- 已知当前协议版本。

失败处理：

- 缺少逐字时间但存在句子时间：允许继续规划白板，但 Action 时间标记为 `TBC`；
- 逐字稿与音频明显不一致：停止生成，返回 `TRANSCRIPT_AXIS_MISMATCH`；
- 教学目标缺失：停止生成，返回 `LESSON_GOAL_MISSING`。

## 6. S1：逐字稿语义切片

### 6.1 目的

把连续逐字稿转换为“教学节拍（teaching beat）”，而不是立即生成白板。

一个教学节拍表示老师在连续几句话中完成的一个明确动作，例如：

- 引出一个问题；
- 展示一句原文；
- 解释一个词；
- 拆解一个句型；
- 总结三个步骤；
- 发出练习指令。

### 6.2 切片规则

新的教学节拍通常出现在：

- 话题或教学目标变化；
- 老师说“接着”“最后”“我们来看”；
- 从原文展示切换到词义解释；
- 从解释切换到总结或练习；
- 视觉焦点需要从一个对象切换到另一个对象。

不得只按字幕 Segment 数量机械切片。多个短 Segment 可以属于同一个教学节拍。

### 6.3 中间产物

```json
{
  "lesson_id": "lesson-self-introduction-01",
  "beats": [
    {
      "beat_id": "beat-opening-review",
      "segment_ids": ["segment-1", "segment-2", "segment-3"],
      "start_ms": 134,
      "end_ms": 6525,
      "intent": "承接视频并引出表达拆解",
      "teaching_point_ids": [],
      "source_quotes": []
    },
    {
      "beat_id": "beat-good-at-example",
      "segment_ids": ["segment-15", "segment-16"],
      "start_ms": 29454,
      "end_ms": 31653,
      "intent": "展示原句 I'm good at numbers",
      "teaching_point_ids": ["pattern-good-at"],
      "source_quotes": ["I'm good at numbers"]
    }
  ]
}
```

### 6.4 Gate 1

必须满足：

- 所有用于生成白板的逐字稿 Segment 都归属一个 Beat；
- Beat 顺序与逐字稿顺序一致；
- 每个 Beat 只有一个主要教学意图；
- 原文与老师解释被明确区分；
- 没有生成逐字稿中不存在的教学重点。

## 7. S2：白板场景规划

### 7.1 先决定场景，再决定组件

一个 TeachingBoard Document 对应一个稳定的视觉场景。Action 只能改变效果和列表激活状态，不能动态增加、删除或替换 Block。

出现以下情况时，应该拆成新的白板场景或新的 Node：

- 教学目标发生变化；
- 需要替换大部分白板内容；
- 组件结构变化超过约三分之一；
- 从“问题列表”切换为“原文精讲”；
- 从静态板书切换为大图或视频主视觉；
- 当前白板已无法在一个移动屏中保持清晰阅读。

不要用大量 Action 模拟页面换版。

### 7.2 信息选择规则

白板应该展示：

- 当前正在解释的原句；
- 可复用表达或句型；
- 需要对比、圈画或记忆的关键词；
- 能降低理解成本的简短结构；
- 图片、视频等必要教学素材。

白板不应该展示：

- 教师逐字稿全文；
- 已经能从 Speech 字幕直接读到的大段中文；
- 与本节目标无关的背景知识；
- 为了“看起来丰富”而增加的装饰文案；
- 具体颜色、字号和坐标。

### 7.3 Block 选择决策

| 教学内容 | 首选 Block |
| --- | --- |
| 页面主题、知识点名称 | `title` |
| 一句话说明或学习提示 | `content` |
| 视频/教材中的原句 | `quote` |
| 多步骤、多个问题、多个并列要点 | `order_list` |
| 真实场景、人物、物品或图解 | `image` |
| 需要直接播放的素材 | `video` |
| 尚未进入公共协议的特殊视图 | `x_*` |

### 7.4 中间产物

```json
{
  "lesson_id": "lesson-self-introduction-01",
  "scenes": [
    {
      "scene_id": "scene-expressions",
      "board_id": "lesson-self-introduction-expressions",
      "beat_ids": [
        "beat-opening-review",
        "beat-name-school",
        "beat-major",
        "beat-good-at-example",
        "beat-pattern-summary"
      ],
      "purpose": "展示 Jessie 开场表达并逐项强调",
      "block_plan": [
        { "block_id": "expressions-title", "type": "title", "role": "页面主题" },
        { "block_id": "expressions-lead", "type": "content", "role": "一句话说明" },
        { "block_id": "jessie-quote", "type": "quote", "role": "待讲解原文" },
        { "block_id": "expression-list", "type": "order_list", "role": "句型总结" }
      ]
    }
  ]
}
```

### 7.5 Gate 2

必须满足：

- 每个场景有一个明确视觉目的；
- 每个 Block 都能映射到至少一个教学节拍；
- 原文使用 `quote`，而不是普通 `content`；
- 没有把 Speech 全文复制到白板；
- 场景拆分不依赖尚不存在的 Command；
- 每个场景预计可以在目标设备上清晰阅读。

## 8. S3：生成静态 TeachingBoard Document

### 8.1 生成顺序

每个场景严格按照以下顺序生成 Block：

1. Title；
2. 一句话 Content；
3. Quote 或主要素材；
4. List / 补充 Content；
5. Image / Video；
6. 其他必要组件。

这不是强制视觉顺序，而是 Agent 的生成顺序。Agent 可以根据场景规划调整最终 `blocks` 顺序，但必须先确定信息层级。

### 8.2 本阶段禁止设置 Anchor

本阶段文字统一使用：

```json
[{ "text": "I'm good at numbers." }]
```

不得过早把文字切成逐字片段。先审核文案和组件结构，再设计可变断点。

### 8.3 文案规则

- Title 尽量短；
- Content 原则上只承担一句话说明；
- Quote 必须保持教材或视频原文，不静默改写；
- 列表标题应保持平行结构；
- 中文解释应该比 Speech 更短；
- 不在 JSON 中写视觉样式字段；
- 媒体保存 OSS 永久 URL，不保存临时签名 URL。

### 8.4 Gate 3

必须满足：

- Document 符合 `ditto.teaching-board.v1`；
- Block ID 唯一；
- Block 类型和 variant 均在注册表中；
- 所有文字与教学目标相关；
- Quote 与原文一致；
- 媒体引用可解析；
- 当前阶段 Anchor 数量必须为 0。

Gate 3 通过后冻结 Block ID、Item ID、静态文案和 Block 顺序。后续步骤不得随意重写它们。

## 9. S4：Anchor 设计与冻结

### 9.1 先生成 Anchor Manifest

Agent 先回答“哪些文字会发生视觉变化”，再修改 Document。

```json
{
  "anchors": [
    {
      "anchor_id": "good-at",
      "block_id": "jessie-quote",
      "text_path": "paragraphs[1]",
      "exact_text": "good at ",
      "purpose": ["text_emphasis", "underline_range_start"],
      "teaching_point_id": "pattern-good-at"
    },
    {
      "anchor_id": "numbers",
      "block_id": "jessie-quote",
      "text_path": "paragraphs[1]",
      "exact_text": "numbers",
      "purpose": ["underline_range_end"],
      "teaching_point_id": "pattern-good-at"
    }
  ]
}
```

### 9.2 Anchor 最小化规则

只在以下位置切分：

- 将被单独圈画、高亮、变色或批注的文字；
- 连续效果的起点和终点；
- 列表标题中将被讲解的关键词；
- 图片或视频 Caption 中将被标注的文字。

不得：

- 给每个单词都设置 Anchor；
- 给永远不会发生变化的文字设置 Anchor；
- 为同一段完全相同的视觉目标重复设置 Anchor；
- 跨段落设计一个 Anchor Range；
- 让 Anchor ID 随文案序号变化。

### 9.3 应用 Anchor

静态文字：

```json
[{ "text": "I'm good at numbers." }]
```

应用 Manifest 后：

```json
[
  { "text": "I'm " },
  { "text": "good at ", "anchor_id": "good-at" },
  { "text": "numbers", "anchor_id": "numbers" },
  { "text": "." }
]
```

拼接后的文字必须与拆分前逐字符一致。

### 9.4 Gate 4

必须满足：

- Anchor ID 全局唯一；
- 每个 Anchor 都能在 Manifest 中找到用途；
- 拆分前后文字完全一致；
- 每个 Range 的两个 Anchor 位于同一个文本数组；
- 不存在未被任何计划 Action 使用的冗余 Anchor；
- Block ID 和 Item ID 没有变化。

Gate 4 通过后冻结 Anchor ID。Action 生成只能引用已经冻结的 Anchor。

## 10. S5：Action 语义规划

### 10.1 先定义动作意图，不先填时间

Action Plan 必须先说明“为什么动、动什么、什么时候从教学意义上发生”。

```json
{
  "actions": [
    {
      "action_id": "action-emphasize-good-at",
      "beat_id": "beat-good-at-example",
      "reason": "老师说到 good at 时提示句型核心",
      "target_anchor_ids": ["good-at"],
      "command_type": "apply_effect",
      "effect_type": "text_emphasis",
      "tone": "primary",
      "timing_intent": "when_target_starts",
      "lifecycle": "keep_until_pattern_summary"
    },
    {
      "action_id": "action-underline-good-at-numbers",
      "beat_id": "beat-good-at-example",
      "reason": "整句读完后显示连续搭配范围",
      "target_anchor_ids": ["good-at", "numbers"],
      "command_type": "apply_effect",
      "effect_type": "underline",
      "tone": "annotation",
      "timing_intent": "after_target_range_spoken",
      "lifecycle": "keep_until_scene_end"
    }
  ]
}
```

`timing_intent` 和 `lifecycle` 是 Agent 的规划字段，不属于正式 TeachingBoard Action Schema。编译为 Project 时应删除或写入单独的生成报告。

### 10.2 效果选择规则

| 教学意图 | 首选 Effect / Command |
| --- | --- |
| 提醒学员注意一个表达 | `text_emphasis` |
| 标出完整搭配或句型跨度 | `underline` + `anchor_range` |
| 强调一个需要聚焦的整体 | `circle` |
| 表示当前讲解区域 | `highlight` |
| 显示简短中文释义或语法提示 | `label` |
| 进入列表中的某一步 | `set_order_list_active_item` |
| 结束一组视觉效果 | `remove_effect` 或 `clear_effects` |

优先使用最少的效果表达教学意图。不要同时对同一文字施加圈画、底色、变色和划线，除非教研明确要求。

### 10.3 Action 密度规则

软性建议：

- 一个教学重点通常使用 1–3 个有意义的 Action；
- 连续讲解中避免每个字或每个字幕 Segment 都触发动作；
- 两个纯装饰 Action 间隔过短时应合并；
- 一个场景结束前应明确决定效果保留、逐个移除还是整体清空；
- 列表激活变化与老师的步骤顺序一致。

### 10.4 效果生命周期

每个 `apply_effect` 必须有生命周期策略：

| 策略 | 编译方式 |
| --- | --- |
| 保留到场景结束 | 不生成移除动作，由场景销毁清理 |
| 保留到下一个重点 | 在下一个 Beat 前生成 `remove_effect` |
| 同组效果整体结束 | 生成 `clear_effects` |
| 更新同一效果 | 重复使用相同 `effect_id` 应用新值 |

`clear_effects` 只用于清空文字效果，不代替列表激活控制。

### 10.5 Gate 5

必须满足：

- 每个 Action 都能映射到一个 Beat；
- 每个 Action 都有明确教学理由；
- 每个目标 Anchor 或 Block/Item 都存在；
- Range 位于同一文本数组；
- 每个 `apply_effect` 都有生命周期策略；
- Action 数量没有明显超过教学信息量；
- 当前阶段允许 `at_ms = TBC`，但不得编造时间。

## 11. S6：绑定字词级时间

### 11.1 时间绑定决策表

| `timing_intent` | 默认绑定规则 |
| --- | --- |
| `when_target_starts` | 目标首次出现 Token 的 `start_ms` |
| `when_target_ends` | 目标最后一个 Token 的 `end_ms` |
| `after_target_range_spoken` | Range 最后一个口播 Token 的 `end_ms` |
| `when_explanation_starts` | 解释句第一个有效 Token 的 `start_ms` |
| `when_step_starts` | 对应步骤句第一个有效 Token 的 `start_ms` |
| `before_next_beat` | 下一 Beat 第一个有效 Token 的 `start_ms` |
| `at_scene_start` | 场景第一个 Segment 的 `start_ms` |
| `at_scene_end` | 场景最后一个 Segment 的 `end_ms` |

“有效 Token”默认排除纯空格；标点是否可用由教学意图决定。

### 11.2 精确引用规则

正式 Action 同时写入：

1. `at_ms`：播放器执行真值；
2. `time_ref`：可编辑的来源引用。

例如老师讲到：

```text
I'm good at numbers
```

字词时间为：

```text
good    30580–30720
at      30720–30905
numbers 30905–31653
```

当 `text_emphasis` 要在说到 `good` 时出现：

```json
{
  "at_ms": 30580,
  "time_ref": {
    "segment_id": "segment-16",
    "token_id": "segment-16-token-5",
    "boundary": "start"
  }
}
```

当连续划线要在整句读完后出现：

```json
{
  "at_ms": 31653,
  "time_ref": {
    "segment_id": "segment-16",
    "token_id": "segment-16-token-9",
    "boundary": "end"
  }
}
```

### 11.3 同时刻动作顺序

多个 Action 使用同一 `at_ms` 时，按照 `actions` 数组顺序执行。

推荐顺序：

1. `remove_effect` / `clear_effects`；
2. `set_order_list_active_item`；
3. `apply_effect`；
4. 同组中的 `label`。

这样可以避免新效果刚应用就被同一时间的清理命令移除。

### 11.4 无逐字时间的处理

如果只有句子级时间：

- 可以使用 Segment 的 `start_ms` 或 `end_ms`；
- `time_ref` 不得伪造 Token ID；
- Action Plan 标记 `timing_status = TBC_WORD_AXIS`；
- Project 中可以暂时只写 `at_ms`；
- QA 报告必须列出需要人工校准的 Action。

### 11.5 Gate 6

必须满足：

- 每个 Action 的 `at_ms` 是非负整数；
- Action 按时间升序排列；
- `time_ref` 引用存在的 Segment 和 Token；
- `boundary` 对应的真实时间等于 `at_ms`；
- Action 时间位于所属白板场景范围内；
- 同时刻动作顺序符合预期；
- 没有使用空格 Token 作为无意义触发点。

## 12. S7：编译 TeachingBoard Project

### 12.1 编译规则

Agent 将以下产物合并：

```text
03_teaching_board.json
+ 经过 Gate 6 的 Action
+ 原始音频永久 URL
+ 标准化 subtitle_axis
= 06_teaching_board_project.json
```

Project 顶层结构：

```json
{
  "schema": "ditto.teaching-board-project.v1",
  "name": "课节名称 · 白板场景名称",
  "document": {},
  "actions": [],
  "narration": {
    "audio_url": "https://example.oss-cn-shanghai.aliyuncs.com/teacher-audio.mp3",
    "audio_name": "teacher-audio.mp3",
    "duration_ms": 62485,
    "subtitle_axis": {
      "source_task_id": "speech-task-id",
      "segments": []
    }
  }
}
```

### 12.2 OSS 规则

- Project 保存 OSS 永久原始 URL；
- Creator 和 Learner 播放前负责加签；
- Agent 不调用或持久化临时签名 URL；
- `audio_name` 只用于编辑器展示；
- 音频时长与字幕轴结束时间明显不一致时进入 QA。

## 13. S7（续）：自动回放与校验

编译完成后必须执行三类校验。

### 13.1 结构校验

- Schema 正确；
- 所有必填字段存在；
- Block、Anchor、Item、Action、Effect、Segment 和 Token ID 满足唯一性要求；
- 所有引用均可解析；
- 媒体资源存在；
- JSON 中不存在任意样式字段。

### 13.2 时间校验

- `actions` 按 `at_ms` 升序；
- `time_ref` 与 `at_ms` 一致；
- Action 不早于所属场景开始；
- Action 不晚于所属场景结束；
- 同时刻清理和应用顺序正确；
- 字幕替换后可以根据稳定 ID 重算时间。

### 13.3 状态回放校验

Agent 或验证器应该在每个关键时间点重放从 0 到当前时刻的所有 Action，检查运行状态：

```text
runtime(t) = reduce(actions where at_ms <= t)
```

至少检查：

- 场景开始；
- 每个 Action 之后；
- 每个教学节拍切换点；
- 场景结束。

检查内容：

- 当前屏幕上有哪些效果；
- 是否存在已经失去教学意义但仍未移除的效果；
- 列表激活项是否与老师当前讲解一致；
- 多个效果是否产生视觉冲突；
- 快进到任意时间时能否恢复正确状态。

### 13.4 视觉校验

在 390 基准宽移动页面中渲染并检查：

- 白板主体是否在 Speech 上方获得主要注意力；
- 文字是否溢出或过密；
- Quote 原文是否易读；
- Anchor Range 是否合并为连续一笔；
- Label 是否遮挡原文；
- 图片和视频比例是否合理；
- Action 播放时是否频繁闪动。

## 14. Gate 7：发布候选判定

只有满足以下条件，状态才能从 `DRAFT` 变成 `READY_FOR_REVIEW`：

- Gate 0–6 全部通过；
- 结构、时间和状态回放自动校验通过；
- 所有 TBC Action 已解决，或被明确列为人工任务；
- 没有孤立 Anchor；
- 没有无教学理由的 Action；
- 逐字稿没有被 Agent 修改；
- QA 报告已生成。

最终发布前仍建议人工检查：

- 教学重点是否选择正确；
- 白板是否足够精简；
- 动作是否在听感上自然；
- 中文批注是否准确；
- 视觉层级是否符合当前课程风格。

## 15. QA 报告格式

```json
{
  "lesson_id": "lesson-self-introduction-01",
  "status": "READY_FOR_REVIEW",
  "source": {
    "transcript_version": "v7",
    "subtitle_task_id": "speech-task-id"
  },
  "counts": {
    "board_scenes": 1,
    "blocks": 4,
    "anchors": 8,
    "actions": 6,
    "timed_actions": 6,
    "tbc_actions": 0
  },
  "checks": {
    "schema_valid": true,
    "references_valid": true,
    "time_refs_valid": true,
    "runtime_replay_valid": true,
    "transcript_unchanged": true
  },
  "warnings": [],
  "human_review": [
    "确认 good at 到 numbers 的连续划线出现时机",
    "确认中文批注“市场调研”的摆放不遮挡原文"
  ]
}
```

状态枚举建议：

| 状态 | 含义 |
| --- | --- |
| `INPUT_BLOCKED` | 输入不完整或逐字稿/字幕不匹配 |
| `DRAFT` | 正在生成或尚未通过全部 Gate |
| `TBC_TIMING` | 白板完成，但部分动作等待时间校准 |
| `READY_FOR_REVIEW` | 自动校验通过，等待人工审核 |
| `APPROVED` | 人工审核通过，可进入发布管线 |

## 16. Agent 重试与回退策略

发现问题时只回退到最早受影响阶段，不要全部重新生成。

| 问题 | 回退阶段 |
| --- | --- |
| 逐字稿与字幕不一致 | S0，停止后续生成 |
| 教学节拍切错 | S1 |
| 白板内容过多或场景划分错误 | S2 |
| Block 类型或静态文案错误 | S3，然后重新执行 S4–S7 |
| Anchor 断点不合理 | S4，然后重新执行 S5–S7 |
| 效果选择或生命周期错误 | S5，然后重新执行 S6–S7 |
| 动作时间不自然 | S6 |
| JSON 引用错误 | 回退到创建该 ID 的阶段 |
| 纯视觉遮挡 | 优先调整页面主题或场景内容；不得向 JSON 塞入任意坐标样式 |

保留已经冻结且未受影响的 ID，避免一次局部修改导致所有 Action 引用失效。

## 17. Agent 实施约束

### 17.1 必须遵守

- 逐阶段输出；
- 每阶段执行 Gate；
- 使用稳定 ID；
- 所有生成结论可追溯到 Beat 或逐字稿 Segment；
- `at_ms` 可追溯到字幕时间；
- Action Scheduler 或教学编排器负责发送广播；
- TeachingBoard 只接收命令并渲染状态，不主动决定教学动作。

### 17.2 禁止行为

- 一次 Prompt 直接输出未经中间校验的最终 Project；
- 让 TeachingBoard 自己通过关键词猜测动作；
- 让样式信息进入内容 JSON；
- 为了制造动效而创建无教学意义的 Action；
- 用临时签名 URL 替换永久 OSS URL；
- 生成不存在的 Anchor、Block、Item、Segment 或 Token 引用；
- 发现逐字稿问题后静默修正。

## 18. 推荐的 Agent 调用编排

同一个 Agent 可以按状态机串行完成，也可以由多个专用 Agent 完成，但产物顺序不能变化。

推荐职责拆分：

| Agent / 阶段 | 读取 | 只允许写入 |
| --- | --- | --- |
| Transcript Analyzer | 原始输入 | `01_transcript_map.json` |
| Board Planner | 输入 + 01 | `02_board_scene_plan.json` |
| Board Author | 输入 + 01–02 | `03_teaching_board.json` |
| Anchor Planner | 01–03 | `04_anchor_manifest.json` 和带 Anchor 的 Document |
| Action Planner | 01–04 | `05_action_plan.json` |
| Timing Compiler | 字幕轴 + 05 | 正式 Action |
| Project Compiler | 全部已通过产物 | `06_teaching_board_project.json` |
| QA Validator | 全部产物 | `07_generation_qa.json`，不修改生产 JSON |

无论使用几个 Agent，下游 Agent 都不得绕过上游 Gate，也不得擅自修改上游已冻结产物。

## 19. 最短执行清单

在自动化管线中，可以把本 SOP 压缩为以下不可删减的检查序列：

```text
[ ] 输入和字幕轴有效
[ ] 逐字稿已冻结
[ ] 已生成 Teaching Beat
[ ] 已确定白板场景
[ ] 静态 Document 已审核
[ ] Anchor Manifest 已审核
[ ] Anchor 拆分前后文字一致
[ ] Action 均有教学理由和生命周期
[ ] Action 已绑定真实字词边界
[ ] 所有引用有效
[ ] 任意时间回放状态正确
[ ] 390 宽视觉预览通过
[ ] QA 报告已生成
```

任何一项未完成，Project 都不能自动标记为可发布。
