/**
 * Shared chess types and data structures
 */

export type ChessColor = 'w' | 'b'
export type BoardOrientation = 'white' | 'black'

export type MoveClassification =
  | 'brilliant'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win'

export interface StockfishScore {
  type: 'cp' | 'mate'
  value: number // cp in centipawns (from side to move's perspective or white's perspective)
}

export interface StockfishEvalResult {
  score: StockfishScore
  scoreFormatted: string // e.g. "+1.5", "-0.8", "M3", "-M2"
  whiteScoreCp?: number // centipawn evaluation from white's perspective
  winChance: number // winning chance percentage (0 - 100) for white or side to move
  bestmove: string // UCI format e.g. "e2e4", "g1f3"
  bestmoveSan?: string // SAN format e.g. "e4", "Nf3"
  pv: string // full principal variation
  pvMoves?: string[] // array of UCI moves in pv
  depth: number
  nodes?: number
  timeMs?: number
}

export interface PlayedMoveInfo {
  san: string
  uci: string
  from: string
  to: string
  piece: string
  captured?: string
  promotion?: string
  turn: ChessColor
  moveNumber: number
  beforeFen: string
  afterFen: string
  eval?: StockfishEvalResult
  classification?: MoveClassification
}

export interface MoveHistoryItem {
  index: number
  moveNumber: number
  turn: ChessColor
  san: string
  uci: string
  from: string
  to: string
  piece: string
  captured?: string
  promotion?: string
  beforeFen: string
  afterFen: string
  eval?: StockfishEvalResult
  classification?: MoveClassification
}

export interface ChessGameHeaders {
  white?: string
  black?: string
  whiteElo?: string
  blackElo?: string
  event?: string
  site?: string
  date?: string
  result?: string
  eco?: string
  termination?: string
  timeControl?: string
}

export interface EngineSummaryData {
  eval: StockfishEvalResult
  classification?: MoveClassification
  beforeEval?: StockfishEvalResult
  playedMoveSan?: string
  bestMoveSan?: string
  pvSan?: string
  turn: ChessColor
}

export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  boardContext?: {
    fen: string
    playedMove?: PlayedMoveInfo | null
    moveNumber?: number
    turn?: ChessColor
  }
  engineSummary?: EngineSummaryData
  createdAt: string
  streaming?: boolean
}

export interface AnalyzeRequestBody {
  fen: string
  playedMove?: {
    san?: string
    uci?: string
    from?: string
    to?: string
    piece?: string
    turn?: ChessColor
    moveNumber?: number
    beforeFen?: string
    afterFen?: string
  }
  userQuestion: string
  history?: Array<{
    moveNumber: number
    turn: ChessColor
    san: string
  }>
  pgn?: string
  orientation?: BoardOrientation
}
