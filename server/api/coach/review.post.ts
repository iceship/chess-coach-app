import { z } from 'zod'
import { Chess } from 'chess.js'
import type { ChessColor, MoveClassification, StockfishEvalResult } from '~~/shared/types/chess'

const reviewSchema = z.object({
  pgn: z.string().optional(),
  history: z.array(z.object({
    moveNumber: z.number(),
    turn: z.enum(['w', 'b']),
    san: z.string(),
    from: z.string(),
    to: z.string(),
    beforeFen: z.string(),
    afterFen: z.string()
  })).optional()
})

export interface GameReviewResponse {
  moves: Array<{
    index: number
    moveNumber: number
    turn: ChessColor
    san: string
    eval: StockfishEvalResult
    classification: MoveClassification
  }>
  whiteAccuracy: number
  blackAccuracy: number
  stats: {
    white: Record<MoveClassification, number>
    black: Record<MoveClassification, number>
  }
}

export default defineEventHandler(async (event): Promise<GameReviewResponse> => {
  const body = await readValidatedBody(event, reviewSchema.parse)

  let moveItems = body.history || []

  // If only PGN was provided, parse history from PGN
  if (moveItems.length === 0 && body.pgn) {
    try {
      const chess = new Chess()
      chess.loadPgn(body.pgn)
      const verbose = chess.history({ verbose: true })
      const replay = new Chess()

      moveItems = verbose.map((m, i) => {
        const before = replay.fen()
        replay.move({ from: m.from, to: m.to, promotion: m.promotion })
        const after = replay.fen()
        return {
          moveNumber: Math.floor(i / 2) + 1,
          turn: m.color as ChessColor,
          san: m.san,
          from: m.from,
          to: m.to,
          beforeFen: before,
          afterFen: after
        }
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw createError({ statusCode: 400, statusMessage: `Failed to parse PGN: ${message}` })
    }
  }

  if (moveItems.length === 0) {
    return {
      moves: [],
      whiteAccuracy: 100,
      blackAccuracy: 100,
      stats: {
        white: { brilliant: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 },
        black: { brilliant: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 }
      }
    }
  }

  const whiteStats: Record<MoveClassification, number> = {
    brilliant: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0
  }
  const blackStats: Record<MoveClassification, number> = {
    brilliant: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0
  }

  const evaluatedMoves: GameReviewResponse['moves'] = []
  const whiteCpls: number[] = []
  const blackCpls: number[] = []

  let prevEval: StockfishEvalResult | null = null

  // Fast evaluation at depth 12 for high speed batch review
  for (let i = 0; i < moveItems.length; i++) {
    const item = moveItems[i]
    if (!item) continue

    // Evaluate before position if not cached
    if (!prevEval) {
      prevEval = await runStockfishAnalysis(item.beforeFen, { depth: 12, timeoutMs: 3000 })
    }

    // Evaluate position after move
    const afterEval = await runStockfishAnalysis(item.afterFen, { depth: 12, timeoutMs: 3000 })

    // Classify move
    const classification = classifyMove(prevEval, afterEval, item.turn)

    // Track stats
    if (item.turn === 'w') {
      whiteStats[classification] = (whiteStats[classification] || 0) + 1
      const cpl = Math.max(0, prevEval.score.value - (-afterEval.score.value))
      whiteCpls.push(cpl)
    } else {
      blackStats[classification] = (blackStats[classification] || 0) + 1
      const cpl = Math.max(0, prevEval.score.value - (-afterEval.score.value))
      blackCpls.push(cpl)
    }

    evaluatedMoves.push({
      index: i,
      moveNumber: item.moveNumber,
      turn: item.turn,
      san: item.san,
      eval: afterEval,
      classification
    })

    // Advance
    prevEval = afterEval
  }

  // Calculate Chess.com style accuracy formula: 100 * exp(-0.004 * avgCpl)
  const avgWhiteCpl = whiteCpls.length > 0 ? whiteCpls.reduce((a, b) => a + b, 0) / whiteCpls.length : 0
  const avgBlackCpl = blackCpls.length > 0 ? blackCpls.reduce((a, b) => a + b, 0) / blackCpls.length : 0

  const whiteAccuracy = Math.round(Math.max(20, Math.min(100, 100 * Math.exp(-0.0035 * avgWhiteCpl))) * 10) / 10
  const blackAccuracy = Math.round(Math.max(20, Math.min(100, 100 * Math.exp(-0.0035 * avgBlackCpl))) * 10) / 10

  return {
    moves: evaluatedMoves,
    whiteAccuracy,
    blackAccuracy,
    stats: {
      white: whiteStats,
      black: blackStats
    }
  }
})
