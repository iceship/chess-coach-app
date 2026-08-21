import { spawn } from 'node:child_process'
import { Chess } from 'chess.js'
import type { ChessColor, MoveClassification, StockfishEvalResult, StockfishScore } from '~~/shared/types/chess'

const DEFAULT_STOCKFISH_PATH = process.env.STOCKFISH_PATH || '/opt/homebrew/bin/stockfish'

export interface AnalyzeOptions {
  depth?: number
  timeoutMs?: number
  stockfishPath?: string
  threads?: number
}

/**
 * Executes Stockfish engine via UCI protocol to analyze a chess position (FEN).
 */
export async function runStockfishAnalysis(
  fen: string,
  options: AnalyzeOptions = {}
): Promise<StockfishEvalResult> {
  const depth = options.depth ?? 15
  const timeoutMs = options.timeoutMs ?? 7000
  const stockfishPath = options.stockfishPath ?? DEFAULT_STOCKFISH_PATH
  const threads = options.threads ?? 2

  return new Promise((resolve, reject) => {
    let resolved = false
    let sfProcess: ReturnType<typeof spawn> | null = null

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        if (sfProcess) {
          try {
            sfProcess.stdin?.write('quit\n')
            sfProcess.kill('SIGKILL')
          } catch {
            // ignore cleanup errors
          }
        }
        reject(new Error(`Stockfish analysis timed out after ${timeoutMs}ms`))
      }
    }, timeoutMs)

    try {
      sfProcess = spawn(stockfishPath, {
        stdio: ['pipe', 'pipe', 'pipe']
      })
    } catch (err) {
      clearTimeout(timer)
      return reject(new Error(`Failed to spawn Stockfish at "${stockfishPath}": ${err}`))
    }

    let bestmove = ''
    let score: StockfishScore = { type: 'cp', value: 0 }
    let pv = ''
    let finalDepth = 0
    let nodes = 0
    let timeMs = 0

    let stdoutBuffer = ''

    sfProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() || '' // keep partial line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Parse depth
        const depthMatch = trimmed.match(/\bdepth (\d+)\b/)
        if (depthMatch && depthMatch[1]) {
          finalDepth = parseInt(depthMatch[1], 10)
        }

        // Parse score
        if (trimmed.includes('score cp ')) {
          const cpMatch = trimmed.match(/\bscore cp (-?\d+)\b/)
          if (cpMatch && cpMatch[1]) {
            score = { type: 'cp', value: parseInt(cpMatch[1], 10) }
          }
        } else if (trimmed.includes('score mate ')) {
          const mateMatch = trimmed.match(/\bscore mate (-?\d+)\b/)
          if (mateMatch && mateMatch[1]) {
            score = { type: 'mate', value: parseInt(mateMatch[1], 10) }
          }
        }

        // Parse nodes & time
        const nodesMatch = trimmed.match(/\bnodes (\d+)\b/)
        if (nodesMatch && nodesMatch[1]) {
          nodes = parseInt(nodesMatch[1], 10)
        }
        const timeMatch = trimmed.match(/\btime (\d+)\b/)
        if (timeMatch && timeMatch[1]) {
          timeMs = parseInt(timeMatch[1], 10)
        }

        // Parse pv
        const pvMatch = trimmed.match(/\bpv (.+)$/)
        if (pvMatch && pvMatch[1]) {
          pv = pvMatch[1].trim()
        }

        // Parse bestmove (terminal signal for search)
        if (trimmed.startsWith('bestmove')) {
          const bestMoveMatch = trimmed.match(/^bestmove\s+(\S+)/)
          if (bestMoveMatch && bestMoveMatch[1]) {
            bestmove = bestMoveMatch[1]
          }

          if (!resolved) {
            resolved = true
            clearTimeout(timer)

            try {
              sfProcess?.stdin?.write('quit\n')
              sfProcess?.kill()
            } catch {
              // ignore
            }

            // Determine turn from FEN
            const fenParts = fen.trim().split(' ')
            const turn = (fenParts[1] || 'w') as ChessColor

            // Calculate white perspective score
            let whiteScoreCp = 0
            if (score.type === 'cp') {
              whiteScoreCp = turn === 'w' ? score.value : -score.value
            } else {
              // mate score: huge positive or negative
              const mateCp = 10000 - Math.abs(score.value) * 100
              whiteScoreCp = score.value > 0
                ? (turn === 'w' ? mateCp : -mateCp)
                : (turn === 'w' ? -mateCp : mateCp)
            }

            // Winning chance calculation: standard sigmoid formula
            const winChance = Math.round(
              Math.min(100, Math.max(0, 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * whiteScoreCp)) - 1)))
            )

            // Format score string
            let scoreFormatted = '0.0'
            if (score.type === 'cp') {
              const sign = whiteScoreCp > 0 ? '+' : ''
              scoreFormatted = `${sign}${(whiteScoreCp / 100).toFixed(1)}`
            } else {
              const mateSign = score.value > 0 ? '+' : '-'
              scoreFormatted = `${mateSign}M${Math.abs(score.value)}`
            }

            const pvMoves = pv ? pv.split(/\s+/).filter(Boolean) : []
            const bestmoveSan = bestmove ? convertUciToSan(fen, bestmove) : undefined

            resolve({
              score,
              scoreFormatted,
              whiteScoreCp,
              winChance,
              bestmove,
              bestmoveSan,
              pv,
              pvMoves,
              depth: finalDepth || depth,
              nodes,
              timeMs
            })
          }
          return
        }
      }
    })

    sfProcess.stderr?.on('data', (errData: Buffer) => {
      console.warn('[Stockfish stderr]:', errData.toString())
    })

    sfProcess.on('error', (err) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        reject(err)
      }
    })

    // Send UCI commands
    try {
      sfProcess.stdin?.write('uci\n')
      sfProcess.stdin?.write(`setoption name Threads value ${threads}\n`)
      sfProcess.stdin?.write('isready\n')
      sfProcess.stdin?.write(`position fen ${fen}\n`)
      sfProcess.stdin?.write(`go depth ${depth}\n`)
    } catch (writeErr) {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        reject(writeErr)
      }
    }
  })
}

/**
 * Converts a UCI move (e.g. "e2e4", "g8f6", "e7e8q") into Standard Algebraic Notation (SAN).
 */
export function convertUciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return uci
  try {
    const chess = new Chess(fen)
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined
    const move = chess.move({ from, to, promotion })
    return move ? move.san : uci
  } catch {
    return uci
  }
}

/**
 * Converts a string of UCI moves in PV into SAN formatted move sequence.
 */
export function convertPvToSan(fen: string, pvUci: string): string {
  if (!pvUci) return ''
  try {
    const chess = new Chess(fen)
    const uciMoves = pvUci.split(/\s+/).filter(Boolean)
    const sanMoves: string[] = []

    for (const uci of uciMoves) {
      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined
      const move = chess.move({ from, to, promotion })
      if (!move) break
      sanMoves.push(move.san)
    }

    return sanMoves.join(' ')
  } catch {
    return pvUci
  }
}

/**
 * Classifies a move by comparing evaluation before and after the move.
 */
export function classifyMove(
  beforeEval: StockfishEvalResult,
  afterEval: StockfishEvalResult,
  turn: ChessColor
): MoveClassification {
  // Evaluation before move from player's perspective
  const beforePlayerCp = beforeEval.score.type === 'mate'
    ? (beforeEval.score.value > 0 ? 10000 : -10000)
    : beforeEval.score.value

  // Evaluation after move from opponent's perspective is afterEval.score
  // So from player's perspective, afterPlayerCp is -afterEval.score.value
  const afterPlayerCp = afterEval.score.type === 'mate'
    ? (afterEval.score.value > 0 ? -10000 : 10000)
    : -afterEval.score.value

  const cpLoss = beforePlayerCp - afterPlayerCp

  // Check mate situations
  if (beforeEval.score.type === 'mate' && beforeEval.score.value > 0 && afterEval.score.type !== 'mate') {
    return 'missed_win'
  }

  if (cpLoss <= 15) return 'best'
  if (cpLoss <= 40) return 'excellent'
  if (cpLoss <= 85) return 'good'
  if (cpLoss <= 180) return 'inaccuracy'
  if (cpLoss <= 300) return 'mistake'
  return 'blunder'
}
