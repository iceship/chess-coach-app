import { spawn } from 'node:child_process'
import { Chess } from 'chess.js'
import type {
  ChessColor,
  EngineLine,
  MoveClassification,
  PvMoveItem,
  StockfishEvalResult,
  StockfishScore
} from '~~/shared/types/chess'

const DEFAULT_STOCKFISH_PATH = process.env.STOCKFISH_PATH || '/opt/homebrew/bin/stockfish'

export interface AnalyzeOptions {
  depth?: number
  multipv?: number
  movetimeMs?: number
  timeoutMs?: number
  stockfishPath?: string
  threads?: number
  hashMb?: number
}

/**
 * Parses UCI moves into structured SAN nodes and formatted SAN sequence.
 */
export function parsePvToNodes(fen: string, pvUci: string): { pvSan: string, pvNodes: PvMoveItem[] } {
  if (!pvUci) return { pvSan: '', pvNodes: [] }
  try {
    const replay = new Chess(fen)
    const uciMoves = pvUci.split(/\s+/).filter(Boolean)
    const nodes: PvMoveItem[] = []
    const sanParts: string[] = []

    for (let i = 0; i < uciMoves.length; i++) {
      const uci = uciMoves[i]
      if (!uci || uci.length < 4) break

      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined

      const moveColor = replay.turn() as ChessColor
      const moveNumber = replay.moveNumber()

      const move = replay.move({ from, to, promotion })
      if (!move) break

      nodes.push({
        san: move.san,
        uci,
        moveNumber,
        turn: moveColor
      })

      if (i === 0) {
        sanParts.push(`${moveNumber}${moveColor === 'b' ? '...' : '.'} ${move.san}`)
      } else if (moveColor === 'w') {
        sanParts.push(`${moveNumber}. ${move.san}`)
      } else {
        sanParts.push(move.san)
      }
    }

    return {
      pvSan: sanParts.join(' '),
      pvNodes: nodes
    }
  } catch {
    return { pvSan: pvUci, pvNodes: [] }
  }
}

/**
 * Calculates winning chance percentage from white's perspective (0 to 100).
 */
export function calcWinChance(whiteScoreCp: number): number {
  return Math.round(
    Math.min(100, Math.max(0, 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * whiteScoreCp)) - 1)))
  )
}

/**
 * Formats centipawn / mate score into readable string (+9.09, -2.34, M3).
 */
export function formatScore(whiteScoreCp: number, score: StockfishScore): string {
  if (score.type === 'cp') {
    const sign = whiteScoreCp > 0 ? '+' : ''
    return `${sign}${(whiteScoreCp / 100).toFixed(2)}`
  }
  const mateSign = score.value > 0 ? '+' : '-'
  return `${mateSign}M${Math.abs(score.value)}`
}

/**
 * Executes Stockfish engine via UCI protocol with MultiPV support.
 */
export async function runStockfishAnalysis(
  fen: string,
  options: AnalyzeOptions = {}
): Promise<StockfishEvalResult> {
  const depth = options.depth ?? 16
  const multipv = Math.max(1, options.multipv ?? 2)
  const timeoutMs = options.timeoutMs ?? 10000
  const stockfishPath = options.stockfishPath ?? DEFAULT_STOCKFISH_PATH
  const threads = options.threads ?? 4
  const hashMb = options.hashMb ?? 64

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
            // ignore
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

    const fenParts = fen.trim().split(' ')
    const turn = (fenParts[1] || 'w') as ChessColor

    const lineMap = new Map<number, {
      multipv: number
      score: StockfishScore
      depth: number
      nodes: number
      pv: string
    }>()

    let bestmove = ''
    let totalNodes = 0
    let timeMs = 0
    let stdoutBuffer = ''

    sfProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Match info depth ... multipv X score ... pv ...
        if (trimmed.startsWith('info ') && trimmed.includes(' score ') && trimmed.includes(' pv ')) {
          const depthMatch = trimmed.match(/\bdepth (\d+)\b/)
          const lineDepth = depthMatch && depthMatch[1] ? parseInt(depthMatch[1], 10) : depth

          const multipvMatch = trimmed.match(/\bmultipv (\d+)\b/)
          const pvIndex = multipvMatch && multipvMatch[1] ? parseInt(multipvMatch[1], 10) : 1

          const nodesMatch = trimmed.match(/\bnodes (\d+)\b/)
          if (nodesMatch && nodesMatch[1]) {
            totalNodes = parseInt(nodesMatch[1], 10)
          }

          const timeMatch = trimmed.match(/\btime (\d+)\b/)
          if (timeMatch && timeMatch[1]) {
            timeMs = parseInt(timeMatch[1], 10)
          }

          let lineScore: StockfishScore = { type: 'cp', value: 0 }
          const cpMatch = trimmed.match(/\bscore cp (-?\d+)\b/)
          if (cpMatch && cpMatch[1]) {
            lineScore = { type: 'cp', value: parseInt(cpMatch[1], 10) }
          } else {
            const mateMatch = trimmed.match(/\bscore mate (-?\d+)\b/)
            if (mateMatch && mateMatch[1]) {
              lineScore = { type: 'mate', value: parseInt(mateMatch[1], 10) }
            }
          }

          const pvMatch = trimmed.match(/\bpv (.+)$/)
          const pvString = pvMatch && pvMatch[1] ? pvMatch[1].trim() : ''

          lineMap.set(pvIndex, {
            multipv: pvIndex,
            score: lineScore,
            depth: lineDepth,
            nodes: totalNodes,
            pv: pvString
          })
        }

        // Search completed
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

            // Convert all parsed MultiPV lines
            const sortedLines: EngineLine[] = []
            for (let i = 1; i <= multipv; i++) {
              const rawLine = lineMap.get(i)
              if (!rawLine || !rawLine.pv) continue

              let whiteCp: number
              if (rawLine.score.type === 'cp') {
                whiteCp = turn === 'w' ? rawLine.score.value : -rawLine.score.value
              } else {
                const mateCp = 10000 - Math.abs(rawLine.score.value) * 100
                whiteCp = rawLine.score.value > 0
                  ? (turn === 'w' ? mateCp : -mateCp)
                  : (turn === 'w' ? -mateCp : mateCp)
              }

              const winChance = calcWinChance(whiteCp)
              const scoreFormatted = formatScore(whiteCp, rawLine.score)

              const { pvSan, pvNodes } = parsePvToNodes(fen, rawLine.pv)
              const firstMoveUci = rawLine.pv.split(' ')[0] || ''
              const firstMoveSan = pvNodes[0]?.san || convertUciToSan(fen, firstMoveUci)

              sortedLines.push({
                multipv: i,
                score: rawLine.score,
                scoreFormatted,
                whiteScoreCp: whiteCp,
                winChance,
                bestmove: firstMoveUci,
                bestmoveSan: firstMoveSan,
                pvUci: rawLine.pv,
                pvSan,
                pvNodes,
                depth: rawLine.depth,
                nodes: rawLine.nodes
              })
            }

            const primaryLine = sortedLines[0]
            const finalScore = primaryLine?.score || { type: 'cp', value: 0 }
            const finalWhiteCp = primaryLine?.whiteScoreCp ?? 0
            const finalWinChance = primaryLine?.winChance ?? 50
            const finalScoreFormatted = primaryLine?.scoreFormatted ?? '0.00'
            const finalPv = primaryLine?.pvUci ?? ''
            const finalPvSan = primaryLine?.pvSan ?? ''
            const finalBestmove = bestmove || primaryLine?.bestmove || ''
            const finalBestmoveSan = primaryLine?.bestmoveSan || convertUciToSan(fen, finalBestmove)

            resolve({
              score: finalScore,
              scoreFormatted: finalScoreFormatted,
              whiteScoreCp: finalWhiteCp,
              winChance: finalWinChance,
              bestmove: finalBestmove,
              bestmoveSan: finalBestmoveSan,
              pv: finalPv,
              pvSan: finalPvSan,
              pvMoves: finalPv.split(/\s+/).filter(Boolean),
              depth: primaryLine?.depth || depth,
              nodes: totalNodes,
              timeMs,
              lines: sortedLines
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

    // Send UCI setup & go command
    try {
      sfProcess.stdin?.write('uci\n')
      sfProcess.stdin?.write(`setoption name Threads value ${threads}\n`)
      sfProcess.stdin?.write(`setoption name Hash value ${hashMb}\n`)
      sfProcess.stdin?.write(`setoption name MultiPV value ${multipv}\n`)
      sfProcess.stdin?.write('isready\n')
      sfProcess.stdin?.write(`position fen ${fen}\n`)
      if (options.movetimeMs) {
        sfProcess.stdin?.write(`go movetime ${options.movetimeMs}\n`)
      } else {
        sfProcess.stdin?.write(`go depth ${depth}\n`)
      }
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
  const { pvSan } = parsePvToNodes(fen, pvUci)
  return pvSan
}

/**
 * Classifies a move by comparing evaluation before and after the move.
 */
export function classifyMove(
  beforeEval: StockfishEvalResult,
  afterEval: StockfishEvalResult,
  _turn?: ChessColor
): MoveClassification {
  const beforePlayerCp = beforeEval.score.type === 'mate'
    ? (beforeEval.score.value > 0 ? 10000 : -10000)
    : beforeEval.score.value

  const afterPlayerCp = afterEval.score.type === 'mate'
    ? (afterEval.score.value > 0 ? -10000 : 10000)
    : -afterEval.score.value

  const cpLoss = beforePlayerCp - afterPlayerCp

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
