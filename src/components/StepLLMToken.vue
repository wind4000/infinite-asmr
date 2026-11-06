<template>
  <CollapsibleSection
    :step-number="stepNumber"
    :configured="configured"
    :disabled="disabled"
    title="内容生成 LLM 配置"
    subtitle="配置 OpenAI-compatible API 用于生成 ASMR 文本内容"
    subtitle-configured="LLM Token 验证通过"
  >
    <div class="space-y-4 animate-fade-in">
      <!-- Info -->
      <div class="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400 leading-relaxed">
        支持任意 OpenAI-compatible API（如阿里云百炼、DeepSeek、硅基流动等）。LLM 用于生成文案。
      </div>

      <!-- API URL -->
      <div>
        <label class="block text-sm text-gray-400 mb-2">API Base URL</label>
        <select v-model="urlInput" class="select-field">
          <option value="https://dashscope.aliyuncs.com/compatible-mode/v1">阿里云百炼 (国内)</option>
          <option value="https://dashscope-intl.aliyuncs.com/compatible-mode/v1">阿里云百炼 (国际)</option>
          <option value="https://api.siliconflow.cn/v1">硅基流动</option>
          <option value="https://api.deepseek.com/v1">DeepSeek</option>
          <option value="custom">自定义 URL</option>
        </select>
      </div>

      <!-- Custom URL input -->
      <div v-if="urlInput === 'custom'">
        <label class="block text-sm text-gray-400 mb-2">自定义 API URL</label>
        <input
          v-model="customUrl"
          type="text"
          placeholder="https://your-api.com/v1"
          class="input-field"
        />
      </div>

      <!-- API Token -->
      <div>
        <label class="block text-sm text-gray-400 mb-2">API Token</label>
        <input
          v-model="tokenInput"
          type="password"
          :placeholder="configured ? '已配置 (输入新值覆盖)' : '输入 API Token'"
          class="input-field"
        />
      </div>

      <!-- Model name -->
      <div>
        <label class="block text-sm text-gray-400 mb-2">模型名称</label>
        <input
          v-model="modelInput"
          type="text"
          placeholder="qwen3.7-plus-2026-05-26"
          class="input-field"
        />
      </div>

      <!-- Verify button -->
      <button
        @click="handleVerify"
        :disabled="verifying || !effectiveUrl || !tokenInput || !modelInput"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <svg v-if="verifying" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
        </svg>
        {{ verifying ? '验证中...' : '验证并保存' }}
      </button>

      <!-- Error -->
      <div v-if="verifyError" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
        {{ verifyError }}
      </div>

      <!-- Success -->
      <div v-if="configured" class="flex items-center gap-2 text-sm text-emerald-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        LLM 配置验证成功
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup>
import { ref, computed } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import { useLLMToken } from '../composables/useLLMToken.js'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  stepNumber: { type: Number, default: 3 },
  configured: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['configured'])

const settings = useSettingsStore()
const { verifying, verified, error, verify } = useLLMToken()

const urlInput = ref(settings.llmUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1')
const customUrl = ref('')
const tokenInput = ref(settings.llmToken || '')
const modelInput = ref(settings.llmModel || 'qwen3.7-plus-2026-05-26')
const verifyError = ref('')

const effectiveUrl = computed(() => {
  return urlInput.value === 'custom' ? customUrl.value : urlInput.value
})

async function handleVerify() {
  const ok = await verify({ url: effectiveUrl.value, token: tokenInput.value, model: modelInput.value })
  if (ok) {
    settings.llmUrl = effectiveUrl.value
    settings.llmToken = tokenInput.value
    settings.llmModel = modelInput.value
    settings.llmVerified = true
    verifyError.value = ''
    emit('configured')
  } else {
    verifyError.value = error.value
  }
}
</script>
