// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  future: {
    compatibilityVersion: 3
  },
  nitro: {
    preset: process.env.NITRO_PRESET || 'cloudflare_module'
  },
  srcDir: 'app',
  runtimeConfig: {
    // 智谱 AI
    zhipuApiKey: process.env.ZHIPU_API_KEY || '',
    zhipuModel: process.env.ZHIPU_MODEL || 'glm-4.6v-flash',

    // DeepSeek
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',

    // 谷歌 Gemini
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

    // 首选提供商 (auto / zhipu / deepseek / gemini)
    defaultProvider: process.env.DEFAULT_PROVIDER || 'auto',

    // 抓取模型
    jinaApiKey: process.env.JINA_API_KEY || '',

    // Karakeep (Hoarder) 同步
    karakeepInstanceUrl: process.env.KARAKEEP_INSTANCE_URL || 'https://cloud.karakeep.app',
    karakeepApiKey: process.env.KARAKEEP_API_KEY || '',

    // 通用兼容
    aiApiKey: process.env.AI_API_KEY || '',
    aiBaseUrl: process.env.AI_BASE_URL || '',
    aiModel: process.env.AI_MODEL || '',

    public: {
      appTitle: '墨萃 InkGist'
    }
  },
  app: {
    head: {
      title: '墨萃 InkGist - AI 网页智能速读与书签管理',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '墨萃 InkGist - 基于大模型的扁平化水墨风网页智能速读与书签管理工具' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    },
    pageTransition: false,
    layoutTransition: false
  }
})
