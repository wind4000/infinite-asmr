// Concatenate multiple WAV ArrayBuffers into a single WAV Blob.
// Decodes each WAV to AudioBuffer, concatenates PCM, then exports as WAV.

import { audioBufferToWavBlob } from './audio.js'

export async function concatWavsToWav(wavBuffers) {
  if (!wavBuffers || wavBuffers.length === 0) return null

  const ctx = new OfflineAudioContext(1, 1, 24000)
  const audioBuffers = await Promise.all(
    wavBuffers.map(buf => ctx.decodeAudioData(buf.slice(0)))
  )

  // Compute total length
  let totalLength = 0
  const sampleRate = audioBuffers[0].sampleRate
  const numChannels = Math.max(...audioBuffers.map(b => b.numberOfChannels))
  for (const ab of audioBuffers) {
    totalLength += ab.length
  }

  // Concatenate into one result buffer
  const result = ctx.createBuffer(numChannels, totalLength, sampleRate)
  for (let ch = 0; ch < numChannels; ch++) {
    const outData = result.getChannelData(ch)
    let offset = 0
    for (const ab of audioBuffers) {
      // If the source buffer has this channel, copy it; otherwise copy silence
      if (ch < ab.numberOfChannels) {
        outData.set(ab.getChannelData(ch), offset)
      }
      offset += ab.length
    }
  }

  return audioBufferToWavBlob(result)
}
