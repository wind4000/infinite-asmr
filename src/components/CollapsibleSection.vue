<template>
  <div class="step-container" :class="{ active: expanded }">
    <button
      @click="toggleCollapse"
      class="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-800/30 transition-colors rounded-xl"
      :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
      :disabled="disabled"
    >
      <!-- Step number badge -->
      <span
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
        :class="badgeClass"
      >
        <span v-if="configured" class="text-base">&#10003;</span>
        <span v-else>{{ stepNumber }}</span>
      </span>

      <!-- Title & description -->
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium" :class="disabled ? 'text-gray-600' : 'text-gray-200'">
          {{ title }}
        </h3>
        <p class="text-xs text-gray-500 truncate mt-0.5">
          {{ configured ? subtitleConfigured : subtitle }}
        </p>
      </div>

      <!-- Status indicator & collapse arrow -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <span v-if="configured && !expanded" class="badge-success text-xs">已完成</span>
        <span v-if="disabled" class="text-xs text-gray-600">等待上一步</span>
        <svg
          class="w-4 h-4 transition-transform duration-300"
          :class="expanded ? 'rotate-180 text-gray-300' : 'text-gray-500'"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- Collapsible content - no transition for reliability -->
    <div v-show="expanded && !disabled" class="px-5 pb-5">
      <div class="border-t border-gray-800 pt-4 animate-fade-in">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'

const props = defineProps({
  stepNumber: { type: Number, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  subtitleConfigured: { type: String, default: '' },
  configured: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle'])

// Auto-expand when step becomes available and not yet configured
const expanded = ref(false)

function computeExpanded() {
  return !props.disabled && !props.configured
}

onMounted(() => {
  expanded.value = computeExpanded()
})

watch(() => props.disabled, () => {
  expanded.value = computeExpanded()
})

watch(() => props.configured, (val) => {
  if (val) {
    expanded.value = false
  }
})

const badgeClass = computed(() => {
  if (props.configured) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  if (props.disabled) return 'bg-gray-800 text-gray-600 border border-gray-700'
  return 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
})

function toggleCollapse() {
  if (props.disabled) return
  expanded.value = !expanded.value
  emit('toggle', expanded.value)
}
</script>
