<template>
  <CollapsibleSection
    :step-number="stepNumber"
    :configured="configured"
    :disabled="disabled"
    title="创建专属音色"
    subtitle="通过音频克隆、文字描述或直接填写 voice_id"
    subtitle-configured="音色创建完成"
  >
    <div class="space-y-4 animate-fade-in">
      <!-- Existing voices selector -->
      <div v-if="settings.savedVoices.length > 0" class="space-y-2">
        <label class="text-xs text-gray-500">已保存的音色（点击选择）</label>
        <div class="space-y-1.5">
          <div
            v-for="v in settings.savedVoices"
            :key="v.voiceId"
            @click="selectExistingVoice(v)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer"
            :class="settings.voiceId === v.voiceId
              ? 'bg-brand-500/20 border border-brand-500 text-brand-200'
              : 'bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:border-gray-600'"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span class="flex-1 truncate">{{ v.voiceName }}</span>
            <span v-if="settings.voiceId === v.voiceId" class="text-xs text-brand-400 shrink-0">当前</span>
            <span
              @click.stop="settings.removeSavedVoice(v.voiceId)"
              class="text-gray-600 hover:text-red-400 p-0.5 cursor-pointer shrink-0"
              title="删除"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </div>
          <div class="text-xs text-gray-600 font-mono truncate" v-if="settings.voiceId">{{ settings.voiceId }}</div>
        </div>
      </div>

      <!-- Divider -->
      <div v-if="settings.savedVoices.length > 0 && showNewForm" class="border-t border-gray-700/50 pt-1">
        <div class="text-xs text-gray-500 mb-3">添加新音色</div>
      </div>

      <!-- Three-mode tab + form (hidden when has saved voices and not expanding) -->
      <div v-if="!hasSavedVoices || showNewForm">
        <div class="flex gap-1.5 mb-4">
          <button
            v-for="mode in modes"
            :key="mode.key"
            @click="selectedMode = mode.key"
            class="flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
            :class="selectedMode === mode.key
              ? 'bg-brand-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'"
          >
            {{ mode.label }}
          </button>
        </div>

        <!-- TTS Model selector (moved from StepTopic) -->
        <div v-if="selectedMode !== 'id'" class="space-y-2 mb-4">
          <label class="text-xs text-gray-500">语音合成模型</label>
          <select
            v-model="selectedModel"
            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:border-brand-500 transition-colors"
          >
            <option v-for="m in cloneModels" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
          <p class="text-xs text-gray-600">选择 CosyVoice 合成模型，克隆将使用该模型创建音色。v1/v2 不支持克隆。</p>
        </div>

        <!-- Shared: prefix input -->
        <div v-if="selectedMode !== 'id'" class="space-y-2">
          <label class="text-xs text-gray-500">音色名称前缀（最长10字符）</label>
          <input
            v-model="voicePrefix"
            type="text"
            maxlength="10"
            placeholder="例如：myAsmr"
            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            :disabled="cloning"
          />
        </div>

        <!-- Mode: Audio URL cloning -->
        <template v-if="selectedMode === 'url'">
          <div class="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 leading-relaxed mt-3">
            将音频文件上传到境内可访问的图床，粘贴公网直链 URL。支持 WAV/MP3/M4A，建议 10-30 秒清晰录音。
          </div>

          <div class="space-y-2 mt-3">
            <label class="text-xs text-gray-500">音频文件直链 URL</label>
            <input
              v-model="audioUrl"
              type="url"
              placeholder="https://example.com/your-voice.wav"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              :disabled="cloning"
            />
          </div>

          <div class="space-y-2 mt-3">
            <label class="text-xs text-gray-500">语言提示（可选）</label>
            <select
              v-model="audioLang"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:border-brand-500 transition-colors"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>

          <button
            @click="handleCloneFromUrl"
            :disabled="!audioUrl || cloning"
            class="btn-primary w-full mt-3"
          >
            {{ cloning ? '克隆中...' : '开始克隆音色' }}
          </button>
        </template>

        <!-- Mode: Text description -->
        <template v-if="selectedMode === 'description'">
          <div class="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 leading-relaxed mt-3">
            通过文字描述即可生成专属音色。描述音色的质感、年龄、情绪等特征。
          </div>

          <div class="space-y-2 mt-3">
            <label class="text-xs text-gray-500">音色描述 (voice_prompt)</label>
            <textarea
              v-model="voicePrompt"
              rows="3"
              placeholder="例如：温暖沉稳的中年男声，语速适中，带有磁性"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
              :disabled="cloning"
            ></textarea>
          </div>

          <div class="space-y-2 mt-3">
            <label class="text-xs text-gray-500">试听文本 (preview_text)</label>
            <textarea
              v-model="previewText"
              rows="2"
              placeholder="例如：亲爱的听众朋友们，大家晚上好"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
              :disabled="cloning"
            ></textarea>
          </div>

          <button
            @click="handleCreateDescription"
            :disabled="!voicePrompt || !previewText || cloning"
            class="btn-primary w-full mt-3"
          >
            {{ cloning ? '创建中...' : '创建音色' }}
          </button>
        </template>

        <!-- Mode: Direct voice_id -->
        <template v-if="selectedMode === 'id'">
          <div class="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 leading-relaxed mt-3">
            如果你已通过阿里云控制台或其他方式创建了音色，直接填写 voice_id 即可。
          </div>

          <div class="space-y-2 mt-3">
            <label class="text-xs text-gray-500">Voice ID</label>
            <input
              v-model="directVoiceId"
              type="text"
              placeholder="cosyvoice-v3.5-plus-myname-xxxxxxxxxxxx"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div class="space-y-2 mt-3">
            <label class="text-xs text-gray-500">音色名称（可选）</label>
            <input
              v-model="directVoiceName"
              type="text"
              placeholder="例如：我的音色"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 transition-colors"
            />
          </div>

          <button
            @click="handleDirectId"
            :disabled="!directVoiceId"
            class="btn-primary w-full mt-3"
          >
            确认使用
          </button>
        </template>
      </div>

      <!-- Toggle show/hide new form -->
      <button
        v-if="hasSavedVoices"
        @click="showNewForm = !showNewForm"
        class="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        {{ showNewForm ? '收起' : '+ 添加新音色' }}
      </button>

      <!-- Cloning progress -->
      <div v-if="cloning" class="flex items-center gap-3 py-2">
        <svg class="w-5 h-5 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
        </svg>
        <span class="text-sm text-brand-400">{{ cloneProgress }}</span>
      </div>

      <!-- Success state -->
      <div v-if="configured" class="flex items-center gap-2 text-sm text-emerald-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        已选择音色: {{ settings.voiceName || settings.voiceId }}
      </div>

      <!-- Error -->
      <div v-if="cloneError" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
        {{ cloneError }}
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup>
import { ref, computed } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import { useVoiceClone } from '../composables/useVoiceClone.js'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  stepNumber: { type: Number, default: 2 },
  configured: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['configured'])

const settings = useSettingsStore()
const { cloning, progress, error, cloneFromUrl, createFromDescription } = useVoiceClone()

const modes = [
  { key: 'url', label: 'URL 克隆' },
  { key: 'description', label: '文字生成' },
  { key: 'id', label: '填 voice_id' },
]

// Known CosyVoice synthesis models (longest-first for prefix matching)
const ALL_MODELS = [
  'cosyvoice-v3.5-plus',
  'cosyvoice-v3.5-flash',
  'cosyvoice-v3-flash',
  'cosyvoice-v3-plus',
  'cosyvoice-v2',
  'cosyvoice-v1',
]

// Models that support voice cloning (exclude v1/v2)
const CLONEABLE = ALL_MODELS.filter(m => m !== 'cosyvoice-v2' && m !== 'cosyvoice-v1')

const cloneModels = CLONEABLE.map(m => ({ value: m, label: m === 'cosyvoice-v3.5-plus' ? `${m} (推荐)` : m }))

function detectModelFromVoiceId(voiceId) {
  if (!voiceId) return 'cosyvoice-v3.5-plus'
  for (const model of ALL_MODELS) {
    if (voiceId.startsWith(model)) return model
  }
  return 'cosyvoice-v3.5-plus'
}

const selectedMode = ref('url')
const audioUrl = ref('')
const audioLang = ref('zh')
const voicePrompt = ref('')
const previewText = ref('')
const voicePrefix = ref('')
const directVoiceId = ref('')
const directVoiceName = ref('')
const cloneError = ref('')
const cloneProgress = ref('')
const showNewForm = ref(false)

// Model selector: initialize from settings.ttsModel, fall back to cloneable if v1/v2
const selectedModel = ref(
  CLONEABLE.includes(settings.ttsModel) ? settings.ttsModel : 'cosyvoice-v3.5-plus'
)

const hasSavedVoices = computed(() => settings.savedVoices.length > 0)

function selectExistingVoice(v) {
  settings.voiceId = v.voiceId
  settings.voiceName = v.voiceName
  cloneError.value = ''
  // Auto-detect model from voice_id prefix
  const detected = detectModelFromVoiceId(v.voiceId)
  settings.ttsModel = detected
  selectedModel.value = CLONEABLE.includes(detected) ? detected : 'cosyvoice-v3.5-plus'
  emit('configured', v.voiceId)
}

function handleDirectId() {
  if (!directVoiceId.value) return
  const name = directVoiceName.value || directVoiceId.value.slice(0, 20)
  settings.addSavedVoice(directVoiceId.value, name)
  // Auto-detect model from voice_id prefix
  const detected = detectModelFromVoiceId(directVoiceId.value)
  settings.ttsModel = detected
  selectedModel.value = CLONEABLE.includes(detected) ? detected : 'cosyvoice-v3.5-plus'
  emit('configured', directVoiceId.value)
}

async function handleCloneFromUrl() {
  if (!audioUrl.value) return

  cloneError.value = ''
  const resultId = await cloneFromUrl({
    url: audioUrl.value,
    apiKey: settings.bailianToken,
    baseUrl: settings.bailianBaseUrl,
    languageHints: [audioLang.value],
    prefix: voicePrefix.value || undefined,
    targetModel: selectedModel.value,
  })
  cloneProgress.value = progress.value

  if (resultId) {
    const name = voicePrefix.value || '克隆音色 ' + resultId.slice(0, 8)
    settings.addSavedVoice(resultId, name)
    // After clone, the returned voice_id already has the model prefix
    settings.ttsModel = selectedModel.value
    emit('configured', resultId)
  } else {
    cloneError.value = error.value
  }
}

async function handleCreateDescription() {
  if (!voicePrompt.value || !previewText.value) return

  cloneError.value = ''
  const resultId = await createFromDescription({
    voicePrompt: voicePrompt.value,
    previewText: previewText.value,
    apiKey: settings.bailianToken,
    baseUrl: settings.bailianBaseUrl,
    prefix: voicePrefix.value || undefined,
    targetModel: selectedModel.value,
  })
  cloneProgress.value = progress.value

  if (resultId) {
    const name = voicePrefix.value || '描述音色 ' + resultId.slice(0, 8)
    settings.addSavedVoice(resultId, name)
    settings.ttsModel = selectedModel.value
    emit('configured', resultId)
  } else {
    cloneError.value = error.value
  }
}
</script>
