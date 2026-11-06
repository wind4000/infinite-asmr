import { ref } from 'vue'
import { API } from '../utils/api.js'
import { resolveUrl } from '../utils/apiClient.js'

export function useBailianToken() {
  const token = ref('')
  const verifying = ref(false)
  const verified = ref(false)
  const error = ref('')
  const models = ref([])

  async function verify(newToken, baseUrl = API.COSYVOICE_DOMESTIC) {
    token.value = newToken
    if (!newToken) {
      error.value = '请输入 API-Key'
      return false
    }
    if (!baseUrl) {
      error.value = '请输入百炼 Base URL'
      return false
    }

    verifying.value = true
    error.value = ''

    try {
      const base = baseUrl.replace(/\/+$/, '')
      const resp = await fetch(resolveUrl(`${base}/api/v1/services/audio/tts/customization`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'voice-enrollment',
          input: { action: 'list_voice', page_size: 1, page_index: 0 },
        }),
      })

      if (!resp.ok) {
        const body = await resp.text()
        error.value = `验证失败 (${resp.status}): ${body.slice(0, 200)}`
        verified.value = false
        return false
      }

      await resp.json()
      verified.value = true
      error.value = ''
      return true
    } catch (e) {
      error.value = `网络错误: ${e.message}`
      verified.value = false
      return false
    } finally {
      verifying.value = false
    }
  }

  return { token, verifying, verified, error, models, verify }
}
