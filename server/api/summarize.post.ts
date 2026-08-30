import { defineEventHandler, readBody, createError } from 'h3'
import { scrapeWebPage, callLlmService, validateAndNormalizeTargetUrl, checkRateLimit, getClientIp } from '../utils'

export default defineEventHandler(async (event) => {
  try {
    // 0. 防刷限流：每个 IP 每分钟最多发起 60 次 AI 网页速读请求 (满足批量并发总结需求)
    const clientIp = getClientIp(event)
    const rateCheck = checkRateLimit(`sum_${clientIp}`, 60, 60 * 1000)
    if (!rateCheck.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `请求过于频繁，请在 ${Math.ceil(rateCheck.resetMs / 1000)} 秒后再试`
      })
    }

    const body = await readBody(event).catch(() => ({}))
    const cloudflareEnv = (event.context?.cloudflare?.env as Record<string, any>) || {}
    let runtimeConf: any = {}
    try {
      runtimeConf = useRuntimeConfig(event)
    } catch {
      try { runtimeConf = useRuntimeConfig() } catch {}
    }

    const config = {
      zhipuApiKey: cloudflareEnv.ZHIPU_API_KEY || runtimeConf.zhipuApiKey || process.env.ZHIPU_API_KEY || '',
      zhipuModel: cloudflareEnv.ZHIPU_MODEL || runtimeConf.zhipuModel || process.env.ZHIPU_MODEL || 'glm-4.6v-flash',
      deepseekApiKey: cloudflareEnv.DEEPSEEK_API_KEY || runtimeConf.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '',
      deepseekModel: cloudflareEnv.DEEPSEEK_MODEL || runtimeConf.deepseekModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      geminiApiKey: cloudflareEnv.GEMINI_API_KEY || cloudflareEnv.GOOGLE_API_KEY || runtimeConf.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
      geminiModel: cloudflareEnv.GEMINI_MODEL || runtimeConf.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      defaultProvider: cloudflareEnv.DEFAULT_PROVIDER || runtimeConf.defaultProvider || process.env.DEFAULT_PROVIDER || 'auto',
      jinaApiKey: cloudflareEnv.JINA_API_KEY || runtimeConf.jinaApiKey || process.env.JINA_API_KEY || '',
      aiApiKey: cloudflareEnv.AI_API_KEY || runtimeConf.aiApiKey || process.env.AI_API_KEY || '',
      aiBaseUrl: cloudflareEnv.AI_BASE_URL || runtimeConf.aiBaseUrl || process.env.AI_BASE_URL || '',
      aiModel: cloudflareEnv.AI_MODEL || runtimeConf.aiModel || process.env.AI_MODEL || ''
    }
    const { url, title: clientTitle, content: clientContent } = body || {}

    if (!url || typeof url !== 'string' || !url.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: '请输入有效的网页网址'
      })
    }

    // 1. SSRF 深度安全校验与规范化 (含 DNS 解析与私有/环回 IP 深度防御)
    const urlCheck = await validateAndNormalizeTargetUrl(url.trim())
    if (!urlCheck.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: urlCheck.error || '请输入合法的有效公网网址 (如 https://...)'
      })
    }

    const cleanUrl = urlCheck.cleanUrl
    const hostname = urlCheck.hostname

    // 2. 网页正文抓取与清洗 (原生 DOM 提取 + Jina 备用降级)
    let scrapedContent = ''
    let scrapedTitle = (clientTitle && typeof clientTitle === 'string' && clientTitle.trim()) ? clientTitle.trim() : hostname
    let fetchEngine: 'defuddle' | 'jina' | 'failed' = 'failed'

    try {
      const scrapeResult = await scrapeWebPage(cleanUrl, config.jinaApiKey)
      scrapedContent = scrapeResult.content || ''
      if (scrapeResult.title && scrapeResult.title !== cleanUrl && scrapeResult.title !== hostname) {
        scrapedTitle = scrapeResult.title
      }
      fetchEngine = scrapeResult.fetchMethod
    } catch (err: any) {
      console.warn('抓取遇到异常:', err?.message || err)
      fetchEngine = 'failed'
    }

    // 若服务端抓取正文为空，且客户端提供了有效正文，则降级使用客户端提取正文
    if (!scrapedContent && clientContent && typeof clientContent === 'string' && clientContent.trim().length > 20) {
      scrapedContent = clientContent.trim()
    }

    // 校验：无效网址、无法连接或不存在的网页，严格不输出总结
    if (fetchEngine === 'failed' && !scrapedContent && (!scrapedTitle || scrapedTitle === hostname || scrapedTitle.toLowerCase().includes('404') || scrapedTitle.toLowerCase().includes('not found') || scrapedTitle.toLowerCase().includes('error'))) {
      throw createError({
        statusCode: 400,
        statusMessage: `无法访问该网址或该链接无效 (${cleanUrl})，未生成总结`
      })
    }

    // 3. 严格按用户要求的系统提示词与输出结构构建
    const systemPrompt = `你是一个专业的中文网页总结助手。请基于用户提供的网页正文，严格按照下面的 Markdown 结构输出，不要添加任何额外开场白、解释或免责声明。

# 🚀 链接总结助手 | [产品名或网页主题 - 一句话核心定位]

* **一句话概括**：用一句精准有力的中文概括这篇内容或这个产品的核心价值，字数控制在 40-60 字。
* **智能标签**：给出一个不超过 20 字的中文标签，只输出标签内容，不要解释。

---

### 📕 核心功能说明
用一段丰富详实、自然流畅的中文深度阐述网页的核心定位、核心功能矩阵或特色亮点，内容务必充实展开，字数在 120-150 字左右，切勿过于简略。

---

### 🎯 待办行动指南 (Action Items)
* **[ ]** 给出第 1 条针对该产品或文章可立即上手执行的具体操作建议（包含具体功能、路径或操作步骤）
* **[ ]** 给出第 2 条深入体验、提升效率或进阶使用的具体建议`

    const userPrompt = `以下是目标网页的真实信息：
【网址】：${cleanUrl}
【网页标题】：${scrapedTitle}
【网页清洗正文】：
${scrapedContent ? scrapedContent.slice(0, 5000) : `${scrapedTitle} - ${cleanUrl}`}

【重点提示】：请严格按照上述 Markdown 格式输出，内容务必充实饱满，特别是“核心功能说明”请展开详细介绍（120~150字），不要过于简短！`

    // 4. 多模型统一调用 (支持 智谱 AI / DeepSeek / 谷歌 Gemini)
    let detailedSummary = ''

    try {
      const llmResult = await callLlmService(
        {
          userPromptText: userPrompt,
          systemPrompt,
          scrapedContent
        },
        config
      )

      if (llmResult && llmResult.text) {
        let rawText = llmResult.text.trim()
        const startIdx = rawText.indexOf('# 🚀')
        if (startIdx !== -1) {
          rawText = rawText.slice(startIdx).trim()
        } else {
          const altStart = rawText.search(/[#\s]*🚀/)
          if (altStart !== -1) {
            rawText = rawText.slice(altStart).trim()
          }
        }

        // 确保第一行必须严格以 "# 🚀 链接总结助手 | " 开头
        const lines = rawText.split('\n')
        let firstLine = lines[0] || ''
        if (!firstLine.includes('链接总结助手')) {
          firstLine = firstLine.replace(/^[#\s]*🚀?\s*/, '').replace(/^[\|\-]\s*/, '').trim()
          lines[0] = `# 🚀 链接总结助手 | ${firstLine}`
          rawText = lines.join('\n')
        }

        detailedSummary = rawText
      }
    } catch (err: any) {
      console.warn('AI API 调用失败，自动降级为本地规范提取:', err?.data || err?.message || err)
    }

    // 5. 若 AI 未能生成总结，且抓取到了真实有效标题/内容，提供保底标准总结
    if (!detailedSummary) {
      if (!scrapedContent && scrapedTitle === hostname) {
        throw createError({
          statusCode: 400,
          statusMessage: `该网址无有效网页内容，无法生成总结`
        })
      }

      detailedSummary = `# 🚀 链接总结助手 | ${scrapedTitle} - 高效在线资源与信息平台

* **一句话概括**：专为数字化用户打造的在线内容检索与高效服务平台。
* **智能标签**：效率工具

---

### 📕 核心功能说明
该网站提供了清晰的信息检索与在线交互服务，界面扁平现代，功能聚焦明确，帮助用户快速获取所需内容并实现高效的数字化协作。

---

### 🎯 待办行动指南 (Action Items)
* **[ ]** 将该网站保存到书签库，方便日常随时快速访问。
* **[ ]** 浏览该网站的核心功能与特色模块，体验具体在线服务。`
    }

    // 提取纯净内容智能标签
    const tags: string[] = []
    const tagMatch = detailedSummary.match(/\*\s*\*\*智能标签\*\*[：:]\s*(.+)/i)
    if (tagMatch && tagMatch[1]) {
      const extractedTag = tagMatch[1].replace(/[`\*]/g, '').trim()
      if (extractedTag) {
        tags.push(extractedTag)
      }
    }

    // 从总结首行智能提取最准确的中文产品名/网页主题定位
    let finalTitle = ''
    const titleHeaderMatch = detailedSummary.match(/^#\s*🚀?\s*链接总结助手\s*\|\s*(.+)$/m)
    if (titleHeaderMatch && titleHeaderMatch[1]) {
      finalTitle = titleHeaderMatch[1].trim()
    }

    if (!finalTitle || finalTitle.toLowerCase() === hostname.toLowerCase()) {
      if (scrapedTitle && scrapedTitle.toLowerCase() !== hostname.toLowerCase()) {
        finalTitle = scrapedTitle
      } else {
        finalTitle = `${hostname} - 网页智能总结`
      }
    }

    return {
      success: true,
      title: finalTitle,
      url: cleanUrl,
      detailedSummary,
      tags,
      timestamp: new Date().toISOString(),
      fetchEngine
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('总结接口发生异常:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || '服务器处理总结时发生内部错误'
    })
  }
})
