/**
 * 墨萃 (InkGist) 标准 Netscape HTML 书签导出与多级栈式解析通用模块
 */

export interface BookmarkItem {
  id?: string
  title: string
  url: string
  icon?: string
  summary?: string
  description?: string
  tags?: string[]
  folder?: string
  createdAt?: string
}

export interface FolderTreeNode {
  name: string
  bookmarks: BookmarkItem[]
  children: Map<string, FolderTreeNode>
}

/**
 * 安全 HTML 特殊字符转义
 */
export function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 将各类日期字符串解析为秒级 Unix 时间戳
 */
export function parseUnixTimestamp(dateStr?: string): number {
  if (!dateStr) return Math.floor(Date.now() / 1000)
  // 支持 2026/08/20 或 2026-08-20 或 ISO 格式
  const normalized = dateStr.includes('/') ? dateStr.replace(/\//g, '-') : dateStr
  const parsed = Date.parse(normalized)
  return isNaN(parsed) ? Math.floor(Date.now() / 1000) : Math.floor(parsed / 1000)
}

/**
 * 将扁平的书签列表构建为多级树状结构并生成符合 Netscape Bookmark 规范的 HTML 字符串
 */
export function generateNetscapeBookmarkHtml(bookmarks: BookmarkItem[], title = '墨萃书签导出'): string {
  const rootNode: FolderTreeNode = { name: '', bookmarks: [], children: new Map() }

  // 1. 构建多级目录树 (支持 '技术/前端/Vue' 或单层 '前端开发')
  for (const bm of bookmarks) {
    const rawFolder = (bm.folder || '').trim()
    if (!rawFolder || rawFolder === 'all' || rawFolder === 'none') {
      rootNode.bookmarks.push(bm)
      continue
    }

    const segments = rawFolder.split('/').map(s => s.trim()).filter(Boolean)
    let current = rootNode
    for (const seg of segments) {
      if (!current.children.has(seg)) {
        current.children.set(seg, { name: seg, bookmarks: [], children: new Map() })
      }
      current = current.children.get(seg)!
    }
    current.bookmarks.push(bm)
  }

  // 2. 递归生成 DL / DT / H3 / A / DD 节点
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n`
  html += `<!-- This is an automatically generated file from InkGist. -->\n`
  html += `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n`
  html += `<TITLE>InkGist Bookmarks</TITLE>\n`
  html += `<H1>${escapeHtml(title)}</H1>\n`
  html += `<DL><p>\n`

  function renderTree(node: FolderTreeNode, depth: number) {
    const indent = '    '.repeat(depth)

    // 渲染当前节点下的书签
    for (const b of node.bookmarks) {
      const bTitle = escapeHtml(b.title || b.url)
      const bUrl = escapeHtml(b.url)
      const addDate = parseUnixTimestamp(b.createdAt)
      const iconAttr = b.icon && b.icon !== 'bookmark' && /^https?:\/\//i.test(b.icon) ? ` ICON="${escapeHtml(b.icon)}"` : ''
      const tagsAttr = b.tags && b.tags.length ? ` TAGS="${escapeHtml(b.tags.join(','))}"` : ''
      const summaryText = escapeHtml((b.summary || b.description || '').replace(/\r?\n/g, ' ').trim())

      html += `${indent}<DT><A HREF="${bUrl}" ADD_DATE="${addDate}"${iconAttr}${tagsAttr}>${bTitle}</A>\n`
      if (summaryText) {
        html += `${indent}<DD>${summaryText}</DD>\n`
      }
    }

    // 递归渲染子文件夹
    for (const [childName, childNode] of node.children.entries()) {
      const nowUnix = Math.floor(Date.now() / 1000)
      html += `${indent}<DT><H3 ADD_DATE="${nowUnix}" LAST_MODIFIED="${nowUnix}">${escapeHtml(childName)}</H3>\n`
      html += `${indent}<DL><p>\n`
      renderTree(childNode, depth + 1)
      html += `${indent}</DL><p>\n`
    }
  }

  renderTree(rootNode, 1)
  html += `</DL><p>\n`
  return html
}

/**
 * 清洗文件夹名称：过滤浏览器默认根目录 (例如 "书签栏/技术开发" -> "技术开发", "Bookmarks bar/Vue" -> "Vue")
 */
export function cleanFolderName(raw: string): string {
  if (!raw) return ''
  const segments = raw.split('/').map(s => s.trim()).filter(Boolean)
  const filtered = segments.filter(s => !/^(书签栏|收藏夹栏|Bookmarks\s*bar|Bookmarks\s*menu|Bookmarks\s*toolbar|Favorites\s*bar|Other\s*bookmarks|其他书签|移动设备书签)$/i.test(s))
  return filtered.join('/') || (segments.length > 0 ? segments[segments.length - 1] : '')
}

/**
 * 纯正则与流式状态机解析 HTML 书签字符串（兼顾 Node.js 测试环境与跨平台）
 */
export function parseBookmarkHtmlNode(html: string): Array<{ url: string; title: string; folder?: string; tags?: string[]; icon?: string; summary?: string }> {
  const results: Array<{ url: string; title: string; folder?: string; tags?: string[]; icon?: string; summary?: string }> = []
  const seenUrls = new Set<string>()

  // 维护目录栈
  const folderStack: string[] = []

  // Token 级别扫描 (支持单行或跨行 HTML)
  const tokenRegex = /<H3[^>]*>([\s\S]*?)<\/H3>|<A\s+([^>]+)>([\s\S]*?)<\/A>|<DL>|<\/DL>|<DD>([\s\S]*?)(?:<\/DD>|$)/gi
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(html)) !== null) {
    const fullMatch = match[0]

    // 1. H3 文件夹开启
    if (/^<H3/i.test(fullMatch) && match[1] !== undefined) {
      const rawName = match[1].replace(/<[^>]+>/g, '').trim()
      if (rawName) {
        folderStack.push(rawName)
      }
    }
    // 2. DL 结束
    else if (/^<\/DL/i.test(fullMatch)) {
      if (folderStack.length > 0) {
        folderStack.pop()
      }
    }
    // 3. A 链接
    else if (/^<A/i.test(fullMatch) && match[2] !== undefined) {
      const attrsStr = match[2]
      const title = (match[3] || '').replace(/<[^>]+>/g, '').trim()

      const hrefMatch = attrsStr.match(/HREF="([^"]+)"/i) || attrsStr.match(/HREF='([^']+)'/i)
      const href = hrefMatch ? hrefMatch[1].trim() : ''

      if (href && /^https?:\/\//i.test(href) && !seenUrls.has(href)) {
        seenUrls.add(href)

        const iconMatch = attrsStr.match(/ICON="([^"]+)"/i)
        const icon = iconMatch ? iconMatch[1] : undefined

        const tagsMatch = attrsStr.match(/TAGS="([^"]+)"/i)
        const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean) : undefined

        const rawFolder = folderStack.join('/')
        const folder = cleanFolderName(rawFolder) || undefined

        results.push({
          url: href,
          title: title || href,
          folder,
          tags,
          icon
        })
      }
    }
    // 4. DD 描述/摘要
    else if (/^<DD/i.test(fullMatch) && match[4] !== undefined && results.length > 0) {
      const last = results[results.length - 1]
      if (!last.summary) {
        last.summary = match[4].replace(/<[^>]+>/g, '').trim()
      }
    }
  }

  return results
}

/**
 * 浏览器端与通用环境 HTML 书签深度解析器
 */
export function parseBookmarkHtml(html: string): Array<{ url: string; title: string; folder?: string; tags?: string[]; icon?: string; summary?: string }> {
  // 1. 优先使用状态机引擎
  const list = parseBookmarkHtmlNode(html)
  if (list.length > 0) return list

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const results: Array<{ url: string; title: string; folder?: string; tags?: string[]; icon?: string; summary?: string }> = []
      const seenUrls = new Set<string>()

      const allLinks = Array.from(doc.querySelectorAll('a, A'))
      for (const aEl of allLinks) {
        const href = aEl.getAttribute('href')?.trim()
        if (!href || !/^https?:\/\//i.test(href) || seenUrls.has(href)) continue
        seenUrls.add(href)

        const title = aEl.textContent?.trim() || href
        const icon = aEl.getAttribute('icon') || undefined
        const tagsStr = aEl.getAttribute('tags')
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : undefined

        const folderSegments: string[] = []
        let curr: Element | null = aEl
        while (curr && curr !== doc.body) {
          if (curr.tagName.toUpperCase() === 'DL') {
            let prev = curr.previousElementSibling
            while (prev) {
              if (prev.tagName.toUpperCase() === 'DT') {
                const h3 = prev.querySelector('h3, H3')
                if (h3 && h3.textContent?.trim()) {
                  folderSegments.unshift(h3.textContent.trim())
                  break
                }
              }
              prev = prev.previousElementSibling
            }
            if (!prev && curr.parentElement && curr.parentElement.tagName.toUpperCase() === 'DT') {
              const h3 = curr.parentElement.querySelector(':scope > h3, :scope > H3')
              if (h3 && h3.textContent?.trim()) {
                folderSegments.unshift(h3.textContent.trim())
              }
            }
          }
          curr = curr.parentElement
        }

        const rawFolder = folderSegments.join('/')
        const folder = cleanFolderName(rawFolder) || undefined

        results.push({ url: href, title, folder, tags, icon })
      }

      if (results.length > 0) return results
    } catch {}
  }

  return list
}

/**
 * 触发浏览器端下载书签文件
 */
export function downloadBookmarksAsHtml(bookmarks: BookmarkItem[], filename = 'InkGist_Bookmarks.html') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const content = generateNetscapeBookmarkHtml(bookmarks)
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
