import { ref } from 'vue'
import { resolveUrl } from '../utils/apiClient.js'

// Use the LLM to generate ASMR text content
export function useTextGen() {
  const generating = ref(false)
  const error = ref('')
  const lastContext = ref('')

  // ----- Original generateText (used by StepPreview) -----

  async function generateText({
    llmUrl, llmToken, llmModel,
    characterPrompt, topicPrompt,
    previousEnding = null,
    targetWordCount = 300,
    lang = 'zh',
  }) {
    generating.value = true
    error.value = ''

    const systemPrompt = buildSystemPrompt(characterPrompt, topicPrompt, lang)
    const messages = buildMessages(systemPrompt, previousEnding, lang)

    try {
      const resp = await fetch(resolveUrl(`${llmUrl}/chat/completions`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: llmModel,
          messages,
          max_tokens: Math.ceil(targetWordCount * 2),
          temperature: 0.85,
          top_p: 0.95,
          stream: false,
        }),
      })

      if (!resp.ok) {
        const body = await resp.text()
        throw new Error(`LLM 请求失败 (${resp.status}): ${body.slice(0, 200)}`)
      }

      const data = await resp.json()
      const content = data.choices?.[0]?.message?.content || ''

      const sentences = content.match(/[^。！？.!?\n]+[。！？.!?]?/g) || []
      if (sentences.length >= 3) {
        lastContext.value = sentences.slice(-3).join('')
      } else {
        lastContext.value = content.slice(-100)
      }

      return content
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      generating.value = false
    }
  }

  // ----- New: Generate full script as markdown unordered list -----

  async function generateScript({
    llmUrl, llmToken, llmModel,
    characterPrompt, topicPrompt,
    durationMinutes = 5,
    lang = 'zh',
  }) {
    generating.value = true
    error.value = ''

    const targetChars = durationMinutes * 360
    const targetItems = Math.ceil(durationMinutes * 1.0) // ~1 list item per minute
    const langName = LANG_NAMES[lang] || 'Chinese'

    const systemPrompt = buildScriptSystemPrompt(characterPrompt, topicPrompt, langName, targetChars)
    const messages = buildScriptMessages(systemPrompt, durationMinutes, targetChars, targetItems, lang)

    try {
      const resp = await fetch(resolveUrl(`${llmUrl}/chat/completions`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: llmModel,
          messages,
          max_tokens: Math.ceil(targetChars * 2),
          temperature: 0.9,
          top_p: 0.95,
          stream: false,
        }),
      })

      if (!resp.ok) {
        const body = await resp.text()
        throw new Error(`台本生成失败 (${resp.status}): ${body.slice(0, 200)}`)
      }

      const data = await resp.json()
      return data.choices?.[0]?.message?.content || null

    } catch (e) {
      error.value = e.message
      return null
    } finally {
      generating.value = false
    }
  }

  // ----- New: Continue existing script -----

  async function continueScript({
    llmUrl, llmToken, llmModel,
    characterPrompt, topicPrompt,
    existingScript,
    durationMinutes = 5,
    lang = 'zh',
  }) {
    generating.value = true
    error.value = ''

    const targetChars = durationMinutes * 360
    const targetItems = Math.ceil(durationMinutes * 1.0)
    const langName = LANG_NAMES[lang] || 'Chinese'

    const systemPrompt = buildScriptSystemPrompt(characterPrompt, topicPrompt, langName, targetChars)

    const requestMap = {
      zh: '请从上述台本的中断处自然无缝地续写。延续同样的语气、风格和叙事流。只输出新增的续写内容，不要重复任何已写过的句子。',
      en: 'Continue the above script seamlessly from where it left off. Maintain the same tone, style, and narrative flow. Only output the new continuation, do not repeat any previous sentences.',
      ja: '上記の台本の続きを、中断したところから自然に継続して書いてください。同じトーン、スタイル、物語の流れを維持してください。新しい続きの部分のみを出力し、以前の文章を繰り返さないでください。',
      ko: '위 대본의 중단된 지점에서 자연스럽게 이어서 작성해 주세요. 동일한 어조, 스타일, 내러티브 흐름을 유지하세요. 새로운 연속 부분만 출력하고, 이전 문장을 반복하지 마세요.',
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: existingScript },
      { role: 'user', content: requestMap[lang] || requestMap.zh },
    ]

    try {
      const resp = await fetch(resolveUrl(`${llmUrl}/chat/completions`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: llmModel,
          messages,
          max_tokens: Math.ceil(targetChars * 2),
          temperature: 0.9,
          top_p: 0.95,
          stream: false,
        }),
      })

      if (!resp.ok) {
        const body = await resp.text()
        throw new Error(`台本续写失败 (${resp.status}): ${body.slice(0, 200)}`)
      }

      const data = await resp.json()
      return data.choices?.[0]?.message?.content || null

    } catch (e) {
      error.value = e.message
      return null
    } finally {
      generating.value = false
    }
  }

  return { generating, error, lastContext, generateText, generateScript, continueScript }
}

// ---------- Prompt builders ----------

const LANG_NAMES = {
  zh: 'Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
}

// System prompt for single-chunk preview generation
function buildSystemPrompt(characterPrompt, topicPrompt, lang = 'zh') {
  const langName = LANG_NAMES[lang] || 'Chinese'
  const isJapanese = lang === 'ja'

  return `You are a professional ASMR voice content creator. Your task is to generate warm, soothing, relaxing ASMR audio scripts.

${characterPrompt ? `## Character\n${characterPrompt}\n` : ''}
${topicPrompt ? `## Topic\n${topicPrompt}\n` : ''}

## Content Guidelines
1. Speak in a gentle, soothing, intimate tone, like a friend whispering softly
2. Content should flow naturally with vivid imagery to immerse the listener
3. Each generation should be around 300 words, suitable for about 2 minutes of reading
4. Maintain a coherent natural narrative; don't start or end abruptly
5. Avoid sensitive, political, violent, or inappropriate content
6. Include everyday moments, warm memories, nature descriptions, and encouraging words

## Language Requirement
You MUST generate ALL content in ${langName}. Do not mix languages.
${isJapanese ? `
## Japanese Ruby (Furigana) Annotations
Add ruby annotations using the format {word|reading} for EVERY kanji compound word.
Example: {今日|きょう}は{浅草|あさくさ}で{和菓子|わがし}を{食|た}べました。
Annotate by lexeme (meaningful word unit), NOT by individual character.
→ CORRECT: {今日|きょう}
→ WRONG: {今|いま}{日|ひ}
Single-kanji words like {食|た} are also annotated.
The system will convert {word|reading} to the reading for TTS pronunciation guidance.
` : ''}
## CRITICAL RULES
- Output ONLY plain text meant for direct Text-to-Speech reading
- NEVER use stage directions, action descriptions, or annotations in any brackets:
  DO NOT output: [pause], [停顿], (laugh), （笑）, *whisper*, <sigh>, 【轻声】${isJapanese ? '\n- EXCEPTION: The {word|reading} ruby format is REQUIRED for all Japanese kanji words' : ''}
- Control pacing and pauses through natural punctuation and line breaks only
- Never output character names, scene descriptions, or any non-spoken text
- Output the spoken text and nothing else`
}

function buildMessages(systemPrompt, previousEnding, lang = 'zh') {
  const requestMap = {
    zh: '请开始一段温暖的ASMR语音，语气温柔舒缓。',
    en: 'Please start a warm ASMR audio episode, in a gentle and soothing tone.',
    ja: '温かみのあるASMR音声を始めてください。優しく落ち着いたトーンで。',
    ko: '따뜻한 ASMR 음성을 시작해 주세요. 부드럽고 편안한 톤으로.',
  }

  const messages = [{ role: 'system', content: systemPrompt }]

  if (previousEnding) {
    messages.push({ role: 'assistant', content: previousEnding })
    const prefixMap = { zh: '嗯，', en: 'Mm, ', ja: 'うん、', ko: '음, ' }
    messages.push({ role: 'assistant', content: prefixMap[lang] || 'Mm, ' })
  } else {
    messages.push({ role: 'user', content: requestMap[lang] || requestMap.zh })
  }

  return messages
}

// System prompt for full script generation (markdown list format)
function buildScriptSystemPrompt(characterPrompt, topicPrompt, langName, targetChars) {
  const isJapanese = langName === 'Japanese'
  return `You are a professional ASMR voice content creator. Generate a complete, continuous ASMR audio script.

${characterPrompt ? `## Character\n${characterPrompt}\n` : ''}
${topicPrompt ? `## Topic\n${topicPrompt}\n` : ''}

## Content Guidelines
1. Speak in a gentle, soothing, intimate tone, like a friend whispering softly
2. Content should flow naturally with vivid imagery, like an unbroken stream of storytelling
3. The script must be a seamless, continuous narrative from start to finish
4. Avoid sensitive, political, violent, or inappropriate content

## Language Requirement
ALL content MUST be in ${langName}.${isJapanese ? `

## Japanese Ruby (Furigana) Annotations
Add ruby annotations using the format {word|reading} for EVERY kanji compound word.
Example: {今日|きょう}は{浅草|あさくさ}で{和菓子|わがし}を{食|た}べました。
Annotate by lexeme (meaningful word unit), NOT by individual character.
→ CORRECT: {今日|きょう}
→ WRONG: {今|いま}{日|ひ}
Single-kanji words like {食|た} are also annotated.` : ''}

## Output Format
Output as a markdown unordered list. Each list item should be a natural paragraph suitable for direct Text-to-Speech reading.
Each item should be roughly ${Math.round(targetChars / 8)} Chinese characters (or equivalent in ${langName}), forming one natural speaking unit.
The entire script should total approximately ${targetChars} characters.

## CRITICAL
- Do NOT include stage directions, action descriptions, or annotations in brackets
- Do NOT output [pause], (laugh), *whisper*, or any meta-instructions${isJapanese ? '\n- EXCEPTION: The {word|reading} ruby format is REQUIRED for all Japanese kanji words' : ''}
- Output ONLY the markdown list of spoken text
- Each list item is one speaking unit for TTS`
}

function buildScriptMessages(systemPrompt, durationMinutes, targetChars, targetItems, lang = 'zh') {
  const requestMap = {
    zh: `请创作一段完整的、连续叙事的 ASMR 台本，适合 TTS 语音朗读，总时长约 ${durationMinutes} 分钟（约 ${targetChars} 字符）。内容要像一条流淌的河流——从一个主题自然过渡到下一个，让听众始终沉浸在舒缓的氛围中。以 markdown 无序列表格式输出，每个列表项为一个朗读单元。`,
    en: `Please write a complete, continuous-narrative ASMR script suitable for TTS reading, approximately ${durationMinutes} minutes long (about ${targetChars} characters). The content should flow like a stream — transitioning naturally from one topic to the next, keeping the listener immersed in a soothing atmosphere. Output as a markdown unordered list, each list item being one speaking unit.`,
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: requestMap[lang] || requestMap.zh },
  ]
}
