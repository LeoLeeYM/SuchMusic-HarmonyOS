/**
 * 讯飞星辰 MaaS（星火）OpenAI 兼容 Chat 接口
 *
 * 端到端在 WebView 内运行：Android 上走 CapacitorHttp 原生网络栈，
 * 绕开浏览器 CORS 限制（星火 MaaS 不返回 Access-Control-Allow-Origin）。
 *
 * 文档：https://maas.xfyun.cn/doc/guide/3、API 接口/3.1 星火模型 API/3.1.1 Chat.html
 */
import { Capacitor } from '@capacitor/core'

/** MaaS 服务地址（X2.5 系列使用 v2） */
const SPARK_BASE = 'https://maas-api.cn-huabei-1.xf-yun.com/v2'
/** 可选本机开发配置；不得在共享源码中硬编码服务凭证。 */
const SPARK_API_KEY = (import.meta.env.VITE_SPARK_API_KEY || '').trim()
/** 使用的模型 id */
export const SPARK_MODEL = 'spark-x2.5-1.7b'

export interface SparkMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface SparkChatOptions {
  temperature?: number
  maxTokens?: number
  /** 关闭思考（星火推理模型参数） */
  disableThinking?: boolean
  timeoutMs?: number
}

function buildBody(messages: SparkMessage[], options: SparkChatOptions): Record<string, unknown> {
  return {
    model: SPARK_MODEL,
    messages,
    stream: false,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 2048,
    ...(options.disableThinking === false ? {} : { thinking: { type: 'disabled' } })
  }
}

interface SparkResponse {
  choices?: Array<{
    message?: { content?: string | null; reasoning_content?: string | null }
    finish_reason?: string
  }>
  code?: number
  message?: string
  error?: { message?: string }
}

/** 调用 Chat Completions，返回 assistant 文本 */
export async function sparkChat(
  messages: SparkMessage[],
  options: SparkChatOptions = {}
): Promise<string> {
  if (!SPARK_API_KEY) {
    throw new Error('尚未配置 AI 翻译服务，请配置本机 VITE_SPARK_API_KEY 后重新构建')
  }
  const body = buildBody(messages, options)
  const timeoutMs = options.timeoutMs ?? 90000
  const url = `${SPARK_BASE}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SPARK_API_KEY}`
  }

  let text = ''
  if (Capacitor.isNativePlatform()) {
    const { CapacitorHttp } = await import('@capacitor/core')
    const res = await CapacitorHttp.request({
      url,
      method: 'POST',
      headers,
      data: JSON.stringify(body),
      responseType: 'text',
      connectTimeout: 30000,
      readTimeout: timeoutMs
    })
    text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '')
    if (res.status < 200 || res.status >= 300) {
      throw new Error(parseError(text) || `星火接口请求失败：HTTP ${res.status}`)
    }
  } else {
    // Web 调试环境：直连会被 CORS 拦截，仅作兜底
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(new Error('请求超时')), timeoutMs)
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ac.signal
      })
      text = await resp.text()
      if (!resp.ok) throw new Error(parseError(text) || `星火接口请求失败：HTTP ${resp.status}`)
    } finally {
      clearTimeout(timer)
    }
  }

  let data: SparkResponse
  try {
    data = JSON.parse(text) as SparkResponse
  } catch {
    throw new Error('星火接口返回了无法解析的内容')
  }

  const content = data.choices?.[0]?.message?.content
  if (typeof content === 'string' && content.trim()) return content
  const err = data.error?.message || data.message || parseError(text)
  throw new Error(err || '星火接口未返回内容')
}

function parseError(text: string): string {
  try {
    const data = JSON.parse(text) as SparkResponse
    return data.error?.message || data.message || ''
  } catch {
    return text.slice(0, 200)
  }
}
