<template>
  <CollapsibleSection
    :step-number="stepNumber"
    :configured="false"
    :disabled="disabled"
    title="试听预览"
    subtitle="生成 1 分钟试听音频，确认效果后进入播放"
    subtitle-configured=""
  >
    <div class="space-y-4 animate-fade-in">
      <!-- Info -->
      <div class="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 leading-relaxed">
        系统将根据你的人物设定和聊天主题，生成约 1 分钟的试听音频。
      </div>

      <!-- Rate slider -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs text-gray-500">语速</label>
          <span class="text-xs text-gray-400 font-mono tabular-nums">{{ settings.ttsRate.toFixed(1) }}x</span>
        </div>
        <input
          type="range"
          :value="settings.ttsRate"
          @input="settings.ttsRate = parseFloat($event.target.value)"
          min="0.5"
          max="2.0"
          step="0.1"
          class="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-500"
        />
        <div class="flex justify-between text-xs text-gray-600">
          <span>0.5x (慢)</span>
          <span>2.0x (快)</span>
        </div>
      </div>

      <!-- Settings summary -->
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="bg-gray-800/30 rounded-lg p-3">
          <div class="text-gray-500 text-xs mb-0.5">人物设定</div>
          <div class="text-gray-200">{{ settings.characterName || '未设置' }}</div>
        </div>
        <div class="bg-gray-800/30 rounded-lg p-3">
          <div class="text-gray-500 text-xs mb-0.5">聊天主题</div>
          <div class="text-gray-200">{{ settings.topicName || '未设置' }}</div>
        </div>
      </div>

      <!-- Generate button -->
      <button
        @click="handleGenerate"
        :disabled="generating || !settings.bailianToken"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <svg v-if="generating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ generating ? statusText : '生成试听音频' }}
      </button>

      <!-- Generation progress -->
      <div v-if="generating || previewText" class="bg-gray-800/50 rounded-lg p-4">
        <div v-if="generating" class="flex items-center gap-2 text-sm text-brand-400 mb-3">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
          </svg>
          {{ statusText }}
        </div>

        <!-- Preview text -->
        <div v-if="previewText" class="text-sm text-gray-300 leading-relaxed max-h-32 overflow-y-auto mb-3 border-l-2 border-brand-500/30 pl-3">
          {{ previewText }}
        </div>

        <!-- Audio player -->
        <div v-if="previewAudioUrl" class="flex items-center gap-3">
          <button
            @click="togglePlay"
            class="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center transition-colors"
          >
            <svg v-if="isPlayingPreview" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <div class="flex-1">
            <div class="text-xs text-gray-400 mb-1">试听音频</div>
            <audio
              ref="previewAudio"
              :src="previewAudioUrl"
              @ended="isPlayingPreview = false"
              @play="isPlayingPreview = true"
              @pause="isPlayingPreview = false"
              class="w-full h-8"
              controls
            ></audio>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="previewError" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
        {{ previewError }}
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup>
import { ref } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import { useTextGen } from '../composables/useTextGen.js'
import { useTTS } from '../composables/useTTS.js'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  stepNumber: { type: Number, default: 6 },
  disabled: { type: Boolean, default: false },
})

const settings = useSettingsStore()
const { generating: textGen, error: textError, generateText } = useTextGen()
const { synthesizing, error: ttsError, synthesize } = useTTS()

const generating = ref(false)
const statusText = ref('')
const previewText = ref('')
const previewAudioUrl = ref('')
const previewError = ref('')
const isPlayingPreview = ref(false)
const previewAudio = ref(null)

async function handleGenerate() {
  generating.value = true
  previewError.value = ''
  previewText.value = ''
  previewAudioUrl.value = ''

  try {
    // Step 1: Generate text
    statusText.value = '正在生成 ASMR 文本...'
    const text = await generateText({
      llmUrl: settings.llmUrl,
      llmToken: settings.llmToken,
      llmModel: settings.llmModel,
      characterPrompt: settings.characterPrompt,
      topicPrompt: settings.topicPrompt,
      targetWordCount: 180,
      lang: settings.topicLang,
    })

    if (!text) {
      previewError.value = ttsError.value || '文本生成失败'
      return
    }
    previewText.value = text
    statusText.value = '正在合成语音...'

    // Step 2: Synthesize audio
    const audioData = await synthesize({
      text,
      apiKey: settings.bailianToken,
      baseUrl: settings.bailianBaseUrl,
      voiceId: settings.voiceId,
      model: settings.ttsModel,
      format: 'wav',
      rate: settings.ttsRate,
      languageHints: settings.ttsLangHints,
    })

    if (!audioData) {
      previewError.value = ttsError.value || '语音合成失败'
      return
    }

    const audioBlob = new Blob([audioData], { type: 'audio/wav' })
    previewAudioUrl.value = URL.createObjectURL(audioBlob)
    statusText.value = ''

  } catch (e) {
    previewError.value = e.message
  } finally {
    generating.value = false
  }
}

function togglePlay() {
  if (previewAudio.value) {
    if (isPlayingPreview.value) {
      previewAudio.value.pause()
    } else {
      previewAudio.value.play()
    }
  }
}
</script>
