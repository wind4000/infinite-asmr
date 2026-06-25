<template>
  <CollapsibleSection
    :step-number="stepNumber"
    :configured="configured"
    :disabled="false"
    title="阿里云百炼 API-Key"
    subtitle="注册阿里云百炼获取免费 Token"
    subtitle-configured="Token 已验证通过"
  >
    <div class="space-y-4 animate-fade-in">
      <!-- Info banner -->
      <div class="bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 text-sm">
        <p class="text-brand-300 font-medium mb-1">首次使用？</p>
        <p class="text-gray-400 leading-relaxed">
          访问
          <a
            href="https://bailian.console.aliyun.com/#/home"
            target="_blank"
            class="text-brand-400 underline hover:text-brand-300"
          >阿里云百炼控制台</a>
          注册并获取 API-Key，新用户享有
          <a
            href="https://www.alibabacloud.com/help/zh/model-studio/new-free-quota"
            target="_blank"
            class="text-brand-400 underline hover:text-brand-300"
          >免费额度</a>（90天有效）。
        </p>
      </div>

      <!-- Token input -->
      <div>
        <label class="block text-sm text-gray-400 mb-2">API-Key</label>
        <div class="flex gap-2">
          <input
            v-model="tokenInput"
            type="password"
            :placeholder="configured ? '已配置 (输入新值覆盖)' : 'sk-xxxxxxxxxxxxxxxx'"
            class="input-field flex-1"
            @keyup.enter="handleVerify"
          />
          <button
            @click="handleVerify"
            :disabled="verifying || !tokenInput"
            class="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <svg v-if="verifying" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" />
            </svg>
            <svg v-else-if="configured" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ verifying ? '验证中...' : configured ? '重新验证' : '验证' }}
          </button>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
        {{ error }}
      </div>

      <!-- Success state -->
      <div v-if="configured" class="flex items-center gap-2 text-sm text-emerald-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        百炼 API-Key 验证成功
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import { useBailianToken } from '../composables/useBailianToken.js'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  stepNumber: { type: Number, default: 1 },
  configured: { type: Boolean, default: false },
})

const emit = defineEmits(['configured'])

const settings = useSettingsStore()
const { verifying, verified, error, verify } = useBailianToken()

const tokenInput = ref(settings.bailianToken || '')

async function handleVerify() {
  const ok = await verify(tokenInput.value)
  if (ok) {
    settings.bailianToken = tokenInput.value
    settings.bailianVerified = true
    emit('configured')
  }
}
</script>
