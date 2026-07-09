/**
 * Knowledge extraction helpers — thin layer over memoryKnowledgeBridge.
 * Future: LLM-based principle extraction from memories and reviews.
 */

export {
  suggestKnowledgeFromMemory,
  suggestKnowledgeFromMemories,
  buildKnowledgeInputFromSuggestion,
  createKnowledgeFromMemory,
} from './memoryKnowledgeBridge'
