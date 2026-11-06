// API endpoint constants based on N.E.K.O config/api_providers.json patterns

export const API = {
  // Alibaba Bailian (DashScope) - domestic
  BAILIAN_DOMESTIC: 'https://dashscope.aliyuncs.com/compatible-mode/v1',

  // Alibaba Bailian (DashScope) - international
  BAILIAN_INTL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',

  // CosyVoice TTS endpoints
  COSYVOICE_DOMESTIC: 'https://dashscope.aliyuncs.com',
  COSYVOICE_INTL: 'https://dashscope-intl.aliyuncs.com',

  // CosyVoice model names
  COSYVOICE_CLONE_MODEL: 'cosyvoice-v3.5-plus',
  COSYVOICE_INTL_CLONE_MODEL: 'cosyvoice-v3-plus',

  // Default LLM model
  DEFAULT_LLM_MODEL: 'qwen3.7-plus-2026-05-26',

  // TTS voice model for CosyVoice synthesis
  COSYVOICE_TTS_MODEL: 'cosyvoice-v3.5-plus',
}

// Get the DashScope API base URL from token (auto-detect domestic vs intl)
export function getDashScopeBase(token) {
  if (!token) return API.BAILIAN_DOMESTIC
  // sk-xxx is domestic, no prefix or other prefix could be intl
  return API.BAILIAN_DOMESTIC
}

// DeepSeek enables reasoning by default; spoken scripts should spend tokens on content.
export function getChatRequestExtras(baseUrl) {
  return new URL(baseUrl).hostname === 'api.deepseek.com'
    ? { thinking: { type: 'disabled' } }
    : {}
}

// Get the CosyVoice base URL
export function getCosyVoiceBase(token) {
  return API.COSYVOICE_DOMESTIC
}
