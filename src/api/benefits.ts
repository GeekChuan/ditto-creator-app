import http from './http'

const API_V1 = '/api/v1'

export interface CourseCollectionOut {
  id: string
  creator_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface BenefitProductOut {
  id: string
  creator_id: string
  course_collection_id: string
  title: string
  validity_days: number
  status: string
  created_at: string
  updated_at: string
}

export interface BenefitCodeOut {
  id: string
  benefit_product_id: string
  creator_id: string
  code: string
  status: string
  expires_at: string | null
  redeemed_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedBenefitCodes {
  total: number
  page: number
  page_size: number
  items: BenefitCodeOut[]
}

export const benefitsApi = {
  listCollections: (): Promise<CourseCollectionOut[]> => http.get(`${API_V1}/course-collections`),
  createCollection: (body: { title: string; description?: string | null; course_ids: string[] }): Promise<CourseCollectionOut> =>
    http.post(`${API_V1}/course-collections`, body),
  listProducts: (): Promise<BenefitProductOut[]> => http.get(`${API_V1}/benefit-products`),
  createProduct: (body: { title: string; course_collection_id: string; validity_days: number }): Promise<BenefitProductOut> =>
    http.post(`${API_V1}/benefit-products`, body),
  batchGenerateCodes: (
    productId: string,
    body: { quantity: number; prefix: string; expires_at?: string | null },
  ): Promise<BenefitCodeOut[]> => http.post(`${API_V1}/benefit-products/${productId}/codes:batch-generate`, body),
  listCodes: (
    productId: string,
    params?: { page?: number; page_size?: number; status?: string },
  ): Promise<PaginatedBenefitCodes> => http.get(`${API_V1}/benefit-products/${productId}/codes`, { params }),
  revokeCode: (codeId: string): Promise<BenefitCodeOut> => http.post(`${API_V1}/benefit-codes/${codeId}/revoke`),
}
