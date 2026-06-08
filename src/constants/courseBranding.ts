export type PageTexturePreset = 'rice_paper' | 'leaf' | 'linen'

export interface PageTexture {
  preset?: PageTexturePreset | null
  url?: string | null
  opacity?: number
  tile_size?: number
}

export interface MetaIcon {
  url: string
}

export interface CourseBranding {
  page_texture?: PageTexture | null
  meta_icon?: MetaIcon | null
}

export const PAGE_TEXTURE_PRESETS: readonly {
  id: PageTexturePreset
  label: string
  description: string
}[] = [
  { id: 'rice_paper', label: '宣纸', description: '淡米色细纤维纹理' },
  { id: 'leaf', label: '叶片', description: '低对比植物暗纹' },
  { id: 'linen', label: '亚麻', description: '织物十字织纹' },
] as const
