import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  message,
} from 'antd'
import { AudioOutlined, CopyOutlined, SoundOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { createVoiceClone, type VoiceCloneResult } from '../api/voiceClone'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const MODEL_OPTIONS = [
  { value: 'speech-2.8-hd', label: 'speech-2.8-hd（推荐）' },
  { value: 'speech-2.8-turbo', label: 'speech-2.8-turbo' },
  { value: 'speech-2.6-hd', label: 'speech-2.6-hd' },
  { value: 'speech-2.6-turbo', label: 'speech-2.6-turbo' },
]

const DEFAULT_PREVIEW_TEXT =
  '大兄弟，听您口音不是本地人吧，头回来天津卫，啊，待会您可甭跟着导航走，那玩意儿净给您往大马路上绕。'

function beforeAudioUpload(file: File) {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a']
  const extOk = /\.(mp3|m4a|wav)$/i.test(file.name)
  if (!allowed.includes(file.type) && !extOk) {
    message.error('仅支持 mp3、m4a、wav 格式')
    return Upload.LIST_IGNORE
  }
  if (file.size > 20 * 1024 * 1024) {
    message.error('音频文件不能超过 20MB')
    return Upload.LIST_IGNORE
  }
  return false
}

export default function VoiceClonePage() {
  const [form] = Form.useForm()
  const [cloneFileList, setCloneFileList] = useState<UploadFile[]>([])
  const [promptFileList, setPromptFileList] = useState<UploadFile[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VoiceCloneResult | null>(null)

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const cloneFile = cloneFileList[0]?.originFileObj
    if (!cloneFile) {
      message.error('请上传待复刻音频')
      return
    }

    const promptFile = promptFileList[0]?.originFileObj ?? null
    if ((promptFile && !values.prompt_text?.trim()) || (!promptFile && values.prompt_text?.trim())) {
      message.error('示例音频与示例文本需同时填写')
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const res = await createVoiceClone({
        voice_id: values.voice_id,
        preview_text: values.preview_text,
        model: values.model,
        prompt_text: values.prompt_text,
        need_noise_reduction: values.need_noise_reduction,
        need_volume_normalization: values.need_volume_normalization,
        clone_audio: cloneFile,
        prompt_audio: promptFile,
      })
      setResult(res)
      message.success('音色克隆成功')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '语音克隆失败')
    } finally {
      setLoading(false)
    }
  }

  const copyVoiceId = async () => {
    if (!result?.voice_id) return
    try {
      await navigator.clipboard.writeText(result.voice_id)
      message.success('已复制 voice_id')
    } catch {
      message.error('复制失败，请手动复制')
    }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <Space align="center" style={{ marginBottom: 8 }}>
        <SoundOutlined style={{ fontSize: 22, color: '#6366f1' }} />
        <Title level={3} style={{ margin: 0 }}>语音克隆</Title>
      </Space>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        上传待复刻音频，调用 MiniMax 快速复刻接口生成自定义 voice_id。
        复刻后 7 天内需至少调用一次 TTS，否则音色会被系统删除。
      </Paragraph>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        message="音频要求"
        description={
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>复刻音频：mp3 / m4a / wav，10 秒–5 分钟，≤ 20MB</li>
            <li>示例音频（可选）：&lt; 8 秒，需同时填写对应文本以增强相似度</li>
            <li>voice_id：8–256 字符，英文字母开头，仅字母数字与 -、_</li>
          </ul>
        }
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          model: 'speech-2.8-hd',
          preview_text: DEFAULT_PREVIEW_TEXT,
          need_noise_reduction: false,
          need_volume_normalization: false,
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Card title="复刻参数" size="small">
              <Form.Item
                label="自定义 voice_id"
                name="voice_id"
                rules={[
                  { required: true, message: '请输入 voice_id' },
                  { min: 8, message: '至少 8 个字符' },
                  { max: 256, message: '最多 256 个字符' },
                  {
                    pattern: /^[A-Za-z][A-Za-z0-9_-]*[A-Za-z0-9]$/,
                    message: '须以字母开头，不能以 - 或 _ 结尾',
                  },
                ]}
                extra="克隆成功后可填入 Minimax 文本配音工具的 voice_id"
              >
                <Input placeholder="例如 DittoVoice01" />
              </Form.Item>

              <Form.Item label="待复刻音频" required>
                <Upload
                  accept=".mp3,.m4a,.wav,audio/*"
                  maxCount={1}
                  fileList={cloneFileList}
                  beforeUpload={beforeAudioUpload}
                  onChange={({ fileList }) => setCloneFileList(fileList)}
                  onRemove={() => setCloneFileList([])}
                >
                  <Button icon={<UploadOutlined />}>选择音频文件</Button>
                </Upload>
              </Form.Item>

              <Form.Item label="示例音频（可选）">
                <Upload
                  accept=".mp3,.m4a,.wav,audio/*"
                  maxCount={1}
                  fileList={promptFileList}
                  beforeUpload={beforeAudioUpload}
                  onChange={({ fileList }) => setPromptFileList(fileList)}
                  onRemove={() => setPromptFileList([])}
                >
                  <Button icon={<AudioOutlined />}>选择示例音频</Button>
                </Upload>
              </Form.Item>

              <Form.Item label="示例文本" name="prompt_text">
                <TextArea rows={2} placeholder="与示例音频内容一致，句末需有标点" />
              </Form.Item>

              <Form.Item label="试听文本" name="preview_text">
                <TextArea rows={3} placeholder="填写后将使用克隆音色合成试听音频" />
              </Form.Item>

              <Form.Item label="试听模型" name="model">
                <Select options={MODEL_OPTIONS} />
              </Form.Item>

              <Space size="large">
                <Form.Item label="降噪" name="need_noise_reduction" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="音量归一化" name="need_volume_normalization" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="克隆结果" size="small">
              {result ? (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text type="secondary">voice_id</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text code copyable={{ text: result.voice_id }}>{result.voice_id}</Text>
                      <Button size="small" icon={<CopyOutlined />} onClick={copyVoiceId}>
                        复制
                      </Button>
                    </div>
                  </div>

                  {result.input_sensitive_type != null && result.input_sensitive_type !== 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message={`输入音频命中风控（类型 ${result.input_sensitive_type}）`}
                    />
                  )}

                  {result.demo_audio_url ? (
                    <div>
                      <Text type="secondary">试听音频</Text>
                      {result.demo_audio_duration != null && (
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {result.demo_audio_duration}s
                        </Text>
                      )}
                      <audio
                        controls
                        src={result.demo_audio_url}
                        style={{ width: '100%', marginTop: 8 }}
                      />
                    </div>
                  ) : (
                    <Text type="secondary">未生成试听音频（未填写试听文本）</Text>
                  )}
                </Space>
              ) : (
                <Text type="secondary">提交后将在此展示 voice_id 与试听音频</Text>
              )}
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24 }}>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            开始克隆
          </Button>
        </div>
      </Form>
    </div>
  )
}
