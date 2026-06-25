<template>
  <CollapsibleSection
    :step-number="stepNumber"
    :configured="configured"
    :disabled="disabled"
    title="聊天主题内容"
    subtitle="选择或自定义 ASMR 的内容主题"
    subtitle-configured="主题内容已选择"
  >
    <div class="space-y-4 animate-fade-in">
      <!-- Language selector -->
      <div class="space-y-2">
        <label class="text-xs text-gray-500">生成内容语种</label>
        <select
          v-model="selectedLang"
          class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:border-brand-500 transition-colors"
        >
          <option v-for="lang in langs" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
        <p class="text-xs text-gray-600">LLM 将用选择的语种生成内容，TTS 合成时自动匹配</p>
      </div>

      <!-- TTS Model selector -->
      <div class="space-y-2">
        <label class="text-xs text-gray-500">语音合成模型</label>
        <select
          v-model="selectedTtsModel"
          class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:border-brand-500 transition-colors"
        >
          <option v-for="m in ttsModels" :key="m.value" :value="m.value">
            {{ m.label }}
          </option>
        </select>
        <p class="text-xs text-gray-600">选择 CosyVoice 语音合成模型，影响音质和合成速度</p>
      </div>

      <!-- Preset topics -->
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="topic in topics"
          :key="topic.name"
          @click="selectTopic(topic)"
          class="card text-left transition-all"
          :class="selectedTopic === topic.name ? 'border-brand-500 bg-brand-500/5' : ''"
        >
          <div class="text-lg mb-1">{{ topic.icon }}</div>
          <div class="text-sm font-medium text-gray-200">{{ topic.name }}</div>
          <div class="text-xs text-gray-500 mt-1 line-clamp-2">{{ topic.desc }}</div>
        </button>
      </div>

      <!-- Custom topic -->
      <div v-if="selectedTopic === '自定义'">
        <label class="block text-sm text-gray-400 mb-2">自定义主题描述</label>
        <textarea
          v-model="customTopicPrompt"
          rows="3"
          placeholder="描述你想要的 ASMR 主题...&#10;例如：雨夜里的小酒馆，窗外细雨绵绵，室内暖黄的灯光下，讲述一个关于远方的故事。"
          class="input-field resize-none"
        ></textarea>
      </div>

      <!-- Preview -->
      <div v-if="selectedTopic && selectedTopic !== '自定义'" class="bg-gray-800/50 rounded-lg p-3">
        <div class="text-xs text-gray-500 mb-1">主题描述</div>
        <div class="text-sm text-gray-300 leading-relaxed">{{ currentTopicPrompt }}</div>
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  stepNumber: { type: Number, default: 5 },
  configured: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['configured'])

const settings = useSettingsStore()

const topics = [
  {
    name: '睡前故事',
    icon: '\u{1F319}',
    desc: '温暖治愈的睡前小故事',
    prompt: '生成一个温暖治愈的睡前故事。故事可以关于童话、月亮的旅行、森林里的小动物或者童年回忆。语气要轻柔舒缓，像妈妈在耳边讲故事，帮助听众放松入睡。',
  },
  {
    name: '自然白噪音',
    icon: '\u{1F33F}',
    desc: '配合自然音景的描绘',
    prompt: '描绘一段沉浸式的自然场景体验。可以是在海边听浪、森林中漫步、雨夜里听雨、或者山间溪流旁发呆。用细腻的文字描绘环境的声音、气味和感觉，引导听众想象并沉浸其中。',
  },
  {
    name: '冥想引导',
    icon: '\u{1F30A}',
    desc: '减压冥想与正念练习',
    prompt: '创作一段减压冥想引导词。用缓慢而平和的语调引导听众进行呼吸练习、身体扫描或者内心的宁静想象。内容要安全、正向，帮助听众释放压力和焦虑。',
  },
  {
    name: '日常絮语',
    icon: '\u{2615}',
    desc: '轻松温馨的日常聊天',
    prompt: '像朋友一样分享温馨的日常小事和感悟。可以聊一杯热茶的温暖、今天看到的晚霞、一本正在读的书、或者一些简单但美好的生活观察。语气要亲切自然，带着温柔的笑意。',
  },
  {
    name: '旅行游记',
    icon: '\u{2708}\u{FE0F}',
    desc: '分享旅途中的风景与故事',
    prompt: '像旅行的朋友一样，分享在世界各地旅行时遇到的美景、美食和趣事。可以描述异国的小巷、当地人的温暖、或者路上偶遇的惊喜。用画面感强的语言带听众一起旅行。',
  },
  {
    name: '自定义',
    icon: '\u{270F}\u{FE0F}',
    desc: '自由定义你的专属主题',
    prompt: '',
  },
]

const selectedTopic = ref(settings.topicName || '')
const customTopicPrompt = ref(settings.topicPrompt || '')
const selectedLang = ref(settings.topicLang || 'zh')
const selectedTtsModel = ref(settings.ttsModel || 'cosyvoice-v3.5-plus')

const langs = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
]

const ttsModels = [
  { value: 'cosyvoice-v3.5-plus', label: 'cosyvoice-v3.5-plus (推荐)' },
  { value: 'cosyvoice-v3.5-flash', label: 'cosyvoice-v3.5-flash' },
  { value: 'cosyvoice-v3-flash', label: 'cosyvoice-v3-flash' },
  { value: 'cosyvoice-v3-plus', label: 'cosyvoice-v3-plus' },
  { value: 'cosyvoice-v2', label: 'cosyvoice-v2' },
  { value: 'cosyvoice-v1', label: 'cosyvoice-v1' },
]

const currentTopicPrompt = computed(() => {
  const topic = topics.find(t => t.name === selectedTopic.value)
  return topic?.prompt || ''
})

function selectTopic(topic) {
  selectedTopic.value = topic.name
  if (topic.prompt) {
    customTopicPrompt.value = topic.prompt
  }
  save()
}

function save() {
  if (!selectedTopic.value) return
  const topic = topics.find(t => t.name === selectedTopic.value)
  settings.topicName = selectedTopic.value
  settings.topicLang = selectedLang.value
  settings.ttsModel = selectedTtsModel.value
  if (selectedTopic.value === '自定义') {
    if (!customTopicPrompt.value.trim()) return
    settings.topicPrompt = customTopicPrompt.value
  } else {
    settings.topicPrompt = topic?.prompt || ''
  }
  settings.topicSet = true
  emit('configured')
}

// Auto-save when dropdowns change (already configured)
watch(selectedLang, save)
watch(selectedTtsModel, save)

// Auto-save when custom textarea changes
watch(customTopicPrompt, () => {
  if (selectedTopic.value === '自定义') {
    save()
  }
})
</script>
