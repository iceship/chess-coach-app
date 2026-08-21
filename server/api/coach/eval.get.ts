import { z } from 'zod'
import { runStockfishAnalysis } from '~~/server/utils/stockfish'

const evalQuerySchema = z.object({
  fen: z.string().min(1),
  depth: z.coerce.number().min(8).max(24).optional().default(16),
  multipv: z.coerce.number().min(1).max(5).optional().default(2),
  movetime: z.coerce.number().min(50).max(10000).optional()
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, evalQuerySchema.parse)

  try {
    const evalResult = await runStockfishAnalysis(query.fen, {
      depth: query.depth,
      multipv: query.multipv,
      movetimeMs: query.movetime,
      timeoutMs: 8000
    })

    return {
      fen: query.fen,
      eval: evalResult
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stockfish evaluation failed'
    throw createError({
      statusCode: 500,
      statusMessage: message
    })
  }
})
