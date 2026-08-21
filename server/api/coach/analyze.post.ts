import { z } from 'zod'
import type { ChessColor, EngineSummaryData, MoveClassification, StockfishEvalResult } from '~~/shared/types/chess'

const requestSchema = z.object({
  fen: z.string(),
  playedMove: z.object({
    san: z.string().optional(),
    uci: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    piece: z.string().optional(),
    turn: z.enum(['w', 'b']).optional(),
    moveNumber: z.number().optional(),
    beforeFen: z.string().optional(),
    afterFen: z.string().optional()
  }).optional(),
  userQuestion: z.string().default('이 수의 의도와 국면을 분석해 줘.'),
  history: z.array(z.object({
    moveNumber: z.number(),
    turn: z.enum(['w', 'b']),
    san: z.string()
  })).optional(),
  pgn: z.string().optional(),
  stream: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, requestSchema.parse)
  const { fen, playedMove, userQuestion, history } = body

  const fenParts = fen.trim().split(' ')
  const turn = (fenParts[1] || 'w') as ChessColor

  // 1. Run Stockfish evaluation on current position
  let currentEval: StockfishEvalResult
  try {
    currentEval = await runStockfishAnalysis(fen, { depth: 15, timeoutMs: 6000 })
  } catch (err: any) {
    console.error('Stockfish analysis error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `Stockfish engine error: ${err.message || 'Analysis failed'}`
    })
  }

  // 2. Evaluate before position if playedMove has beforeFen for accurate move classification
  let beforeEval: StockfishEvalResult | undefined
  let classification: MoveClassification | undefined

  if (playedMove?.beforeFen && playedMove.beforeFen !== fen) {
    try {
      beforeEval = await runStockfishAnalysis(playedMove.beforeFen, { depth: 14, timeoutMs: 5000 })
      const moveTurn = (playedMove.turn || (turn === 'w' ? 'b' : 'w')) as ChessColor
      classification = classifyMove(beforeEval, currentEval, moveTurn)
    } catch (err) {
      console.warn('Could not evaluate beforeFen for move classification:', err)
    }
  }

  // 3. Convert best move and PV to SAN
  const bestMoveSan = currentEval.bestmove ? convertUciToSan(fen, currentEval.bestmove) : undefined
  const pvSan = currentEval.pv ? convertPvToSan(fen, currentEval.pv) : undefined

  const engineSummary: EngineSummaryData = {
    eval: currentEval,
    classification,
    beforeEval,
    playedMoveSan: playedMove?.san,
    bestMoveSan,
    pvSan,
    turn
  }

  // 4. Format history
  let historyFormatted = ''
  if (history && history.length > 0) {
    const recentMoves = history.slice(-10)
    historyFormatted = recentMoves.map(m => `${m.turn === 'w' ? `${m.moveNumber}. ` : ''}${m.san}`).join(' ')
  }

  // 5. Build Coach prompt
  const { systemInstructions, promptContent } = buildCoachPrompt({
    fen,
    userQuestion,
    playedMove,
    engineSummary,
    historyFormatted
  })

  // If streaming is not requested, return complete JSON
  if (!body.stream) {
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'gemma4:e4b-mlx',
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: promptContent }
          ],
          stream: false
        })
      })

      const json = await ollamaResponse.json()
      return {
        engineSummary,
        coachExplanation: json.message?.content || ''
      }
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `AI Coach generation error: ${err.message}`
      })
    }
  }

  // 6. Set up SSE stream
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const encoder = new TextEncoder()
  const abortController = new AbortController()
  event.node.req.on('close', () => abortController.abort())

  const stream = new ReadableStream({
    async start(controller) {
      // Step A: Send engine data immediately
      const initialPayload = `event: engine\ndata: ${JSON.stringify(engineSummary)}\n\n`
      controller.enqueue(encoder.encode(initialPayload))

      // Step B: Query Ollama and stream chunks
      try {
        const ollamaStream = await streamOllamaChat(
          [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: promptContent }
          ],
          {
            signal: abortController.signal
          }
        )

        const reader = ollamaStream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            try {
              const parsed = JSON.parse(trimmed)
              const chunkText = parsed.message?.content || ''
              if (chunkText) {
                const sseChunk = `event: chunk\ndata: ${JSON.stringify({ text: chunkText })}\n\n`
                controller.enqueue(encoder.encode(sseChunk))
              }

              if (parsed.done) {
                const doneEvent = `event: done\ndata: {}\n\n`
                controller.enqueue(encoder.encode(doneEvent))
                controller.close()
                return
              }
            } catch {
              // ignore malformed JSON chunk
            }
          }
        }

        // Send final done event if not closed yet
        const doneEvent = `event: done\ndata: {}\n\n`
        controller.enqueue(encoder.encode(doneEvent))
        controller.close()
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          const errEvent = `event: error\ndata: ${JSON.stringify({ message: err.message || 'Stream error' })}\n\n`
          controller.enqueue(encoder.encode(errEvent))
          controller.close()
        }
      }
    }
  })

  return stream
})
