import { ref } from 'vue'
import { API, getDashScopeBase } from '../utils/api.js'
import { resolveUrl } from '../utils/apiClient.js'

export function useBailianToken() {
  const token = ref('')
  const verifying = ref(false)
  const verified = ref(false)
  const error = ref('')
  const models = ref([])

  async function verify(newToken) {
    token.value = newToken
    if (!newToken) {
      error.value = '请输入 API-Key'
      return false
    }

    verifying.value = true
    error.value = ''

    try {
      const base = getDashScopeBase(newToken)
      const resp = await fetch(resolveUrl(`${base}/models`), {
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!resp.ok) {
        const body = await resp.text()
        error.value = `验证失败 (${resp.status}): ${body.slice(0, 200)}`
        verified.value = false
        return false
      }

      const data = await resp.json()
      models.value = data.data || []
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
