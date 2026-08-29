/**
 * 墨萃 (InkGist) AI 深度总结结构精准语义提取器
 * 用于精准映射到各类知识库（如 Karakeep / Hoarder / Obsidian / Raindrop）的对应字段
 */

export interface ParsedBookmarkMetadata {
  title: string
  url: string
  oneLiner: string       // 一句话概括 -> 对应 Karakeep 的 description (描述)
  coreFeatures: string   // 核心功能说明 -> 对应 Karakeep 的 summary (概括)
  actionGuide: string[]  // 待办行动指南
  note: string           // 完整笔记/备忘
  tags: string[]         // 智能标签
  folder?: string        // 所属分类文件夹
  icon?: string
}

export function parseBookmarkToKarakeepPayload(bm: {
  title: string
  url: string
  summary?: string
  description?: string
  tags?: string[]
  folder?: string
  icon?: string
}): ParsedBookmarkMetadata {
  const title = (bm.title || bm.url).trim()
  const url = (bm.url || '').trim()
  const summaryText = bm.summary || ''
  const descriptionText = bm.description || ''

  let oneLiner = ''
  let coreFeatures = ''
  const actionGuide: string[] = []
  const cleanTags: string[] = []

  if (summaryText) {
    // 1. 提取 一句话概括
    const oneMatch = summaryText.match(/(?:\*\s*\*\*一句话概括\*\*[：:]|###\s*📌?\s*一句话概括[^\n]*\n+)\s*([^\n\r]+)/i)
    if (oneMatch && oneMatch[1]) {
      oneLiner = oneMatch[1].replace(/[`\*]/g, '').trim()
    }

    // 2. 提取 核心功能说明
    const featMatch = summaryText.match(/(?:###\s*📕?\s*核心功能说明[^\n]*\n+)([\s\S]*?)(?=\n+---|###|🎯|\*\s*\*\*|$)/i)
    if (featMatch && featMatch[1]) {
      coreFeatures = featMatch[1].replace(/[`\*]/g, '').trim()
    }

    // 3. 提取 待办行动指南
    const actionMatch = summaryText.match(/(?:###\s*🎯?\s*待办行动指南[^\n]*\n+)([\s\S]*?)(?=\n+---|###|$)/i)
    if (actionMatch && actionMatch[1]) {
      const lines = actionMatch[1].split('\n')
      for (const l of lines) {
        const item = l.replace(/^[\s\*\-\•]*\[\s*\]\s*/, '').trim()
        if (item) actionGuide.push(item)
      }
    }

    // 4. 提取 智能标签
    const tagMatch = summaryText.match(/\*\s*\*\*智能标签\*\*[：:]\s*(.+)/i)
    if (tagMatch && tagMatch[1]) {
      const rawTags = tagMatch[1].split(/[,，、\s]+/).map(t => t.replace(/[`\*]/g, '').trim()).filter(Boolean)
      for (const t of rawTags) {
        if (!cleanTags.includes(t)) cleanTags.push(t)
      }
    }
  }

  // 兜底与清洗
  if (!oneLiner) oneLiner = descriptionText || summaryText || title
  if (!coreFeatures) coreFeatures = descriptionText || summaryText || oneLiner

  if (bm.tags && Array.isArray(bm.tags)) {
    for (const t of bm.tags) {
      if (t && !/AI总结|Defuddle|Jina|智谱|DeepSeek|Gemini|抓取|模型/i.test(t) && !cleanTags.includes(t)) {
        cleanTags.push(t)
      }
    }
  }

  // 拼接完整笔记说明
  let note = summaryText || descriptionText || oneLiner
  if (actionGuide.length > 0) {
    note += `\n\n🎯 待办行动指南：\n` + actionGuide.map(a => `- [ ] ${a}`).join('\n')
  }

  return {
    title,
    url,
    oneLiner,
    coreFeatures,
    actionGuide,
    note,
    tags: cleanTags,
    folder: bm.folder && bm.folder !== 'all' ? bm.folder : undefined,
    icon: bm.icon
  }
}
