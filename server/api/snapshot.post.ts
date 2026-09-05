import { defineEventHandler, readBody, createError } from 'h3'
import { validateAndNormalizeTargetUrl, checkRateLimit, getClientIp } from '../utils'

/**
 * 转换相对 URL 为绝对 URL
 */
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  if (!relativeUrl) return ''
  const trimmed = relativeUrl.trim()
  if (/^(https?:|data:|blob:|\/\/)/i.test(trimmed)) {
    if (trimmed.startsWith('//')) return 'https:' + trimmed
    return trimmed
  }
  try {
    return new URL(trimmed, baseUrl).href
  } catch {
    return trimmed
  }
}

/**
 * 为抓取的 HTML 注入 base 标签与 no-referrer 策略，并还原所有懒加载与防盗链图片
 */
function preparePixelPerfectSnapshotHtml(rawHtml: string, baseUrl: string): { fullHtml: string; coverImage: string; textSummary: string; wordCount: number } {
  let coverImage = ''

  // 1. 提取全局 og:image 或 twitter:image
  const ogImgMatch = rawHtml.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                     rawHtml.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
                     rawHtml.match(/<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
  if (ogImgMatch?.[1]) {
    coverImage = resolveUrl(ogImgMatch[1], baseUrl)
  }

  // 2. 还原 noscript 内的真实图片 (WordPress/Medium/各类博客常用)
  let processedHtml = rawHtml.replace(/<img\b([^>]*?)(?:src=["'][^"']*?(?:blank\.gif|spacer\.gif|data:image\/svg\+xml|data:image\/gif|1x1)[^"']*?["'])([^>]*?)>\s*<noscript>\s*<img\b([^>]*?)src=["']([^"']+)["']([^>]*?)>\s*<\/noscript>/gi, (match, p1, p2, n1, realSrc, n2) => {
    return `<img ${p1} src="${realSrc}" ${p2} ${n1} ${n2}>`
  })

  // 3. 还原所有主流网站懒加载图片 (微信公众号/知乎/掘金/CSDN/简书/B站等)
  processedHtml = processedHtml.replace(/<img\b([^>]+)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/\bsrc=["']([^"']*)["']/i)
    const currentSrc = srcMatch ? srcMatch[1] : ''
    const isPlaceholder = !currentSrc || /blank\.gif|spacer\.gif|data:image\/svg|data:image\/gif|1x1/i.test(currentSrc)

    const dataSrcMatch = attrs.match(/\b(?:data-src|data-original|data-actualsrc|data-lazy-src|data-origin-src|data-hi-res-src|data-zoom-src|data-url)=["']([^"']+)["']/i)
    if (dataSrcMatch && dataSrcMatch[1]) {
      const realUrl = dataSrcMatch[1].trim()
      if (!coverImage && !/icon|avatar|logo|spacer|blank\.gif|\.svg/i.test(realUrl)) {
        coverImage = resolveUrl(realUrl, baseUrl)
      }
      if (isPlaceholder || !srcMatch) {
        if (srcMatch) {
          return `<img ${attrs.replace(srcMatch[0], `src="${realUrl}"`)}>`
        } else {
          return `<img src="${realUrl}" ${attrs}>`
        }
      }
    } else if (currentSrc && !coverImage && !/icon|avatar|logo|spacer|blank\.gif|\.svg/i.test(currentSrc)) {
      coverImage = resolveUrl(currentSrc, baseUrl)
    }
    return match
  })

  // 4. 提取纯文本字数与摘要
  const pureText = processedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
  const wordCount = pureText.length
  const textSummary = pureText.slice(0, 240).trim()

  // 5. 在 head 中注入 base 标签、no-referrer 以及净化样式 (消除原网页未初始化表单与联想弹层)
  const baseTag = `<base href="${baseUrl}" target="_blank">`
  const referrerTag = `<meta name="referrer" content="no-referrer">`
  const cleanupTag = `<style data-inkgist-cleanup="true">.bk-suggest,.wgt-suggest,.search-suggest,.sug-wrapper,.suggestions,.wgt-searchbar-main_help,.wgt-searchbar-main__help,.passport-login-container,.login-mark,.login-dialog,.guide-layer,#passport-login-pop,.help-box,form input[type="text"]:not([value]):not([placeholder]):not(:focus){display:none!important;}</style>`

  if (/<head[^>]*>/i.test(processedHtml)) {
    if (/<base\b/i.test(processedHtml)) {
      processedHtml = processedHtml.replace(/<base[^>]*href=["'][^"']*["'][^>]*>/i, baseTag)
    } else {
      processedHtml = processedHtml.replace(/<head[^>]*>/i, `$&${baseTag}`)
    }
    if (/<meta\s+[^>]*name=["']referrer["'][^>]*>/i.test(processedHtml)) {
      processedHtml = processedHtml.replace(/<meta\s+[^>]*name=["']referrer["'][^>]*>/gi, referrerTag)
    } else {
      processedHtml = processedHtml.replace(/<head[^>]*>/i, `$&${referrerTag}`)
    }
    processedHtml = processedHtml.replace(/<\/head>/i, `${cleanupTag}</head>`)
  } else {
    processedHtml = `<!DOCTYPE html><html><head>${baseTag}${referrerTag}${cleanupTag}</head><body>` + processedHtml + `</body></html>`
  }

  return {
    fullHtml: processedHtml,
    coverImage,
    textSummary,
    wordCount
  }
}

export default defineEventHandler(async (event) => {
  try {
    const clientIp = getClientIp(event)
    const rateCheck = checkRateLimit(`snap_${clientIp}`, 30, 60 * 1000)
    if (!rateCheck.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `快照请求过于频繁，请在 ${Math.ceil(rateCheck.resetMs / 1000)} 秒后再试`
      })
    }

    const body = await readBody(event).catch(() => ({}))
    const { url, clientHtml, title: customTitle } = body || {}

    if (!url || typeof url !== 'string' || !url.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: '请输入有效的网页网址'
      })
    }

    const urlCheck = await validateAndNormalizeTargetUrl(url.trim())
    if (!urlCheck.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: urlCheck.error || '请输入合法的有效公网网址'
      })
    }

    const cleanUrl = urlCheck.cleanUrl
    const hostname = urlCheck.hostname

    let pageTitle = customTitle || hostname
    let description = ''
    let htmlToProcess = clientHtml || ''
    let siteName = hostname

    // 如果客户端没有直接提供 HTML，从服务端抓取完整页面
    if (!htmlToProcess || htmlToProcess.length < 100) {
      // 1. 如果是 Discourse 论坛主题帖 (如 meta.appinn.net/t/..., linux.do/t/...)，尝试获取完整 JSON 帖子流
      if (/\/t\/(?:[^\/]+\/)?\d+/.test(cleanUrl)) {
        try {
          const jsonEndpoint = cleanUrl.replace(/\/$/, '') + '.json'
          const jsonRes = await fetch(jsonEndpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
          })
          if (jsonRes.ok) {
            const topicData = await jsonRes.json()
            if (topicData?.title && Array.isArray(topicData?.post_stream?.posts) && topicData.post_stream.posts.length > 0) {
              const originUrl = new URL(cleanUrl).origin
              pageTitle = topicData.title
              description = (topicData.post_stream.posts[0]?.cooked || '').replace(/<[^>]+>/g, ' ').slice(0, 200).trim()
              
              const postsHtml = topicData.post_stream.posts.map((post: any) => {
                let avatar = post.avatar_template ? post.avatar_template.replace('{size}', '48') : ''
                if (avatar && !avatar.startsWith('http')) avatar = originUrl + avatar
                return `
                  <article style="padding: 20px 0; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px;">
                    <div style="flex-shrink: 0;">
                      <img src="${avatar}" alt="${post.username}" style="width: 44px; height: 44px; border-radius: 50%;">
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px;">
                        <strong style="color: #0f172a;">${post.name || post.username}</strong>
                        <span style="color: #64748b;">@${post.username}</span>
                        <span style="color: #94a3b8; margin-left: auto;">#${post.post_number} · ${post.created_at ? post.created_at.slice(0, 10) : ''}</span>
                      </div>
                      <div style="font-size: 15px; line-height: 1.7; color: #1e293b;">
                        ${post.cooked}
                      </div>
                    </div>
                  </article>
                `
              }).join('\n')

              htmlToProcess = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <base href="${originUrl}" target="_blank">
  <title>${pageTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px 20px; color: #0f172a; background: #fff; }
    h1.topic-title { font-size: 24px; font-weight: 700; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0f172a; line-height: 1.4; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
    blockquote { margin: 12px 0; padding: 8px 16px; border-left: 4px solid #cbd5e1; background: #f8fafc; color: #475569; }
    pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
    code { font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    pre code { background: transparent; padding: 0; color: inherit; }
  </style>
</head>
<body>
  <h1 class="topic-title">${pageTitle}</h1>
  <div class="posts-list">
    ${postsHtml}
  </div>
</body>
</html>`
            }
          }
        } catch {
          // ignore error and proceed to standard fetch
        }
      }

      // 2. 标准网页抓取 (带严格的 10MB 最大响应体积与超时截断保护)
      if (!htmlToProcess) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const MAX_BYTES = 10 * 1024 * 1024 // 10MB 最大抓取上限

        try {
          const response = await fetch(cleanUrl, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
              'Upgrade-Insecure-Requests': '1'
            }
          })
          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          // 1. 检查响应头 Content-Length
          const contentLength = Number(response.headers.get('content-length'))
          if (contentLength && contentLength > MAX_BYTES) {
            throw new Error('目标网页体积超过 10MB 上限，建议使用「一键快照小书签」在浏览器端提取')
          }

          // 2. 流式读取并限制最大体积 (防范未声明 Content-Length 的恶意大流)
          if (response.body && typeof response.body.getReader === 'function') {
            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8', { fatal: false })
            let receivedBytes = 0
            let chunks = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              receivedBytes += value.byteLength
              if (receivedBytes > MAX_BYTES) {
                reader.cancel()
                throw new Error('网页数据传输已超过 10MB 安全上限，已自动截断')
              }
              chunks += decoder.decode(value, { stream: true })
            }
            chunks += decoder.decode()
            htmlToProcess = chunks
          } else {
            htmlToProcess = await response.text()
            if (htmlToProcess.length > MAX_BYTES) {
              throw new Error('网页内容超过 10MB 安全上限')
            }
          }
        } catch (err: any) {
          clearTimeout(timeoutId)
          throw createError({
            statusCode: 400,
            statusMessage: `抓取网页内容失败: ${err?.message || '无法连接该网址，建议使用「一键快照小书签」直接在浏览器端保存'}`
          })
        }
      }
    }

    // 提取标题与站点信息
    const ogTitleMatch = htmlToProcess.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         htmlToProcess.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
                         htmlToProcess.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (ogTitleMatch?.[1]) {
      pageTitle = ogTitleMatch[1].replace(/&[a-z0-9#]+;/gi, ' ').trim()
    }

    const ogDescMatch = htmlToProcess.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        htmlToProcess.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (ogDescMatch?.[1]) {
      description = ogDescMatch[1].replace(/&[a-z0-9#]+;/gi, ' ').trim()
    }

    const siteNameMatch = htmlToProcess.match(/<meta\s+[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
    if (siteNameMatch?.[1]) {
      siteName = siteNameMatch[1].trim()
    }

    // 处理并保留原汁原味的完整 HTML
    const prepared = preparePixelPerfectSnapshotHtml(htmlToProcess, cleanUrl)

    const snapshotId = 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
    const finalDescription = description || prepared.textSummary || pageTitle

    return {
      success: true,
      snapshot: {
        id: snapshotId,
        url: cleanUrl,
        title: pageTitle,
        description: finalDescription,
        siteName: siteName || hostname,
        coverImage: prepared.coverImage || '',
        contentHtml: prepared.fullHtml,
        wordCount: prepared.wordCount,
        createdAt: new Date().toISOString()
      }
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || '保存网页快照失败'
    })
  }
})
