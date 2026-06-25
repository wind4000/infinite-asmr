// Slice a markdown unordered list script into ~180-char segments
// Does NOT cut sentences in half. Splits on natural boundary:
//   - First by markdown list items ("- ...")
//   - Then greedily groups items until total chars reaches ~180
//   - Within an item, splits on sentence-ending punctuation (。！？.!?，"", etc.)
//
// Returns array of { text, index }

const TARGET_CHARS = 180
const SENTENCE_BOUNDARY = /[。！？.!?，,；;：:\n](?=\s*[^\s(""''])/g

export function sliceScript(fullScript) {
  if (!fullScript) return []

  // Step 1: Extract list items (lines starting with "- ")
  const lines = fullScript.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  let currentItem = ''

  for (const line of lines) {
    // Detect start of a new list item
    if (/^[-*] / .test(line)) {
      if (currentItem) {
        items.push(currentItem.trim())
      }
      currentItem = line.replace(/^[-*] /, '').trim()
    } else {
      // Continuation of previous item
      if (currentItem) {
        currentItem += ' ' + line
      } else {
        currentItem = line
      }
    }
  }
  if (currentItem) {
    items.push(currentItem.trim())
  }

  // If no list items detected, treat the whole text as one blob
  if (items.length === 0) {
    return slicePlainText(fullScript)
  }

  // Step 2: Group items into ~180 char slices without cutting sentences
  const slices = []
  let buffer = ''
  let sliceIndex = 0

  function emitSlice(text) {
    if (text.trim()) {
      slices.push({ text: text.trim(), index: sliceIndex++ })
    }
  }

  for (const item of items) {
    const candidate = buffer ? buffer + ' ' + item : item

    if (candidate.length <= TARGET_CHARS) {
      // Still fits
      buffer = candidate
    } else if (!buffer) {
      // Single item exceeds target — split at sentence boundaries
      buffer = candidate
      let bestSplit = buffer.length
      let m
      const boundaryRegex = new RegExp(SENTENCE_BOUNDARY.source, 'g')
      while ((m = boundaryRegex.exec(buffer)) !== null) {
        const splitPos = m.index + m[0].length
        if (splitPos <= TARGET_CHARS + 50) {
          bestSplit = splitPos
        } else {
          break
        }
      }
      if (bestSplit < buffer.length && bestSplit > TARGET_CHARS / 2) {
        emitSlice(buffer.slice(0, bestSplit))
        buffer = buffer.slice(bestSplit).trim()
      } else {
        // Hard split at TARGET_CHARS
        emitSlice(buffer.slice(0, TARGET_CHARS))
        buffer = buffer.slice(TARGET_CHARS).trim()
      }
    } else {
      // Buffer is full — emit and start new with this item
      emitSlice(buffer)
      buffer = item
    }
  }
  emitSlice(buffer)

  return slices
}

function slicePlainText(text) {
  const slices = []
  let pos = 0
  let idx = 0

  while (pos < text.length) {
    const endTarget = Math.min(pos + TARGET_CHARS, text.length)
    let splitPos = endTarget

    // Search backward for a sentence boundary near the target
    const searchStart = Math.max(pos + TARGET_CHARS * 0.6, pos)
    const chunk = text.slice(searchStart, endTarget + 50)

    let bestPos = endTarget
    let m
    const boundaryRegex = new RegExp(SENTENCE_BOUNDARY.source, 'g')
    let lastMatch = searchStart
    while ((m = boundaryRegex.exec(chunk)) !== null) {
      const absPos = searchStart + m.index + m[0].length
      if (absPos <= endTarget + 30) {
        lastMatch = absPos
      } else {
        break
      }
    }
    if (lastMatch > searchStart) {
      splitPos = lastMatch
    }

    const segment = text.slice(pos, splitPos).trim()
    if (segment) {
      slices.push({ text: segment, index: idx++ })
    }
    pos = splitPos
  }

  return slices
}
