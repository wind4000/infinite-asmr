import { ref, readonly } from 'vue'
import { getAudioContext, decodePCM16, applyCrossFade, decodeAudioBlob } from '../utils/audio.js'

// Queue item: { buffer: AudioBuffer, meta: { text, index } }
export function useAudioPlayer() {
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const buffered = ref(0)

  let audioCtx = null
  let sourceNodes = []
  let queue = []           // [{buffer, meta}]
  let nextPlayTime = 0
  let pauseTime = 0
  let timeUpdateInterval = null
  let onNeedMoreCallback = null
  let onPlaybackEndCallback = null
  let onSliceStartCallback = null
  let endCheckTimeout = null
  let refreshingPromise = null

  function ensureContext() { audioCtx = getAudioContext() }

  // Enqueue with optional metadata for display sync
  async function enqueueBuffer(audioData, sampleRate = 24000, meta = null) {
    ensureContext()
    let buffer
    if (audioData instanceof AudioBuffer) buffer = audioData
    else if (audioData instanceof ArrayBuffer) buffer = decodePCM16(audioData, sampleRate)
    else if (audioData instanceof Blob) buffer = await decodeAudioBlob(audioData)
    else throw new Error('Unsupported audio data type')

    if (queue.length > 0) {
      const last = queue[queue.length - 1]
      applyCrossFade(last.buffer, buffer, 8)
    }
    queue.push({ buffer, meta })
    buffered.value = queue.length

    if (queue.length === 1 && isPlaying.value && !isPaused.value) {
      scheduleNext()
      // After resuming from an empty-queue wait, immediately pre-fetch next slice
      if (queue.length === 0 && onNeedMoreCallback && !refreshingPromise) {
        refreshingPromise = onNeedMoreCallback().finally(() => { refreshingPromise = null })
      }
    }
  }

  function scheduleNext() {
    if (queue.length === 0) {
      if (onNeedMoreCallback && !refreshingPromise) {
        refreshingPromise = onNeedMoreCallback().finally(() => { refreshingPromise = null })
      }
      return
    }
    const item = queue.shift()
    if (!item) return

    // Notify that this slice is about to start playing
    if (onSliceStartCallback && item.meta) {
      onSliceStartCallback(item.meta)
    }

    const source = audioCtx.createBufferSource()
    source.buffer = item.buffer
    source.connect(audioCtx.destination)

    const now = audioCtx.currentTime
    const playAt = nextPlayTime > now ? nextPlayTime : now
    source.start(playAt)
    sourceNodes.push(source)
    nextPlayTime = playAt + item.buffer.duration

    source.onended = () => {
      const idx = sourceNodes.indexOf(source)
      if (idx > -1) sourceNodes.splice(idx, 1)

      if (queue.length > 0) {
        scheduleNext()
        // Just consumed the last buffer — request more NOW for parallel TTS
        if (queue.length === 0 && onNeedMoreCallback && !refreshingPromise) {
          refreshingPromise = onNeedMoreCallback().finally(() => { refreshingPromise = null })
        }
      } else if (onNeedMoreCallback && !refreshingPromise) {
        refreshingPromise = onNeedMoreCallback().finally(() => { refreshingPromise = null })
      }
      scheduleEndCheck()
    }
    buffered.value = queue.length
  }

  function scheduleEndCheck() {
    if (endCheckTimeout) clearTimeout(endCheckTimeout)
    endCheckTimeout = setTimeout(async () => {
      // Wait for any in-flight async refresh (synthesis) to complete
      if (refreshingPromise) {
        const p = refreshingPromise
        try { await p } catch {}
        // refreshingPromise auto-cleared by .finally above
        scheduleEndCheck()
        return
      }
      if (queue.length === 0 && sourceNodes.length === 0) {
        // Double-check after 1 s — new audio may have just been enqueued
        // by a parallel synthesis whose Promise we didn't capture
        endCheckTimeout = setTimeout(() => {
          if (queue.length === 0 && sourceNodes.length === 0) {
            buffered.value = 0
            if (onPlaybackEndCallback) onPlaybackEndCallback()
          }
        }, 1000)
      }
    }, 150)
  }

  function play() {
    ensureContext()
    isPlaying.value = true
    isPaused.value = false
    if (pauseTime > 0) {
      nextPlayTime = audioCtx.currentTime + (nextPlayTime - pauseTime)
      pauseTime = 0
    }
    if (queue.length > 0 && sourceNodes.length === 0) {
      nextPlayTime = audioCtx.currentTime + 0.05
      scheduleNext()
    }
    startTimeTracker()
  }

  function pause() {
    isPaused.value = true
    isPlaying.value = false
    pauseTime = audioCtx.currentTime
    for (const source of sourceNodes) { try { source.stop() } catch (e) {} }
    sourceNodes = []
    if (queue.length > 0) {
      nextPlayTime = audioCtx.currentTime + queue.reduce((s, item) => s + item.buffer.duration, 0)
    }
    stopTimeTracker()
  }

  function stop() {
    isPlaying.value = false
    isPaused.value = false
    pauseTime = 0
    nextPlayTime = 0
    for (const source of sourceNodes) { try { source.stop() } catch (e) {} }
    sourceNodes = []
    queue = []
    buffered.value = 0
    currentTime.value = 0
    duration.value = 0
    stopTimeTracker()
    if (endCheckTimeout) { clearTimeout(endCheckTimeout); endCheckTimeout = null }
    refreshingPromise = null
  }

  function onNeedMore(callback) { onNeedMoreCallback = callback }
  function onPlaybackEnd(callback) { onPlaybackEndCallback = callback }
  function onSliceStart(callback) { onSliceStartCallback = callback }

  function startTimeTracker() {
    stopTimeTracker()
    timeUpdateInterval = setInterval(() => {
      if (sourceNodes.length > 0 && audioCtx) {
        const s = sourceNodes[0]
        if (s && s.playbackState === 2) currentTime.value = audioCtx.currentTime
      }
    }, 250)
  }
  function stopTimeTracker() {
    if (timeUpdateInterval) { clearInterval(timeUpdateInterval); timeUpdateInterval = null }
  }
  function dispose() { stop(); stopTimeTracker() }

  return {
    isPlaying: readonly(isPlaying), isPaused: readonly(isPaused),
    currentTime: readonly(currentTime), duration: readonly(duration),
    buffered: readonly(buffered),
    enqueueBuffer, play, pause, stop,
    onNeedMore, onPlaybackEnd, onSliceStart, dispose,
  }
}
