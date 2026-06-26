// Audio utility functions for PCM decoding, resampling, and AudioBuffer creation

let _audioCtx = null

function getAudioContext() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume()
  }
  return _audioCtx
}

// Decode raw PCM16 data to AudioBuffer
export function decodePCM16(pcmData, sampleRate = 24000, numChannels = 1) {
  const ctx = getAudioContext()
  const length = pcmData.byteLength / 2
  const buffer = ctx.createBuffer(numChannels, length, sampleRate)
  const view = new DataView(pcmData.buffer || pcmData)

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const sample = view.getInt16(i * 2 + ch * 2, true)
      channelData[i] = sample / 32768
    }
  }
  return buffer
}

// Decode audio blob (WAV/MP3/etc) to AudioBuffer
export async function decodeAudioBlob(blob) {
  const ctx = getAudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  return await ctx.decodeAudioData(arrayBuffer)
}

// Resample AudioBuffer to target sample rate
export async function resampleBuffer(buffer, targetRate = 24000) {
  if (buffer.sampleRate === targetRate) return buffer

  const ctx = getAudioContext()
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.duration * targetRate),
    targetRate
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = buffer
  source.connect(offlineCtx.destination)
  source.start(0)

  return await offlineCtx.startRendering()
}

// Apply cross-fade: fade out end of prev buffer, fade in start of next buffer
// fadeMs: cross-fade duration in milliseconds
export function applyCrossFade(prevBuffer, nextBuffer, fadeMs = 8) {
  const sampleRate = prevBuffer.sampleRate
  const fadeSamples = Math.floor(sampleRate * fadeMs / 1000)
  const numChannels = Math.min(prevBuffer.numberOfChannels, nextBuffer.numberOfChannels)

  for (let ch = 0; ch < numChannels; ch++) {
    const prevData = prevBuffer.getChannelData(ch)
    const nextData = nextBuffer.getChannelData(ch)

    for (let i = 0; i < fadeSamples; i++) {
      const factor = i / fadeSamples
      const prevIdx = prevBuffer.length - fadeSamples + i
      if (prevIdx >= 0 && prevIdx < prevBuffer.length) {
        prevData[prevIdx] *= (1 - factor)
      }
      if (i < nextBuffer.length) {
        nextData[i] *= factor
      }
    }
  }
}

// Concatenate two AudioBuffers
export function concatBuffers(buffer1, buffer2) {
  const ctx = getAudioContext()
  const channels = Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels)
  const totalLength = buffer1.length + buffer2.length
  const result = ctx.createBuffer(channels, totalLength, buffer1.sampleRate)

  for (let ch = 0; ch < channels; ch++) {
    const resultData = result.getChannelData(ch)
    const data1 = ch < buffer1.numberOfChannels ? buffer1.getChannelData(ch) : new Float32Array(buffer1.length)
    const data2 = ch < buffer2.numberOfChannels ? buffer2.getChannelData(ch) : new Float32Array(buffer2.length)
    resultData.set(data1, 0)
    resultData.set(data2, buffer1.length)
  }
  return result
}

// Get duration of AudioBuffer in seconds
export function getBufferDuration(buffer) {
  return buffer ? buffer.duration : 0
}

// Convert ArrayBuffer of raw PCM16 to WAV blob
export function pcmToWav(pcmData, sampleRate = 16000, numChannels = 1, bitDepth = 16) {
  const dataLength = pcmData.byteLength
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true)
  view.setUint16(32, numChannels * bitDepth / 8, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  new Uint8Array(buffer, 44, dataLength).set(new Uint8Array(pcmData))
  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

// Export AudioBuffer as a WAV Blob (for download)
export function audioBufferToWavBlob(buffer) {
  if (!buffer) return null
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const bitDepth = 16
  const dataLength = length * numChannels * (bitDepth / 8)
  const headerSize = 44
  const arrayBuffer = new ArrayBuffer(headerSize + dataLength)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true)
  view.setUint16(32, numChannels * bitDepth / 8, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  const samples = new Int16Array(arrayBuffer, headerSize, length * numChannels)
  let sampleIdx = 0
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = buffer.getChannelData(ch)[i]
      samples[sampleIdx++] = Math.max(-32768, Math.min(32767, s * 32767))
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

// Get current AudioContext
export { getAudioContext }
