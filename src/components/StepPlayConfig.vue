<template>
  <CollapsibleSection
    :step-number="stepNumber"
    :configured="false"
    :disabled="disabled"
    title="播放配置"
    subtitle="选择收听时长、生成间隔，开启无限 ASMR 体验"
    subtitle-configured=""
  >
    <div class="space-y-4 animate-fade-in">
      <!-- Rate slider -->
      <div>
        <label class="block text-sm text-gray-400 mb-3">语速</label>
        <div class="flex items-center gap-3 mb-2">
          <input
            type="range"
            :value="settings.ttsRate"
            @input="settings.ttsRate = parseFloat($event.target.value)"
            min="0.5"
            max="2.0"
            step="0.1"
            class="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-500"
          />
          <span class="text-sm text-gray-300 font-mono tabular-nums w-10 text-right">{{ settings.ttsRate.toFixed(1) }}x</span>
        </div>
        <div class="flex justify-between text-xs text-gray-600">
          <span>0.5x (慢语速)</span>
          <span>1.0x (正常)</span>
          <span>2.0x (快)</span>
        </div>
      </div>

      <!-- Duration selector -->
      <div>
        <label class="block text-sm text-gray-400 mb-3">收听时长</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="opt in durationOptions"
            :key="opt.value"
            @click="settings.playDuration = opt.value"
            class="py-3 px-4 rounded-lg border text-sm font-medium transition-all"
            :class="settings.playDuration === opt.value
              ? 'border-brand-500 bg-brand-500/10 text-brand-300'
              : 'border-gray-700 text-gray-400 hover:border-gray-600'"
          >
            <div>{{ opt.label }}</div>
            <div class="text-xs opacity-60 mt-0.5">{{ opt.desc }}</div>
          </button>
        </div>
      </div>

      <!-- Billing notice -->
      <div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
        <div class="flex items-start gap-2">
          <span class="text-amber-400 mt-0.5">&#9888;</span>
          <div>
            <p class="text-amber-300 font-medium mb-1">计费提示</p>
            <p class="text-gray-400 leading-relaxed">
              使用阿里云百炼服务将产生 API 调用费用。新用户享有
              <a
                href="https://www.alibabacloud.com/help/zh/model-studio/new-free-quota"
                target="_blank"
                class="text-amber-300 underline hover:text-amber-200"
              >90 天免费额度</a>（实测cosyvoice-v3.5-plus大概总共生成15分钟音频就用完了）。
              建议在
              <a
                href="https://bailian.console.aliyun.com/cn-beijing?tab=costing-balance#/costing-balance/free-quota"
                target="_blank"
                class="text-amber-300 underline hover:text-amber-200"
              >用量 & 费用</a>
              中为大语言模型和语音模型批量操作免费额度用完即停或用量预警，避免产生意外扣费。
            </p>
          </div>
        </div>
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup>
import CollapsibleSection from './CollapsibleSection.vue'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  stepNumber: { type: Number, default: 7 },
  disabled: { type: Boolean, default: false },
})

const settings = useSettingsStore()

const durationOptions = [
  { value: '5min', label: '5 分钟', desc: '快速放松' },
  { value: '15min', label: '15 分钟', desc: '短暂放松' },
  { value: '30min', label: '30 分钟', desc: '深度放松' },
  { value: 'infinite', label: '无限播放', desc: '伴随入眠' },
]
</script>
