import { Chess } from 'chess.js'
import type { Key } from '@lichess-org/chessground/types'
import type {
  BoardOrientation,
  ChessColor,
  ChessGameHeaders,
  EngineLine,
  MoveClassification,
  MoveHistoryItem,
  PlayedMoveInfo,
  StockfishEvalResult
} from '~~/shared/types/chess'

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const DEFAULT_CHESSCOM_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.21"]
[Round "-"]
[White "White"]
[Black "Black"]
[Result "1-0"]
[CurrentPosition "r2q1rk1/1Qp1pp1p/p5p1/1p6/8/1BNP3P/P1P2PP1/R4RK1 b - - 0 16"]
[Timezone "UTC"]
[ECO "B07"]
[WhiteElo "727"]
[BlackElo "700"]
[TimeControl "180+2"]
[Termination "White won by resignation"]

1. e4 {[%clk 0:03:01][%timestamp 10]} 1... d6 {[%clk 0:03:00.2][%timestamp 18]}
2. Qf3 $6 {[%clk 0:03:00.9][%timestamp 21][%c_effect
f3;square;f3;type;Inaccuracy;persistent;true]} 2... Nf6 {[%clk
0:03:01.1][%timestamp 11]} 3. Bc4 {[%clk 0:03:01.3][%timestamp 16]} 3... g6
{[%clk 0:03:01.6][%timestamp 15]} 4. h3 {[%clk 0:03:01.6][%timestamp 17]} 4...
Bg7 {[%clk 0:03:02.8][%timestamp 8]} 5. d3 {[%clk 0:03:02.3][%timestamp 13]}
5... O-O {[%clk 0:03:03.3][%timestamp 15]} 6. Nc3 {[%clk 0:03:02.6][%timestamp
17]} 6... a6 {[%clk 0:02:47.5][%timestamp 178]} 7. Nge2 {[%clk
0:03:02.8][%timestamp 18]} 7... b5 $2 {[%clk 0:02:48.1][%timestamp 14][%c_effect
b5;square;b5;type;Mistake;persistent;true]} 8. Bb3 $9 {[%clk
0:03:02.9][%timestamp 19]} 8... Bb7 {[%clk 0:02:45.1][%timestamp 50]} 9. Bg5
{[%clk 0:03:00.6][%timestamp 43]} 9... d5 $2 {[%clk 0:02:32.3][%timestamp
148][%c_effect d5;square;d5;type;Mistake;persistent;true]} 10. e5 {[%clk
0:03:00.5][%timestamp 21]} 10... d4 $4 {[%clk 0:02:28.3][%timestamp 60][%c_effect
d4;square;d4;type;Blunder;persistent;true]} 11. Qxb7 $1 {[%clk
0:02:54.3][%timestamp 82][%c_effect
b7;square;b7;type;GreatFind;persistent;true]} 11... dxc3 {[%clk
0:02:16.1][%timestamp 142]} 12. bxc3 {[%clk 0:02:45.4][%timestamp 109]} 12...
Nbd7 {[%clk 0:02:10][%timestamp 81]} 13. Bxf6 $9 {[%clk 0:02:44.2][%timestamp
32]} 13... Nxf6 $9 {[%clk 0:02:07.4][%timestamp 46]} 14. exf6 {[%clk
0:02:44.9][%timestamp 13]} 14... Bxf6 {[%clk 0:02:09.1][%timestamp 3]} 15. O-O
{[%clk 0:02:42.9][%timestamp 40]} 15... Bxc3 $2 {[%clk 0:02:09.5][%timestamp
16][%c_effect
c3;square;c3;type;Mistake;size;100%25;animated;false;persistent;true]} 16. Nxc3
{[%clk 0:02:43.4][%c_effect
g1;square;g1;type;Winner;animated;true,g8;square;g8;type;ResignBlack;animated;true][%timestamp
15]} 1-0`

export interface ChessArrowShape {
  orig: Key
  dest: Key
  brush: string
}

export interface ReviewStats {
  whiteAccuracy: number
  blackAccuracy: number
  stats: {
    white: Record<MoveClassification, number>
    black: Record<MoveClassification, number>
  }
}

/**
 * Extracts NAG annotations ($1, $2, $4, $6, $9) and Chess.com effect comments from PGN.
 */
function extractMoveAnnotations(pgnText: string): Map<number, MoveClassification> {
  const body = pgnText.replace(/\[[^\]]*\]/g, ' ')
  const tokens = body.match(/\{[^}]*\}|\$[0-9]+|\d+\.+|[a-zA-Z0-9+=#-]+/g) || []
  const map = new Map<number, MoveClassification>()
  let moveIdx = -1

  for (const token of tokens) {
    if (/^\d+\.+$/.test(token)) continue
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue

    if (token.startsWith('$')) {
      if (moveIdx >= 0 && !map.has(moveIdx)) {
        if (token === '$1') map.set(moveIdx, 'best')
        else if (token === '$2') map.set(moveIdx, 'mistake')
        else if (token === '$3') map.set(moveIdx, 'brilliant')
        else if (token === '$4') map.set(moveIdx, 'blunder')
        else if (token === '$6') map.set(moveIdx, 'inaccuracy')
        else if (token === '$9') map.set(moveIdx, 'missed_win')
      }
      continue
    }

    if (token.startsWith('{')) {
      if (moveIdx >= 0 && token.includes('type;')) {
        const typeMatch = token.match(/type;([a-zA-Z0-9]+)/)
        if (typeMatch && typeMatch[1]) {
          const t = typeMatch[1].toLowerCase()
          if (t.includes('blunder')) map.set(moveIdx, 'blunder')
          else if (t.includes('mistake')) map.set(moveIdx, 'mistake')
          else if (t.includes('inaccuracy')) map.set(moveIdx, 'inaccuracy')
          else if (t.includes('great')) map.set(moveIdx, 'best')
          else if (t.includes('brilliant')) map.set(moveIdx, 'brilliant')
          else if (t.includes('miss')) map.set(moveIdx, 'missed_win')
        }
      }
      continue
    }

    // It is a move SAN
    moveIdx++
  }

  return map
}

export function useChessGame() {
  const chess = shallowRef(new Chess())
  const fen = ref(DEFAULT_FEN)
  const orientation = ref<BoardOrientation>('white')
  const history = ref<MoveHistoryItem[]>([])
  const currentMoveIndex = ref<number>(-1)
  const headers = ref<ChessGameHeaders>({})
  const engineEval = ref<StockfishEvalResult | null>(null)
  const multipv = ref(2)
  const isEngineEvaluating = ref(false)
  const autoEvaluate = ref(true)
  const isAnalyzing = ref(false)
  const isReviewing = ref(false)
  const reviewStats = ref<ReviewStats | null>(null)
  const bestMoveArrow = ref<ChessArrowShape | null>(null)
  const hoverArrow = ref<ChessArrowShape | null>(null)

  const { csrf, headerName } = useCsrf()

  const turn = computed<ChessColor>(() => {
    const parts = fen.value.trim().split(' ')
    return (parts[1] || 'w') as ChessColor
  })

  const isCheck = computed(() => chess.value.inCheck())
  const isCheckmate = computed(() => chess.value.isCheckmate())
  const isDraw = computed(() => chess.value.isDraw())
  const isGameOver = computed(() => chess.value.isGameOver())

  const arrows = computed<ChessArrowShape[]>(() => {
    const list: ChessArrowShape[] = []
    if (hoverArrow.value) {
      list.push(hoverArrow.value)
    } else if (bestMoveArrow.value) {
      list.push(bestMoveArrow.value)
    }
    return list
  })

  const evalLines = computed<EngineLine[]>(() => {
    return engineEval.value?.lines || []
  })

  const playedMove = computed<PlayedMoveInfo | null>(() => {
    if (currentMoveIndex.value < 0 || currentMoveIndex.value >= history.value.length) {
      return null
    }
    const item = history.value[currentMoveIndex.value]
    if (!item) return null

    return {
      san: item.san,
      uci: item.uci,
      from: item.from,
      to: item.to,
      piece: item.piece,
      captured: item.captured,
      promotion: item.promotion,
      turn: item.turn,
      moveNumber: item.moveNumber,
      beforeFen: item.beforeFen,
      afterFen: item.afterFen,
      eval: item.eval,
      classification: item.classification
    }
  })

  /**
   * Generates a legal move destination map for Chessground
   */
  function getDests(): Map<Key, Key[]> {
    const dests = new Map<Key, Key[]>()
    const moves = chess.value.moves({ verbose: true })
    for (const move of moves) {
      const from = move.from as Key
      const to = move.to as Key
      if (!dests.has(from)) {
        dests.set(from, [])
      }
      dests.get(from)!.push(to)
    }
    return dests
  }

  /**
   * Makes a move on the board (via drag-and-drop or programmatic input)
   */
  function makeMove(moveObj: { from: string, to: string, promotion?: string }): boolean {
    try {
      const beforeFen = chess.value.fen()
      const moveResult = chess.value.move({
        from: moveObj.from,
        to: moveObj.to,
        promotion: moveObj.promotion || 'q'
      })

      if (!moveResult) return false

      const afterFen = chess.value.fen()
      fen.value = afterFen

      // Determine move number
      const moveCount = chess.value.moveNumber()
      const moveTurn: ChessColor = moveResult.color

      const historyItem: MoveHistoryItem = {
        index: history.value.length,
        moveNumber: moveTurn === 'w' ? moveCount : moveCount - 1,
        turn: moveTurn,
        san: moveResult.san,
        uci: `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`,
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        captured: moveResult.captured,
        promotion: moveResult.promotion,
        beforeFen,
        afterFen
      }

      // If user moved from an earlier point in history, truncate remaining moves
      if (currentMoveIndex.value < history.value.length - 1) {
        history.value = history.value.slice(0, currentMoveIndex.value + 1)
      }

      history.value.push(historyItem)
      currentMoveIndex.value = history.value.length - 1

      // Reset arrows
      bestMoveArrow.value = null
      hoverArrow.value = null

      return true
    } catch (err) {
      console.warn('Illegal or invalid move:', err)
      return false
    }
  }

  /**
   * Loads a PGN string into the game, extracts metadata headers, and parses all moves
   */
  function loadPgn(pgnString: string): { success: boolean, error?: string } {
    try {
      const tempChess = new Chess()
      tempChess.loadPgn(pgnString)

      // Extract PGN header tags
      const rawHeader = tempChess.header() as Record<string, string | null>
      headers.value = {
        white: rawHeader.White || undefined,
        black: rawHeader.Black || undefined,
        whiteElo: rawHeader.WhiteElo || undefined,
        blackElo: rawHeader.BlackElo || undefined,
        event: rawHeader.Event || undefined,
        site: rawHeader.Site || undefined,
        date: rawHeader.Date || undefined,
        result: rawHeader.Result || undefined,
        eco: rawHeader.ECO || undefined,
        termination: rawHeader.Termination || undefined,
        timeControl: rawHeader.TimeControl || undefined
      }

      // Extract classifications from PGN annotations / NAGs
      const annotationMap = extractMoveAnnotations(pgnString)

      const verboseHistory = tempChess.history({ verbose: true })
      const parsedItems: MoveHistoryItem[] = []

      const replayChess = new Chess()

      for (let i = 0; i < verboseHistory.length; i++) {
        const move = verboseHistory[i]
        if (!move) continue

        const before = replayChess.fen()
        replayChess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        })
        const after = replayChess.fen()

        const moveTurn: ChessColor = move.color
        const fullMoveNumber = Math.floor(i / 2) + 1

        parsedItems.push({
          index: i,
          moveNumber: fullMoveNumber,
          turn: moveTurn,
          san: move.san,
          uci: `${move.from}${move.to}${move.promotion || ''}`,
          from: move.from,
          to: move.to,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          beforeFen: before,
          afterFen: after,
          classification: annotationMap.get(i)
        })
      }

      history.value = parsedItems
      reviewStats.value = null
      goToEnd()
      return { success: true }
    } catch (err: unknown) {
      console.error('Failed to load PGN:', err)
      const message = err instanceof Error ? err.message : 'Invalid PGN format'
      return { success: false, error: message }
    }
  }

  /**
   * Loads a FEN string directly
   */
  function loadFen(fenString: string): boolean {
    try {
      chess.value = new Chess(fenString)
      fen.value = fenString
      history.value = []
      headers.value = {}
      reviewStats.value = null
      currentMoveIndex.value = -1
      bestMoveArrow.value = null
      hoverArrow.value = null
      return true
    } catch (err) {
      console.error('Invalid FEN:', err)
      return false
    }
  }

  /**
   * Resets board to initial game position
   */
  function resetGame() {
    chess.value = new Chess()
    fen.value = DEFAULT_FEN
    history.value = []
    headers.value = {}
    reviewStats.value = null
    currentMoveIndex.value = -1
    bestMoveArrow.value = null
    hoverArrow.value = null
    engineEval.value = null
  }

  /**
   * Toggles board orientation between White and Black
   */
  function flipBoard() {
    orientation.value = orientation.value === 'white' ? 'black' : 'white'
  }

  /**
   * Navigates to a specific move index in history (-1 = start position)
   */
  function goToMove(index: number) {
    if (index < -1 || index >= history.value.length) return

    currentMoveIndex.value = index

    if (index === -1) {
      chess.value = new Chess()
      fen.value = DEFAULT_FEN
    } else {
      const item = history.value[index]
      if (item) {
        chess.value = new Chess(item.afterFen)
        fen.value = item.afterFen
      }
    }

    bestMoveArrow.value = null
    hoverArrow.value = null
  }

  function goToStart() {
    goToMove(-1)
  }

  function prevMove() {
    if (currentMoveIndex.value > -1) {
      goToMove(currentMoveIndex.value - 1)
    }
  }

  function nextMove() {
    if (currentMoveIndex.value < history.value.length - 1) {
      goToMove(currentMoveIndex.value + 1)
    }
  }

  function goToEnd() {
    goToMove(history.value.length - 1)
  }

  /**
   * Sets arrow shapes on the board for the best move
   */
  function setBestMoveArrow(bestMoveUci?: string) {
    if (!bestMoveUci || bestMoveUci.length < 4) {
      bestMoveArrow.value = null
      return
    }
    const orig = bestMoveUci.slice(0, 2) as Key
    const dest = bestMoveUci.slice(2, 4) as Key
    bestMoveArrow.value = { orig, dest, brush: 'green' }
  }

  /**
   * Sets preview hover arrow for MultiPV lines
   */
  function setHoverArrow(uci?: string) {
    if (!uci || uci.length < 4) {
      hoverArrow.value = null
      return
    }
    const orig = uci.slice(0, 2) as Key
    const dest = uci.slice(2, 4) as Key
    hoverArrow.value = { orig, dest, brush: 'blue' }
  }

  /**
   * Real-time MultiPV evaluation triggered automatically per turn
   */
  let evalTimeout: ReturnType<typeof setTimeout> | null = null

  async function triggerLiveEvaluation(targetFen?: string) {
    const currentFen = targetFen || fen.value
    if (!autoEvaluate.value) return

    isEngineEvaluating.value = true
    try {
      const res = await $fetch<{ eval: StockfishEvalResult }>('/api/coach/eval', {
        params: {
          fen: currentFen,
          depth: 16,
          multipv: multipv.value
        }
      })

      if (fen.value === currentFen) {
        engineEval.value = res.eval
        if (res.eval.bestmove) {
          setBestMoveArrow(res.eval.bestmove)
        }
      }
    } catch (err) {
      console.warn('Live Stockfish eval error:', err)
    } finally {
      if (fen.value === currentFen) {
        isEngineEvaluating.value = false
      }
    }
  }

  // Watch FEN for real-time automatic evaluation
  watch(fen, (newFen) => {
    if (evalTimeout) clearTimeout(evalTimeout)
    evalTimeout = setTimeout(() => {
      triggerLiveEvaluation(newFen)
    }, 120)
  }, { immediate: true })

  function setMultipv(n: number) {
    multipv.value = n
  }

  // Watch MultiPV toggle
  watch(multipv, () => {
    triggerLiveEvaluation()
  })

  /**
   * Runs automated Stockfish review on the entire loaded game
   */
  async function runFullGameReview() {
    if (history.value.length === 0 || isReviewing.value) return

    isReviewing.value = true
    try {
      const res = await $fetch<ReviewStats & { moves: Array<{ index: number, classification: MoveClassification, eval: StockfishEvalResult }> }>('/api/coach/review', {
        method: 'POST',
        headers: { [headerName]: csrf },
        body: {
          history: history.value
        }
      })

      for (const m of res.moves) {
        const item = history.value[m.index]
        if (item) {
          item.classification = m.classification
          item.eval = m.eval
        }
      }

      reviewStats.value = {
        whiteAccuracy: res.whiteAccuracy,
        blackAccuracy: res.blackAccuracy,
        stats: res.stats
      }
    } catch (err) {
      console.error('Failed to run game review:', err)
    } finally {
      isReviewing.value = false
    }
  }

  // Pre-load default Chess.com match on initialization
  loadPgn(DEFAULT_CHESSCOM_PGN)

  return {
    chess,
    fen,
    orientation,
    history,
    headers,
    currentMoveIndex,
    playedMove,
    engineEval,
    evalLines,
    multipv,
    isEngineEvaluating,
    autoEvaluate,
    isAnalyzing,
    isReviewing,
    reviewStats,
    arrows,
    turn,
    isCheck,
    isCheckmate,
    isDraw,
    isGameOver,
    getDests,
    makeMove,
    loadPgn,
    loadFen,
    resetGame,
    flipBoard,
    goToMove,
    goToStart,
    prevMove,
    nextMove,
    goToEnd,
    setBestMoveArrow,
    setHoverArrow,
    setMultipv,
    triggerLiveEvaluation,
    runFullGameReview
  }
}

export type UseChessGameReturn = ReturnType<typeof useChessGame>
