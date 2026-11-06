import assert from 'node:assert/strict'
import test from 'node:test'
import { useBailianToken } from '../src/composables/useBailianToken.js'
import { useLLMToken } from '../src/composables/useLLMToken.js'
import { useTTS } from '../src/composables/useTTS.js'
import { useVoiceClone } from '../src/composables/useVoiceClone.js'

const workspace = 'https://ws-example.cn-beijing.maas.aliyuncs.com'
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})
const assertWorkspaceUrl = (actual, path) => {
  assert.ok(actual.includes(`${workspace}${path}`), actual)
}

test('Bailian verification uses the workspace and current voice list API', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (...args) => {
    request = args
    return jsonResponse({ output: { voice_list: [] } })
  })

  assert.equal(await useBailianToken().verify('secret', workspace), true)
  assertWorkspaceUrl(request[0], '/api/v1/services/audio/tts/customization')
  assert.equal(JSON.parse(request[1].body).input.action, 'list_voice')
})

test('LLM verification calls the selected model', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (...args) => {
    request = args
    return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
  })

  const result = await useLLMToken().verify({ url: workspace, token: 'secret', model: 'qwen3.8-flash' })
  assert.equal(result, true)
  assertWorkspaceUrl(request[0], '/chat/completions')
  assert.equal(JSON.parse(request[1].body).model, 'qwen3.8-flash')
})

test('voice cloning and synthesis use the configured workspace', async (t) => {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (...args) => {
    requests.push(args)
    return requests.length === 1
      ? jsonResponse({ output: { voice_id: 'voice-id' } })
      : new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/wav' } })
  })

  await useVoiceClone().cloneFromUrl({ url: 'data:audio/wav;base64,AA==', apiKey: 'secret', baseUrl: workspace })
  await useTTS().synthesize({ text: 'test', apiKey: 'secret', voiceId: 'voice-id', baseUrl: workspace })

  assertWorkspaceUrl(requests[0][0], '/api/v1/services/audio/tts/customization')
  assertWorkspaceUrl(requests[1][0], '/api/v1/services/audio/tts/SpeechSynthesizer')
})
