// Concatenate multiple WAV ArrayBuffers into a single MP3 Blob.
// Uses lamejs for MP3 encoding (128 kbps, mono, 24000 Hz).

import { Mp3Encoder } from 'lamejs'

export async function concatWavsToMp3(wavBuffers) {
  if (!wavBuffers || wavBuffers.length === 0) return null

  // Decode all WAV buffers to AudioBuffers, collect PCM samples
  const ctx = new OfflineAudioContext(1, 1, 24000)
  const audioBuffers = await Promise.all(
    wavBuffers.map(buf => ctx.decodeAudioData(buf.slice(0)))
  )

  // Compute total length
  let totalLength = 0
  for (const ab of audioBuffers) {
    totalLength += ab.length
  }

  // Concatenate interleaved Float32 samples
  const samples = new Float32Array(totalLength)
  let offset = 0
  for (const ab of audioBuffers) {
    const chData = ab.getChannelData(0)
    samples.set(chData, offset)
    offset += ab.length
  }

  // Encode to MP3 via lamejs
  const encoder = new Mp3Encoder(1, 24000, 128) // mono, 24000 Hz, 128 kbps
  const mp3Chunks = []

  // Process in blocks of 1152 samples (MP3 frame size)
  const blockSize = 1152
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, Math.min(i + blockSize, samples.length))
    const int16 = new Int16Array(chunk.length)
    for (let j = 0; j < chunk.length; j++) {
      int16[j] = Math.max(-32768, Math.min(32767, chunk[j] * 32767))
    }
    const mp3Data = encoder.encodeBuffer(int16)
    if (mp3Data.length > 0) mp3Chunks.push(mp3Data)
  }

  const finalData = encoder.flush()
  if (finalData.length > 0) mp3Chunks.push(finalData)

  return new Blob(mp3Chunks, { type: 'audio/mp3' })
}
