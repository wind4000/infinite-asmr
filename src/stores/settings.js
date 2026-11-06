import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'infinite-asmr-settings'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadFromStorage()

  // Step 1: Bailian Token
  const bailianToken = ref(saved.bailianToken || '')
  const bailianBaseUrl = ref(saved.bailianBaseUrl || 'https://dashscope.aliyuncs.com')
  const bailianVerified = ref(saved.bailianVerified || false)

  // Step 2: Voice management
  const savedVoices = ref(saved.savedVoices || [])
  const voiceId = ref(saved.voiceId || '')
  const voiceName = ref(saved.voiceName || '')

  // Step 3: LLM Token
  const llmUrl = ref(saved.llmUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1')
  const llmToken = ref(saved.llmToken || '')
  const llmModel = ref(saved.llmModel || 'qwen3.7-plus-2026-05-26')
  const llmVerified = ref(saved.llmVerified || false)

  // Step 4: Character
  const characterName = ref(saved.characterName || '')
  const characterPrompt = ref(saved.characterPrompt || '')
  const characterSet = ref(saved.characterSet || false)

  // Step 5: Topic
  const topicName = ref(saved.topicName || '')
  const topicPrompt = ref(saved.topicPrompt || '')
  const topicSet = ref(saved.topicSet || false)
  const topicLang = ref(saved.topicLang || 'zh')

  // TTS model selection (used in preview + main playback)
  const ttsModel = ref(saved.ttsModel || 'cosyvoice-v3.5-plus')

  // TTS speech rate (shared between preview and playback)
  const ttsRate = ref(saved.ttsRate ?? 0.5)

  // Step 6: Preview - no persistent state needed

  // Step 7: Play Config
  const playDuration = ref(saved.playDuration || 'infinite')

  // Player state (not persisted)
  const isPlaying = ref(false)
  const currentStatus = ref('idle') // idle | generatingScript | generatingAudio | playing | waiting | completed
  const currentText = ref('')       // currently playing slice text
  const timeElapsed = ref(0)
  const currentPreviewUrl = ref('')

  // Script buffer (runtime only)
  const fullScript = ref('')        // complete generated script
  const scriptSlices = ref([])      // sliced text segments: [{text, index}, ...]
  const sliceAudios = ref([])       // synthesized audio per slice: [{index, audioBuffer}, ...]
  const playedSliceIndex = ref(-1)  // index of currently playing slice

  // Audio archive for download (runtime only)
  const savedAudioBuffers = ref([])  // raw WAV ArrayBuffers in order

  const totalSlices = computed(() => scriptSlices.value.length)
  const completedSlices = computed(() => sliceAudios.value.length)

  // TTS language hints derived from topicLang
  const ttsLangHints = computed(() => {
    const map = { zh: ['zh'], en: ['en'], ja: ['ja'], ko: ['ko'] }
    return map[topicLang.value] || ['zh']
  })

  const llmConfigured = computed(() => {
    return !!(llmUrl.value && llmToken.value && llmVerified.value)
  })

  // Persist to localStorage
  const persistable = [
    bailianToken, bailianBaseUrl, bailianVerified,
    savedVoices, voiceId, voiceName,
    llmUrl, llmToken, llmModel, llmVerified,
    characterName, characterPrompt, characterSet,
    topicName, topicPrompt, topicSet, topicLang,
    ttsModel,
    ttsRate,
    playDuration,
  ]

  watch(persistable, () => {
    const data = {
      bailianToken: bailianToken.value,
      bailianBaseUrl: bailianBaseUrl.value,
      bailianVerified: bailianVerified.value,
      savedVoices: savedVoices.value,
      voiceId: voiceId.value,
      voiceName: voiceName.value,
      llmUrl: llmUrl.value,
      llmToken: llmToken.value,
      llmModel: llmModel.value,
      llmVerified: llmVerified.value,
      characterName: characterName.value,
      characterPrompt: characterPrompt.value,
      characterSet: characterSet.value,
      topicName: topicName.value,
      topicPrompt: topicPrompt.value,
      topicSet: topicSet.value,
      topicLang: topicLang.value,
      ttsModel: ttsModel.value,
      ttsRate: ttsRate.value,
      playDuration: playDuration.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, { deep: true })

  function addSavedVoice(id, name) {
    const existing = savedVoices.value.find(v => v.voiceId === id)
    if (!existing) {
      savedVoices.value.push({
        voiceId: id,
        voiceName: name || id.slice(0, 20),
        createdAt: Date.now(),
      })
    }
    voiceId.value = id
    voiceName.value = name || id.slice(0, 20)
  }

  function removeSavedVoice(id) {
    savedVoices.value = savedVoices.value.filter(v => v.voiceId !== id)
    if (voiceId.value === id) {
      const next = savedVoices.value[0]
      voiceId.value = next?.voiceId || ''
      voiceName.value = next?.voiceName || ''
    }
  }

  function resetScriptState() {
    fullScript.value = ''
    scriptSlices.value = []
    sliceAudios.value = []
    playedSliceIndex.value = -1
    savedAudioBuffers.value = []
  }

  return {
    bailianToken, bailianBaseUrl, bailianVerified,
    savedVoices, voiceId, voiceName,
    llmUrl, llmToken, llmModel, llmVerified,
    characterName, characterPrompt, characterSet,
    topicName, topicPrompt, topicSet, topicLang,
    ttsModel,
    ttsRate,
    playDuration,
    isPlaying, currentStatus, currentText, timeElapsed, currentPreviewUrl,
    fullScript, scriptSlices, sliceAudios, playedSliceIndex, savedAudioBuffers,
    totalSlices, completedSlices,
    llmConfigured, ttsLangHints,
    addSavedVoice, removeSavedVoice,
    resetScriptState,
  }
})
