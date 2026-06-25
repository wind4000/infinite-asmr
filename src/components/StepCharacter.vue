<template>
  <CollapsibleSection
    :step-number="stepNumber"
    :configured="configured"
    :disabled="disabled"
    title="人物设定"
    subtitle="选择或自定义 ASMR 主播的人设风格"
    subtitle-configured="人物设定已选择"
  >
    <div class="space-y-4 animate-fade-in">
      <!-- Preset selector -->
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="preset in presets"
          :key="preset.name"
          @click="selectPreset(preset)"
          class="card text-left transition-all"
          :class="selectedPreset === preset.name ? 'border-brand-500 bg-brand-500/5' : ''"
        >
          <div class="text-lg mb-1">{{ preset.icon }}</div>
          <div class="text-sm font-medium text-gray-200">{{ preset.name }}</div>
          <div class="text-xs text-gray-500 mt-1 line-clamp-2">{{ preset.desc }}</div>
        </button>
      </div>

      <!-- Custom prompt -->
      <div v-if="selectedPreset === '自定义'">
        <label class="block text-sm text-gray-400 mb-2">自定义人设 Prompt</label>
        <textarea
          v-model="customPrompt"
          rows="4"
          placeholder="描述你的 ASMR 主播人设...&#10;例如：温柔知性的邻家姐姐，说话轻声细语，善于用温暖的故事治愈听众的心灵。"
          class="input-field resize-none"
        ></textarea>
      </div>

      <!-- Preset preview -->
      <div v-if="selectedPreset && selectedPreset !== '自定义'" class="bg-gray-800/50 rounded-lg p-3">
        <div class="text-xs text-gray-500 mb-1">Prompt 预览</div>
        <div class="text-sm text-gray-300 leading-relaxed">{{ currentPresetPrompt }}</div>
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  stepNumber: { type: Number, default: 4 },
  configured: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['configured'])

const settings = useSettingsStore()

const presets = [
  {
    name: '温柔姐姐',
    icon: '\u{1F338}',
    desc: '温柔知性，轻声细语',
    prompt: '你是一个温柔知性的邻家姐姐。说话轻声细语，语气带着淡淡的暖意。你善于用温暖的故事和细腻的观察治愈听众的心灵，让人感到安心和放松。',
  },
  {
    name: '元气少女',
    icon: '\u{2600}\u{FE0F}',
    desc: '活泼元气，感染力强',
    prompt: '你是一个充满活力的元气少女。声音明亮但不刺耳，带着阳光般的温暖。你用积极乐观的态度感染听众，分享生活中有趣的小事，让人不自觉地微笑起来。',
  },
  {
    name: '沉稳男声',
    icon: '\u{1F31B}',
    desc: '沉稳磁性，安全感十足',
    prompt: '你是一个声音低沉而富有磁性的男性主播。语调沉稳平缓，带着温暖和安定感。你擅长用朴实而深刻的话语分享人生感悟，让听众感受到被理解和支持。',
  },
  {
    name: '古风雅士',
    icon: '\u{1F3B5}',
    desc: '古韵典雅，意境深远',
    prompt: '你是一个热爱传统文化的雅士。语调优雅舒缓，言辞间带着古典韵味。你擅长描绘山水意境、分享诗词典故，将古典美学融入温柔低语中，营造宁静悠远的氛围。',
  },
  {
    name: '自定义',
    icon: '\u{270F}\u{FE0F}',
    desc: '自由定义你的专属人设',
    prompt: '',
  },
]

const selectedPreset = ref(settings.characterName || '')
const customPrompt = ref(settings.characterPrompt || '')

const currentPresetPrompt = computed(() => {
  const preset = presets.find(p => p.name === selectedPreset.value)
  return preset?.prompt || ''
})

function selectPreset(preset) {
  selectedPreset.value = preset.name
  if (preset.prompt) {
    customPrompt.value = preset.prompt
  }
  save()
}

function save() {
  if (!selectedPreset.value) return
  const preset = presets.find(p => p.name === selectedPreset.value)
  settings.characterName = selectedPreset.value
  if (selectedPreset.value === '自定义') {
    if (!customPrompt.value.trim()) return
    settings.characterPrompt = customPrompt.value
  } else {
    settings.characterPrompt = preset?.prompt || ''
  }
  settings.characterSet = true
  emit('configured')
}

// Auto-save when custom textarea changes
watch(customPrompt, () => {
  if (selectedPreset.value === '自定义') {
    save()
  }
})
</script>
