<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/60">
      <div class="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 class="text-lg font-semibold tracking-tight">
          <span class="text-brand-400">Infinite</span>
          <span class="text-gray-200"> ASMR</span>
        </h1>
        <div class="flex items-center gap-2">
          <span v-if="settings.bailianToken" class="badge-success text-xs">百炼已连接</span>
          <span v-if="settings.llmConfigured" class="badge-info text-xs">LLM已配置</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-20 pb-32 max-w-2xl mx-auto px-4 space-y-3">
      <!-- Step 1: Bailian Token -->
      <StepBailianToken
        :configured="!!settings.bailianToken"
        :step-number="1"
      />

      <!-- Step 2: Voice Clone -->
      <StepVoiceClone
        :configured="!!settings.voiceId"
        :disabled="!settings.bailianToken"
        :step-number="2"
      />

      <!-- Step 3: LLM Token -->
      <StepLLMToken
        :configured="!!settings.llmConfigured"
        :disabled="!settings.voiceId"
        :step-number="3"
      />

      <!-- Step 4: Character -->
      <StepCharacter
        :configured="!!settings.characterSet"
        :disabled="!settings.llmConfigured"
        :step-number="4"
      />

      <!-- Step 5: Topic -->
      <StepTopic
        :configured="!!settings.topicSet"
        :disabled="!settings.characterSet"
        :step-number="5"
      />

      <!-- Step 6: Preview -->
      <StepPreview
        :disabled="!settings.topicSet || !settings.bailianToken"
        :step-number="6"
      />

      <!-- Step 7: Play Config -->
      <StepPlayConfig
        :disabled="!settings.topicSet"
        :step-number="7"
      />
    </main>

    <!-- Player Bar -->
    <PlayerBar />
  </div>
</template>

<script setup>
import { useSettingsStore } from './stores/settings.js'
import StepBailianToken from './components/StepBailianToken.vue'
import StepVoiceClone from './components/StepVoiceClone.vue'
import StepLLMToken from './components/StepLLMToken.vue'
import StepCharacter from './components/StepCharacter.vue'
import StepTopic from './components/StepTopic.vue'
import StepPreview from './components/StepPreview.vue'
import StepPlayConfig from './components/StepPlayConfig.vue'
import PlayerBar from './components/PlayerBar.vue'

const settings = useSettingsStore()
</script>
