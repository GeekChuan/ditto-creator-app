import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd'
import { benefitsApi, type BenefitCodeOut, type BenefitProductOut, type CourseCollectionOut } from '../api/benefits'
import { coursesApi, type CourseOut } from '../api/courses'

const { Title } = Typography

export default function BenefitsPage() {
  const [collections, setCollections] = useState<CourseCollectionOut[]>([])
  const [products, setProducts] = useState<BenefitProductOut[]>([])
  const [courses, setCourses] = useState<CourseOut[]>([])
  const [codes, setCodes] = useState<BenefitCodeOut[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>()
  const [loading, setLoading] = useState(false)

  const [createCollectionOpen, setCreateCollectionOpen] = useState(false)
  const [createProductOpen, setCreateProductOpen] = useState(false)
  const [genCodeOpen, setGenCodeOpen] = useState(false)
  const [collectionForm] = Form.useForm()
  const [productForm] = Form.useForm()
  const [codeForm] = Form.useForm()

  const loadAll = async () => {
    setLoading(true)
    try {
      const [cs, ps, crs] = await Promise.all([benefitsApi.listCollections(), benefitsApi.listProducts(), coursesApi.listCourses()])
      setCollections(cs)
      setProducts(ps)
      setCourses(crs)
      if (!selectedProductId && ps.length) setSelectedProductId(ps[0].id)
    } finally {
      setLoading(false)
    }
  }

  const loadCodes = async (productId?: string) => {
    if (!productId) return
    const res = await benefitsApi.listCodes(productId)
    setCodes(res.items)
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    void loadCodes(selectedProductId)
  }, [selectedProductId])

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>权益码运营</Title>
        <Space>
          <Button onClick={() => setCreateCollectionOpen(true)}>新建课程合集</Button>
          <Button onClick={() => setCreateProductOpen(true)}>新建售卖商品</Button>
          <Button type="primary" onClick={() => setGenCodeOpen(true)} disabled={!selectedProductId}>批量生成权益码</Button>
        </Space>
      </Space>

      <Card title="商品选择" loading={loading} style={{ marginBottom: 16 }}>
        <Select
          value={selectedProductId}
          onChange={setSelectedProductId}
          style={{ width: 420 }}
          options={products.map((p) => ({ value: p.id, label: `${p.title} (${p.validity_days}天)` }))}
          placeholder="请选择商品"
        />
      </Card>

      <Table
        rowKey="id"
        dataSource={codes}
        columns={[
          { title: '权益码', dataIndex: 'code' },
          { title: '状态', dataIndex: 'status', width: 120 },
          { title: '到期时间', dataIndex: 'expires_at', render: (v: string | null) => (v ? new Date(v).toLocaleString() : '-') },
          {
            title: '操作',
            key: 'actions',
            render: (_, row) => (
              <Button
                size="small"
                danger
                disabled={row.status !== 'unused'}
                onClick={async () => {
                  await benefitsApi.revokeCode(row.id)
                  message.success('已作废')
                  void loadCodes(selectedProductId)
                }}
              >
                作废
              </Button>
            ),
          },
        ]}
      />

      <Modal title="新建课程合集" open={createCollectionOpen} onCancel={() => setCreateCollectionOpen(false)} onOk={async () => {
        const values = await collectionForm.validateFields()
        await benefitsApi.createCollection(values)
        message.success('课程合集已创建')
        setCreateCollectionOpen(false)
        collectionForm.resetFields()
        void loadAll()
      }}>
        <Form form={collectionForm} layout="vertical">
          <Form.Item name="title" label="合集名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="course_ids" label="课程" rules={[{ required: true }]}>
            <Select mode="multiple" options={courses.map((c) => ({ value: c.id, label: c.title }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新建售卖商品" open={createProductOpen} onCancel={() => setCreateProductOpen(false)} onOk={async () => {
        const values = await productForm.validateFields()
        await benefitsApi.createProduct(values)
        message.success('商品已创建')
        setCreateProductOpen(false)
        productForm.resetFields()
        void loadAll()
      }}>
        <Form form={productForm} layout="vertical" initialValues={{ validity_days: 365 }}>
          <Form.Item name="title" label="商品名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="course_collection_id" label="课程合集" rules={[{ required: true }]}>
            <Select options={collections.map((c) => ({ value: c.id, label: c.title }))} />
          </Form.Item>
          <Form.Item name="validity_days" label="有效天数" rules={[{ required: true }]}>
            <InputNumber min={1} max={3650} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="批量生成权益码" open={genCodeOpen} onCancel={() => setGenCodeOpen(false)} onOk={async () => {
        const values = await codeForm.validateFields()
        await benefitsApi.batchGenerateCodes(selectedProductId!, values)
        message.success('权益码已生成')
        setGenCodeOpen(false)
        codeForm.resetFields()
        void loadCodes(selectedProductId)
      }}>
        <Form form={codeForm} layout="vertical" initialValues={{ quantity: 20, prefix: 'DT' }}>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
            <InputNumber min={1} max={5000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="prefix" label="前缀" rules={[{ required: true }]}>
            <Input maxLength={8} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
