import { ref } from 'vue'
import { resolveUrl } from '../utils/apiClient.js'

export function useLLMToken() {
  const verifying = ref(false)
  const verified = ref(false)
  const error = ref('')
  const models = ref([])

  async function verify({ url, token }) {
    if (!url) {
      error.value = '请输入 API URL'
      return false
    }
    if (!token) {
      error.value = '请输入 API Token'
      return false
    }

    verifying.value = true
    error.value = ''

    try {
      const baseUrl = url.replace(/\/+$/, '')

      // Try to list models as verification
      const resp = await fetch(resolveUrl(`${baseUrl}/models`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (resp.ok) {
        const data = await resp.json()
        models.value = data.data || []
        verified.value = true
        return true
      }

      // Fallback: try a minimal chat completion
      const fallbackResp = await fetch(resolveUrl(`${baseUrl}/chat/completions`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      })

      if (fallbackResp.ok) {
        verified.value = true
        return true
      }

      const body = await fallbackResp.text()
      error.value = `验证失败 (${fallbackResp.status}): ${body.slice(0, 200)}`
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
