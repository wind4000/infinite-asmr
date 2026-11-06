import { ref } from 'vue'
import { getChatRequestExtras } from '../utils/api.js'
import { resolveUrl } from '../utils/apiClient.js'

export function useLLMToken() {
  const verifying = ref(false)
  const verified = ref(false)
  const error = ref('')
  const models = ref([])

  async function verify({ url, token, model }) {
    if (!url) {
      error.value = '请输入 API URL'
      return false
    }
    if (!token) {
      error.value = '请输入 API Token'
      return false
    }
    if (!model) {
      error.value = '请输入模型名称'
      return false
    }

    verifying.value = true
    error.value = ''

    try {
      const baseUrl = url.replace(/\/+$/, '')
      const resp = await fetch(resolveUrl(`${baseUrl}/chat/completions`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 16,
          ...getChatRequestExtras(url),
        }),
      })

      if (resp.ok) {
        const data = await resp.json()
        if (data.choices?.[0]?.message?.content?.trim()) {
          verified.value = true
          return true
        }
        error.value = '验证失败: 模型返回空正文'
        verified.value = false
        return false
      }

      const body = await resp.text()
      error.value = `验证失败 (${resp.status}): ${body.slice(0, 200)}`
      verified.value = false
      return false
    } catch (e) {
      error.value = `网络错误: ${e.message}`
      verified.value = false
      return false
    } finally {
      verifying.value = false
    }
  }

  return { verifying, verified, error, models, verify }
}
