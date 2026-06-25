import { ref } from 'vue'
import { API } from '../utils/api.js'
import { resolveUrl } from '../utils/apiClient.js'

// DashScope CosyVoice TTS via HTTP API
// Correct endpoint: POST /api/v1/services/audio/tts/SpeechSynthesizer
// Ref: https://help.aliyun.com/en/model-studio/cosyvoice-tts-http-api
export function useTTS() {
  const synthesizing = ref(false)
  const error = ref('')

  // Synthesize text to audio (non-streaming, returns WAV/PCM)
  async function synthesize({
    text,
    apiKey,
    voiceId,
    model = API.COSYVOICE_TTS_MODEL,
    format = 'wav',
    sampleRate = 24000,
    languageHints = ['zh'],
  }) {
    if (!text) {
      error.value = '文本为空'
      return null
    }
    if (!apiKey) {
      error.value = '请先配置 API-Key'
      return null
    }

    synthesizing.value = true
    error.value = ''

    // Clean stage directions before TTS: remove [xxx], （xxx）, **(xxx)**
    const cleanText = cleanTtsText(text)

    try {
      const base = 'https://dashscope.aliyuncs.com'

      const body = {
        model,
        input: {
          text: cleanText,
          voice: voiceId,
          format,
          sample_rate: sampleRate,
        },
        parameters: {},
      }

      if (languageHints?.length) {
        body.input.language_hints = languageHints
      }

      const resp = await fetch(
        resolveUrl(`${base}/api/v1/services/audio/tts/SpeechSynthesizer`),
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
        const textBody = await resp.text()
        throw new Error(`TTS 请求失败 (${resp.status}): ${textBody.slice(0, 300)}`)
      }

      const contentType = resp.headers.get('content-type') || ''

      if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
        return await resp.arrayBuffer()
      }

      const data = await resp.json()

      const audioUrl = data.output?.audio_url || data.output?.audio?.url || data.url
      if (audioUrl) {
        const audioResp = await fetch(audioUrl)
        return await audioResp.arrayBuffer()
      }

      const taskId = data.output?.task_id
      if (taskId) {
        return await pollTtsTask(base, apiKey, taskId)
      }

      throw new Error(`未知的 TTS 响应格式`)
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      synthesizing.value = false
    }
  }

  return { synthesizing, error, synthesize }
}

// Clean text before sending to TTS — remove stage directions and non-speech markers.
// Handles: [停顿], [pause], （笑）, (laugh), **whisper**, etc.
function cleanTtsText(text) {
  if (!text) return text

  let cleaned = text
    // Remove Chinese square brackets: [xxx]
    .replace(/\[[^\]]*\]/g, '')
    // Remove full-width Chinese brackets: 【xxx】
    .replace(/【[^】]*】/g, '')
    // Remove full-width parentheses with content: （xxx）
    .replace(/（[^）]*）/g, '')
    // Remove half-width parentheses containing Chinese/extended chars: (xxx)
    .replace(/\([^)]*[\u4e00-\u9fff][^)]*\)/g, '')
    // Remove markdown bold/italic markers: **xxx**, *xxx*
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove action descriptions in angle brackets: <xxx>
    .replace(/<[^>]+>/g, '')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace from each line
    .split('\n').map(l => l.trim()).join('\n')
    .trim()

  // If after cleaning nothing remains, return original
  if (!cleaned) return text

  return cleaned
}

async function pollTtsTask(base, apiKey, taskId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000))

    const resp = await fetch(
      resolveUrl(`${base}/api/v1/services/audio/tts/SpeechSynthesizer`),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'cosyvoice-v3.5-plus',
          input: { action: 'query', task_id: taskId },
        }),
      }
    )

    if (!resp.ok) continue

    const data = await resp.json()
    const status = data.output?.task_status || data.output?.status

    if (status === 'SUCCEEDED') {
      const audioUrl = data.output?.audio_url || data.output?.audio?.url
      if (audioUrl) {
        const audioResp = await fetch(audioUrl)
        return await audioResp.arrayBuffer()
      }
      return null
    }
    if (status === 'FAILED') {
      throw new Error(`TTS 任务失败: ${data.output?.message || '未知错误'}`)
    }
  }
  throw new Error('TTS 任务超时')
}
