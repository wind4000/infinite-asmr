import { ref } from 'vue'
import { API } from '../utils/api.js'
import { resolveUrl } from '../utils/apiClient.js'

// DashScope CosyVoice voice cloning via HTTP API
// Correct endpoint: POST /api/v1/services/audio/tts/customization
// Ref: https://help.aliyun.com/en/model-studio/voice-clone-design-http-api
//
// Two modes for creating a voice:
//   a) Audio-based cloning: provide `url` (public HTTP URL to audio file)
//   b) Text-based voice design: provide `voice_prompt` + `preview_text`
export function useVoiceClone() {
  const cloning = ref(false)
  const progress = ref('')
  const voiceId = ref('')
  const error = ref('')

  // Clone voice from a public audio URL
  async function cloneFromUrl({ url, apiKey, prefix, languageHints = ['zh'], targetModel }) {
    if (!url) {
      error.value = '请提供音频 URL'
      return null
    }
    if (!apiKey) {
      error.value = '请先配置百炼 API-Key'
      return null
    }

    cloning.value = true
    error.value = ''
    progress.value = '正在提交音色克隆...'

    try {
      const base = API.COSYVOICE_DOMESTIC
      const voicePrefix = (prefix || `asmr${Date.now().toString(36).slice(-6)}`).slice(0, 10)

      const body = {
        model: 'voice-enrollment',
        input: {
          action: 'create_voice',
          target_model: targetModel || API.COSYVOICE_CLONE_MODEL,
          prefix: voicePrefix,
          url,
          language_hints: languageHints,
        },
      }

      const resp = await fetch(
        resolveUrl(`${base}/api/v1/services/audio/tts/customization`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      if (!resp.ok) {
        const errBody = await resp.text()
        throw new Error(`音色克隆请求失败 (${resp.status}): ${errBody.slice(0, 300)}`)
      }

      const data = await resp.json()

      const resultVoiceId =
        data.output?.voice_id ||
        data.output?.voice ||
        data.voice_id

      if (!resultVoiceId) {
        const taskId = data.output?.task_id
        if (taskId) {
          progress.value = '音色处理中，请稍候...'
          return await pollTask(base, apiKey, taskId)
        }
        throw new Error(`音色克隆响应异常: ${JSON.stringify(data).slice(0, 300)}`)
      }

      voiceId.value = resultVoiceId
      progress.value = '音色克隆完成!'
      return resultVoiceId

    } catch (e) {
      error.value = e.message
      return null
    } finally {
      cloning.value = false
    }
  }

  // Create voice from text description (no audio needed)
  async function createFromDescription({
    voicePrompt,
    previewText,
    apiKey,
    prefix,
    targetModel,
  }) {
    if (!voicePrompt || !previewText) {
      error.value = '请填写音色描述和试听文本'
      return null
    }
    if (!apiKey) {
      error.value = '请先配置百炼 API-Key'
      return null
    }

    cloning.value = true
    error.value = ''
    progress.value = '正在创建音色...'

    try {
      const base = API.COSYVOICE_DOMESTIC
      const voicePrefix = (prefix || `asmr${Date.now().toString(36).slice(-6)}`).slice(0, 10)

      const body = {
        model: 'voice-enrollment',
        input: {
          action: 'create_voice',
          target_model: targetModel || API.COSYVOICE_CLONE_MODEL,
          prefix: voicePrefix,
          voice_prompt: voicePrompt,
          preview_text: previewText,
        },
      }

      const resp = await fetch(
        resolveUrl(`${base}/api/v1/services/audio/tts/customization`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      if (!resp.ok) {
        const errBody = await resp.text()
        throw new Error(`音色创建失败 (${resp.status}): ${errBody.slice(0, 300)}`)
      }

      const data = await resp.json()

      const resultVoiceId =
        data.output?.voice_id ||
        data.output?.voice ||
        data.voice_id

      if (!resultVoiceId) {
        const taskId = data.output?.task_id
        if (taskId) {
          progress.value = '音色生成中，请稍候...'
          return await pollTask(base, apiKey, taskId)
        }
        throw new Error(`音色创建响应异常: ${JSON.stringify(data).slice(0, 300)}`)
      }

      voiceId.value = resultVoiceId
      progress.value = '音色创建完成!'
      return resultVoiceId

    } catch (e) {
      error.value = e.message
      return null
    } finally {
      cloning.value = false
    }
  }

  return { cloning, progress, voiceId, error, cloneFromUrl, createFromDescription }
}

// Poll async task until complete
async function pollTask(base, apiKey, taskId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000))

    const resp = await fetch(
      resolveUrl(`${base}/api/v1/services/audio/tts/customization`),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'voice-enrollment',
          input: {
            action: 'query_voice',
            task_id: taskId,
          },
        }),
      }
    )

    if (!resp.ok) continue

    const data = await resp.json()
    const status = data.output?.task_status || data.output?.status
    const vid = data.output?.voice_id || data.output?.voice

    if (vid && (!status || status === 'SUCCEEDED')) {
      return vid
    }
    if (status === 'FAILED') {
      throw new Error(`音色任务失败: ${data.output?.message || '未知错误'}`)
    }
  }
  throw new Error('音色任务超时，请重试')
}
