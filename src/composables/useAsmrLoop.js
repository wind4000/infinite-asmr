import { ref, computed, readonly } from 'vue'
import { sliceScript } from '../utils/textSlice.js'

export function useAsmrLoop() {
  const isRunning = ref(false)
  const status = ref('idle')
  const error = ref('')

  // Callbacks
  let onGenScript = null
  let onContinueScript = null
  let onSynthSlice = null
  let onEnqueueSlice = null
  let onStatusChange = null

  let stopRequested = false
  let configDuration = 'infinite'

  // Pipeline state (reactive for UI binding)
  const slices = ref([])           // [{text, index}]
  const nextSynthIdx = ref(0)      // next slice index to synthesize and enqueue
  const totalSlices = computed(() => slices.value.length)
  let fullScriptText = ''
  let synthInFlight = new Set()

  function configure({ duration }) {
    configDuration = duration
  }

  async function start() {
    stopRequested = false
    isRunning.value = true
    error.value = ''
    nextSynthIdx.value = 0
    synthInFlight.clear()
    slices.value = []
    fullScriptText = ''

    setStatus('generatingScript')
    try {
      const scriptText = await onGenScript()
      if (stopRequested) return
      if (!scriptText) {
        error.value = '台本生成失败'
        setStatus('idle')
        return
      }
      fullScriptText = scriptText

      slices.value = sliceScript(scriptText)
      if (slices.value.length === 0) {
        error.value = '台本切片为空'
        setStatus('idle')
        return
      }
      console.log(`[ASMR Loop] Script sliced into ${slices.value.length} segments`)

      setStatus('generatingAudio')
      await synthesizeAndEnqueue(0)
      if (slices.value.length > 1) {
        await synthesizeAndEnqueue(1)
      }
      if (stopRequested) return

      setStatus('playing')
    } catch (e) {
      error.value = e.message
      setStatus('idle')
    }
  }

  async function synthesizeAndEnqueue(idx) {
    if (idx >= slices.value.length) return { done: true, index: idx }
    if (stopRequested) return { done: true, index: idx }
    if (synthInFlight.has(idx)) return { done: false, index: idx }

    synthInFlight.add(idx)
    try {
      const audio = await onSynthSlice(slices.value[idx].text, idx)
      if (audio && !stopRequested) {
        await onEnqueueSlice(audio, idx)
        nextSynthIdx.value = idx + 1
        return { done: false, index: idx }
      }
      // Audio synthesis returned null — likely an error
      if (!audio) {
        error.value = `切片 ${idx + 1} 音频合成失败`
        setStatus('idle')
      }
      return { done: true, index: idx }
    } catch (e) {
      console.error(`[ASMR Loop] Synth failed for slice ${idx}:`, e)
      error.value = `切片 ${idx + 1} 音频合成失败: ${e.message}`
      return { done: true, index: idx }
    } finally {
      synthInFlight.delete(idx)
    }
  }

  function synthesizeNext() {
    if (stopRequested) return { done: true, index: nextSynthIdx.value, isComplete: true }
    if (nextSynthIdx.value >= slices.value.length) {
      return { done: true, index: nextSynthIdx.value, isComplete: true }
    }
    return { done: false, index: nextSynthIdx.value, isComplete: false }
  }

  function getNextSynthIdx() {
    return nextSynthIdx.value
  }

  let continueInProgress = false

  async function checkContinue() {
    if (configDuration !== 'infinite') return false
    if (continueInProgress) return false
    if (stopRequested) return false

    const remaining = slices.value.length - nextSynthIdx.value
    if (remaining > 3) return false

    continueInProgress = true
    try {
      const continuation = await onContinueScript(fullScriptText)
      if (continuation && !stopRequested) {
        fullScriptText += '\n' + continuation
        const newSlices = sliceScript(continuation)
        const offset = slices.value.length
        const reindexed = newSlices.map((s, i) => ({ text: s.text, index: offset + i }))
        slices.value = [...slices.value, ...reindexed]
        console.log(`[ASMR Loop] Script continued: +${reindexed.length} slices, total=${slices.value.length}`)
        return true
      }
      return false
    } catch (e) {
      console.error('[ASMR Loop] Script continuation failed:', e)
      return false
    } finally {
      continueInProgress = false
    }
  }

  function pause() {
    isRunning.value = false
    setStatus('idle')
  }

  function stop() {
    stopRequested = true
    isRunning.value = false
    setStatus('idle')
    nextSynthIdx.value = 0
    synthInFlight.clear()
    slices.value = []
    fullScriptText = ''
  }

  function setStatus(s) {
    status.value = s
    if (onStatusChange) onStatusChange(s)
  }

  function registerHandlers({
    onGenScript: genScript,
    onContinueScript: contScript,
    onSynthSlice: synth,
    onEnqueueSlice: enq,
    onStatusChange: statChange,
  }) {
    onGenScript = genScript
    onContinueScript = contScript
    onSynthSlice = synth
    onEnqueueSlice = enq
    onStatusChange = statChange
  }

  function getState() {
    return {
      slices: slices.value,
      nextSynthIdx: nextSynthIdx.value,
      totalSlices: slices.value.length,
      configDuration,
      isStopped: stopRequested,
    }
  }

  return {
    isRunning: readonly(isRunning),
    status: readonly(status),
    error: readonly(error),
    totalSlices: readonly(totalSlices),
    nextSynthIdx: readonly(nextSynthIdx),
    configure,
    start,
    pause,
    stop,
    registerHandlers,
    getState,
    synthesizeAndEnqueue,
    synthesizeNext,
    getNextSynthIdx,
    checkContinue,
  }
}
