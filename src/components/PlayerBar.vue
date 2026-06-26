<template>
  <div class="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-md border-t border-gray-800/60">
    <div class="max-w-2xl mx-auto px-4 py-3">
      <!-- Status & Progress -->
      <div v-if="settings.isPlaying || settings.currentStatus !== 'idle'" class="mb-3">
        <div v-if="settings.currentText" class="text-xs text-gray-500 mb-2 truncate">
          {{ settings.currentText.slice(0, 80) }}...
        </div>
        <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-brand-500 rounded-full transition-all duration-500"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
        <!-- Background generation hint -->
        <div v-if="bgHint" class="text-xs text-brand-400/70 mt-1 animate-pulse">{{ bgHint }}</div>
      </div>

      <!-- Controls row -->
      <div class="flex items-center gap-3">
        <!-- Play/Pause button -->
        <button
          @click="handleToggle"
          :disabled="!canPlay"
          class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          :class="canPlay ? 'bg-brand-600 hover:bg-brand-500' : 'bg-gray-800 cursor-not-allowed'"
        >
          <svg v-if="isBusy" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
          </svg>
          <svg v-else-if="!settings.isPlaying" class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>

        <!-- Stop button -->
        <button
          v-if="settings.isPlaying"
          @click="handleStop"
          class="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>

        <!-- Status text -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium" :class="statusColor">{{ statusLabel }}</div>
          <div class="text-xs text-gray-500">{{ statusDetail }}</div>
        </div>

        <!-- Download button (when audio is available) -->
        <button
          v-if="canDownload"
          @click="handleDownload"
          :disabled="downloading"
          class="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          title="下载合并 MP3"
        >
          <svg v-if="downloading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <!-- Time display -->
        <div v-if="settings.isPlaying" class="text-sm text-gray-400 font-mono tabular-nums">
          {{ formattedTime }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settings.js'
import { useAudioPlayer } from '../composables/useAudioPlayer.js'
import { useAsmrLoop } from '../composables/useAsmrLoop.js'
import { useTextGen } from '../composables/useTextGen.js'
import { useTTS } from '../composables/useTTS.js'
import { concatWavsToMp3 } from '../utils/mp3Encoder.js'

const settings = useSettingsStore()
const player = useAudioPlayer()
const asmrLoop = useAsmrLoop()
const textGen = useTextGen()
const tts = useTTS()

const elapsed = ref(0)
let elapsedTimer = null

// Background generation state
const generatingScript = ref(false)
const generatingAudio = ref(false)
const downloading = ref(false)

// --- Computed ---

const canPlay = computed(() => {
  return settings.topicSet && settings.bailianToken && settings.llmConfigured && settings.voiceId
})

const isBusy = computed(() => {
  return settings.currentStatus === 'generatingScript' || settings.currentStatus === 'generatingAudio'
})

const statusLabel = computed(() => {
  const map = {
    idle: '准备就绪',
    generatingScript: '正在生成台本（耗时较长，请耐心等待）...',
    generatingAudio: '正在生成音频...',
    playing: '正在播放',
    completed: '播放完成',
    error: '播放出错',
  }
  return map[settings.currentStatus] || settings.currentStatus
})

const statusColor = computed(() => {
  if (settings.currentStatus === 'error') return 'text-red-400'
  if (settings.isPlaying) return 'text-emerald-400'
  if (isBusy.value) return 'text-brand-400'
  return 'text-gray-400'
})

const statusDetail = computed(() => {
  if (settings.currentStatus === 'completed') return '已到达设定时长'
  if (settings.currentStatus === 'error') return asmrLoop.error.value || '未知错误'
  const total = asmrLoop.totalSlices.value
  const playing = settings.playedSliceIndex + 1
  if (playing > 0 && total > 0) {
    return `切片 ${playing}/${total}`
  }
  return settings.topicName ? `主题: ${settings.topicName}` : '点击播放按钮开始 ASMR 体验'
})

// Background hint: shows while text or audio is being generated during playback
const bgHint = computed(() => {
  if (generatingScript.value) return '正在续写台本...'
  if (generatingAudio.value) return '正在生成音频...'
  return ''
})

const progressPercent = computed(() => {
  if (settings.playDuration === 'infinite') return 0
  const limits = { '5min': 300, '15min': 900, '30min': 1800 }
  return Math.min(100, (elapsed.value / limits[settings.playDuration]) * 100)
})

const formattedTime = computed(() => {
  const mins = Math.floor(elapsed.value / 60)
  const secs = Math.floor(elapsed.value % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const canDownload = computed(() => {
  return settings.savedAudioBuffers.length > 0 && !settings.isPlaying
})

// --- Duration helper ---

function getDurationMinutes() {
  const map = { '5min': 5, '15min': 15, '30min': 30, 'infinite': 5 }
  return map[settings.playDuration] || 5
}

// --- Register handlers ---

asmrLoop.registerHandlers({
  onGenScript: async () => {
    generatingScript.value = true
    try {
      return await textGen.generateScript({
        llmUrl: settings.llmUrl,
        llmToken: settings.llmToken,
        llmModel: settings.llmModel,
        characterPrompt: settings.characterPrompt,
        topicPrompt: settings.topicPrompt,
        durationMinutes: getDurationMinutes(),
        lang: settings.topicLang,
      })
    } finally {
      generatingScript.value = false
    }
  },

  onContinueScript: async (existingScript) => {
    generatingScript.value = true
    try {
      const cont = await textGen.continueScript({
        llmUrl: settings.llmUrl, llmToken: settings.llmToken, llmModel: settings.llmModel,
        characterPrompt: settings.characterPrompt, topicPrompt: settings.topicPrompt,
        existingScript, durationMinutes: 5, lang: settings.topicLang,
      })
      if (cont) settings.fullScript = existingScript + '\n' + cont
      return cont
    } finally {
      generatingScript.value = false
    }
  },

  onSynthSlice: async (text, idx) => {
    generatingAudio.value = true
    try {
      return await tts.synthesize({
        text,
        apiKey: settings.bailianToken,
        voiceId: settings.voiceId,
        model: settings.ttsModel,
        format: 'wav',
        rate: settings.ttsRate,
        languageHints: settings.ttsLangHints,
      })
    } finally {
      generatingAudio.value = false
    }
  },

  onEnqueueSlice: async (audioData, idx) => {
    if (!audioData) return

    // Save raw WAV for download
    settings.savedAudioBuffers.push(audioData.slice(0))

    const wavBlob = new Blob([audioData], { type: 'audio/wav' })
    const arrayBuffer = await wavBlob.arrayBuffer()
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const buffer = await ctx.decodeAudioData(arrayBuffer)
    const state = asmrLoop.getState()
    const rawText = state.slices[idx]?.text || ''
    const meta = { text: rawText ? rawText.replace(/\{([^|]+)\|[^}]+\}/g, '$1') : '', index: idx }
    await player.enqueueBuffer(buffer, 24000, meta)
    ctx.close()
  },

  onStatusChange: (status) => {
    settings.currentStatus = status
  },
})

// --- Player callbacks ---

player.onSliceStart((meta) => {
  if (meta) {
    settings.playedSliceIndex = meta.index
    settings.currentText = meta.text
  }
})

player.onNeedMore(async () => {
  if (!settings.isPlaying) return

  if (isDurationReached()) {
    player.stop()
    asmrLoop.stop()
    settings.isPlaying = false
    settings.currentStatus = 'completed'
    stopElapsedTimer()
    return
  }

  await asmrLoop.checkContinue()

  const state = asmrLoop.getState()
  if (state.nextSynthIdx < state.totalSlices) {
    await asmrLoop.synthesizeAndEnqueue(state.nextSynthIdx)
  }

  if (asmrLoop.error.value) {
    player.stop()
    asmrLoop.stop()
    settings.isPlaying = false
    settings.currentStatus = 'error'
    stopElapsedTimer()
  }
})

player.onPlaybackEnd(() => {
  settings.isPlaying = false
  settings.currentStatus = 'completed'
  stopElapsedTimer()
})

// --- Duration tracking ---

function isDurationReached() {
  const limits = { '5min': 300, '15min': 900, '30min': 1800 }
  const limit = limits[settings.playDuration]
  return limit ? elapsed.value >= limit : false
}

function startElapsedTimer() {
  stopElapsedTimer()
  elapsedTimer = setInterval(() => {
    elapsed.value++
    if (isDurationReached() && settings.isPlaying) {
      player.stop()
      asmrLoop.stop()
      settings.isPlaying = false
      settings.currentStatus = 'completed'
      stopElapsedTimer()
    }
  }, 1000)
}

function stopElapsedTimer() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

// --- Controls ---

async function handleToggle() {
  if (!canPlay.value) return

  if (!settings.isPlaying) {
    settings.resetScriptState()
    settings.isPlaying = true
    elapsed.value = 0

    asmrLoop.configure({ duration: settings.playDuration })
    await asmrLoop.start()

    if (asmrLoop.error.value) {
      settings.isPlaying = false
      settings.currentStatus = 'idle'
      return
    }

    player.play()
    startElapsedTimer()
  } else {
    player.pause()
    asmrLoop.pause()
    settings.isPlaying = false
    settings.currentStatus = 'idle'
    stopElapsedTimer()
  }
}

function handleStop() {
  player.stop()
  asmrLoop.stop()
  settings.isPlaying = false
  settings.currentStatus = 'idle'
  settings.currentText = ''
  elapsed.value = 0
  stopElapsedTimer()
  // Keep savedAudioBuffers for download after stop
}

// --- Download ---

async function handleDownload() {
  if (settings.savedAudioBuffers.length === 0) return
  downloading.value = true
  try {
    const mp3Blob = await concatWavsToMp3(settings.savedAudioBuffers)
    if (!mp3Blob) return

    const url = URL.createObjectURL(mp3Blob)
    const a = document.createElement('a')
    a.href = url
    const topic = settings.topicName || 'asmr'
    const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.download = `infinite-asmr-${topic}-${now}.mp3`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Download failed:', e)
  } finally {
    downloading.value = false
  }
}

onUnmounted(() => {
  player.dispose()
  asmrLoop.stop()
  stopElapsedTimer()
})
</script>
