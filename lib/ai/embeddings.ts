/**
 * Server-only OpenAI embedding helpers.
 * Do not import from client components.
 */

import { createOpenAIClient, mapOpenAIError } from '@/lib/ai/server'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

/** Generate a single embedding vector for the given text. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.trim()
  if (!input) throw new Error('Cannot embed empty text.')

  const openai = createOpenAIClient()
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    })
    const vector = response.data[0]?.embedding
    if (!vector?.length) throw new Error('The embedding service returned an empty vector.')
    return vector
  } catch (err) {
    const mapped = mapOpenAIError(err)
    throw new Error(mapped.message)
  }
}

/** Generate embeddings for multiple texts in one API call (batched). */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const inputs = texts.map(t => t.trim()).filter(Boolean)
  if (!inputs.length) return []

  const openai = createOpenAIClient()
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputs,
      dimensions: EMBEDDING_DIMENSIONS,
    })
    return response.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding)
  } catch (err) {
    const mapped = mapOpenAIError(err)
    throw new Error(mapped.message)
  }
}

export { mapOpenAIError }
