import type { SDUISchemaNode } from '@laix/ditto-core-engine'
import { needsSignedMediaUrl, resolveSignedMediaUrls } from './signMediaCache'

function collectMediaUrls(node: SDUISchemaNode, out: Set<string>) {
  if (node.type === 'image' || node.type === 'video') {
    const src = node.props?.src
    if (typeof src === 'string' && needsSignedMediaUrl(src)) out.add(src.trim())
  }
  const children = node.children
  if (Array.isArray(children)) {
    for (const child of children) collectMediaUrls(child, out)
  }
}

function patchMediaUrls(node: SDUISchemaNode, signed: Record<string, string>): SDUISchemaNode {
  const next: SDUISchemaNode = { ...node, props: node.props ? { ...node.props } : undefined }
  if ((next.type === 'image' || next.type === 'video') && next.props) {
    const src = next.props.src
    if (typeof src === 'string') {
      const trimmed = src.trim()
      next.props.src = signed[trimmed] ?? src
    }
  }
  if (Array.isArray(node.children)) {
    next.children = node.children.map((child) => patchMediaUrls(child, signed))
  }
  return next
}

export async function signSchemaMediaUrls(schema: SDUISchemaNode): Promise<SDUISchemaNode> {
  const urls = new Set<string>()
  collectMediaUrls(schema, urls)
  if (!urls.size) return schema
  const signed = await resolveSignedMediaUrls([...urls])
  return patchMediaUrls(schema, signed)
}
