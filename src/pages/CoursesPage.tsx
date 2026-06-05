import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, InputNumber, Modal, Space, Table, Typography, message } from 'antd'
import SignedImage from '../components/SignedImage'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { coursesApi, type CourseOut, type CourseCreate, type CourseUpdate } from '../api/courses'
import ImageOssUploadField from '../components/ImageOssUploadField'

const { Title, Text } = Typography

export default function CoursesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<CourseOut[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CourseOut | null>(null)
  const [form] = Form.useForm<CourseCreate & CourseUpdate>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await coursesApi.listCourses()
      setCourses(list)
    } catch {
      message.error('加载课程列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0 })
    setModalOpen(true)
  }

  const openEdit = (row: CourseOut) => {
    setEditing(row)
    form.setFieldsValue({
      title: row.title,
      description: row.description ?? undefined,
      sort_order: row.sort_order,
      cover_image_url: row.cover_image_url ?? undefined,
    })
    setModalOpen(true)
  }

  const submitCourse = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        await coursesApi.updateCourse(editing.id, values)
        message.success('已更新课程')
      } else {
        await coursesApi.createCourse(values as CourseCreate)
        message.success('已创建课程')
      }
      setModalOpen(false)
      void load()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error('保存失败')
    }
  }

  const removeCourse = (row: CourseOut) => {
    Modal.confirm({
      title: '删除课程',
      content: `确定删除「${row.title}」？其下里程碑与课节将一并删除。`,
      okType: 'danger',
      onOk: async () => {
        try {
          await coursesApi.deleteCourse(row.id)
          message.success('已删除')
          void load()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  const columns: ColumnsType<CourseOut> = [
    {
      title: '封面',
      dataIndex: 'cover_image_url',
      key: 'cover',
      width: 72,
      render: (url: string | null) =>
        url ? (
          <SignedImage src={url} alt="" width={48} height={27} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 88 },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/courses/${row.id}`)}>
            管理
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => removeCourse(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          课程管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建课程
        </Button>
      </div>

      <Table<CourseOut>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={courses}
        pagination={false}
      />

      <Modal
        title={editing ? '编辑课程' : '新建课程'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void submitCourse()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="课程名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序（越小越靠前）">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cover_image_url" label="Hero 封面（可选）">
            <ImageOssUploadField placeholder="上传课程封面" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
