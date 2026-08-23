import { Chess } from 'chess.js'
import type { Key } from '@lichess-org/chessground/types'
import type {
  BoardOrientation,
  ChessArrowShape,
  ChessColor,
  ChessGameHeaders,
  EngineLine,
  MoveClassification,
  MoveHistoryItem,
  PlayedMoveInfo,
  StockfishEvalResult
} from '~~/shared/types/chess'

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const DEFAULT_CHESSCOM_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.04.14"]
[Round "-"]
[White "White"]
[Black "Black"]
[Result "1-0"]
[WhiteElo "727"]
[BlackElo "700"]
[TimeControl "180+2"]
[EndTime "16:21:40 PDT"]
[Termination "White won by resignation"]
[ECO "B07"]

1. e4 {[%clk 0:03:02]} 1... d6 {[%clk 0:03:00.6]} 2. d4 {[%clk 0:03:03.2]} 2... Nf6 {[%clk 0:03:01.3]} 3. Nc3 {[%clk 0:03:04.4]} 3... g6 {[%clk 0:03:01.9]} 4. Bg5 {[%clk 0:03:05.1]} 4... Bg7 {[%clk 0:03:02.8]} 5. e5 {[%clk 0:03:05.7]} 5... dxe5 {[%clk 0:03:02.3]} 6. dxe5 {[%clk 0:03:06.9]} 6... Qxd1+ {[%clk 0:03:00.6]} 7. Rxd1 {[%clk 0:03:08]} 7... Nfd7 {[%clk 0:02:59.3]} 8. Nd5 {[%clk 0:03:07.7]} 8... Bxe5 {[%clk 0:02:49.2]} 9. Nf3 {[%clk 0:03:02.6]} 9... Bd6 {[%clk 0:02:44.2]} 10. Bxe7 {[%clk 0:03:00.5]} 10... Bxe7 {[%clk 0:02:41.3]} 11. Nxc7+ {[%clk 0:03:00.7]} 11... Kd8 {[%clk 0:02:42.5]} 12. Nxa8 {[%clk 0:03:01.3]} 12... b6 {[%clk 0:02:42.2]} 13. Ne5 {[%clk 0:02:58.3]} 13... Rf8 {[%clk 0:02:30.9]} 14. Be2 {[%clk 0:02:40.4]} 14... b5 {[%clk 0:02:18.9]} 15. a3 {[%clk 0:02:27.7]} 15... Bxc3+ {[%clk 0:02:15.5]} 16. bxc3 {[%clk 0:02:28.9]} 16... Kc7 {[%clk 0:02:08.5]} 17. Nxd7 {[%clk 0:02:28.1]} 17... Nxd7 {[%clk 0:02:09.6]} 18. Bxb5 {[%clk 0:02:28.7]} 18... Nb6 {[%clk 0:02:09.1]} 19. O-O {[%clk 0:02:28.9]} 19... a6 {[%clk 0:02:09.1]} 20. Be2 {[%clk 0:02:27.1]} 20... f5 {[%clk 0:02:07.5]} 21. Rd4 {[%clk 0:02:26.5]} 21... Bb7 {[%clk 0:02:06.6]} 22. Rfd1 {[%clk 0:02:26.7]} 22... Re8 {[%clk 0:02:04.9]} 23. Bf1 {[%clk 0:02:26.7]} 23... Re7 {[%clk 0:02:02.1]} 24. a4 {[%clk 0:02:26.3]} 24... Bc6 {[%clk 0:01:54.6]} 25. a5 {[%clk 0:02:26.6]} 25... Nd7 {[%clk 0:01:46.4]} 26. Bxa6 {[%clk 0:02:26.8]} 26... Nc5 {[%clk 0:01:47]} 27. Bc4 {[%clk 0:02:26.8]} 27... Ne4 {[%clk 0:01:46.9]} 28. R4d3 {[%clk 0:02:26.6]} 28... Nc5 {[%clk 0:01:46.3]} 29. Re3 {[%clk 0:02:26.3]} 29... Ne4 {[%clk 0:01:44.2]} 30. f3 {[%clk 0:02:26.7]} 30... Rd7 {[%clk 0:01:31.9]} 31. Rxd7+ {[%clk 0:02:27.8]} 31... Kxd7 {[%clk 0:01:32.9]} 32. fxe4 {[%clk 0:02:28.9]} 32... Bxe4 {[%clk 0:01:33.7]} 33. Bd3 {[%clk 0:02:29.8]} 33... Bd5 {[%clk 0:01:34.4]} 34. c4 {[%clk 0:02:31.2]} 34... Bc6 {[%clk 0:01:34.9]} 35. c5 {[%clk 0:02:32.4]} 35... Kc7 {[%clk 0:01:35.3]} 36. Re7+ {[%clk 0:02:33.4]} 36... Kd8 {[%clk 0:01:36]} 37. Rxh7 {[%clk 0:02:34.4]} 37... Be8 {[%clk 0:01:35.5]} 38. a6 {[%clk 0:02:35.4]} 38... Bc6 {[%clk 0:01:35.9]} 39. a7 {[%clk 0:02:36.4]} 39... Kc8 {[%clk 0:01:35.2]} 40. Ba6+ {[%clk 0:02:37.4]} 40... Kd8 {[%clk 0:01:35.4]} 41. a8=Q+ {[%clk 0:02:38.4]} 41... Bxa8 {[%clk 0:01:35.7]} 42. Rh8+ {[%clk 0:02:39.4]} 42... Kc7 {[%clk 0:01:36.3]} 43. Rxa8 {[%clk 0:02:40.4]} 43... Kc6 {[%clk 0:01:37]} 44. Rc8+ {[%clk 0:02:41.4]} 44... Kd7 {[%clk 0:01:37.6]} 45. c6+ {[%clk 0:02:42.4]} 45... Kd6 {[%clk 0:01:38.2]} 46. Bb7 {[%clk 0:02:43.4]} 46... g5 {[%clk 0:01:38.8]} 47. Rd8+ {[%clk 0:02:44.4]} 47... Kc7 {[%clk 0:01:38.6]} 48. Rd7+ {[%clk 0:02:45.4]} 48... Kb8 {[%clk 0:01:38.9]} 49. Ba6 {[%clk 0:02:46.4]} 49... f4 {[%clk 0:01:39.1]} 50. c7+ {[%clk 0:02:47.4]} 50... Ka7 {[%clk 0:01:39.7]} 51. c8=Q+ {[%clk 0:02:48.4]} 51... Kb6 {[%clk 0:01:39.4]} 52. Qb7+ {[%clk 0:02:49.4]} 52... Ka5 {[%clk 0:01:39.3]} 53. Qb5# {[%clk 0:02:50.4]} 1-0`

/**
 * Parses Chess.com annotation comments (e.g. [%c_effect c3;type;best;...]) or standard NAGs
 */
function extractMoveAnnotations(pgn: string): Map<number, MoveClassification> {
  const map = new Map<number, MoveClassification>()
  if (!pgn) return map

  const cleaned = pgn.replace(/\[.*?\]/g, ' ')
  const tokens = cleaned.split(/\s+/)
  let moveIdx = -1

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i]
    if (!raw) continue
    const token = raw.trim()

    // Skip move numbers e.g. "1." or "1..."
    if (/^\d+\.+$/.test(token)) continue

    // Standard NAGs
    if (token.startsWith('$')) {
      const nag = token.slice(1)
      if (moveIdx >= 0) {
        if (nag === '1') map.set(moveIdx, 'good')
        else if (nag === '2') map.set(moveIdx, 'mistake')
        else if (nag === '3') map.set(moveIdx, 'brilliant')
        else if (nag === '4') map.set(moveIdx, 'blunder')
        else if (nag === '5') map.set(moveIdx, 'best')
        else if (nag === '6') map.set(moveIdx, 'inaccuracy')
        else if (nag === '9') map.set(moveIdx, 'best')
      }
      continue
    }

    // Chess.com effect annotation comments: {[%c_effect ...;type;...]}
    if (token.includes('{') || token.includes('}')) {
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

export interface ReviewStats {
  whiteAccuracy: number
  blackAccuracy: number
  stats: {
    white: Partial<Record<MoveClassification, number>>
    black: Partial<Record<MoveClassification, number>>
  }
}

export function useChessGame() {
  const chess = shallowRef(new Chess())
  const fen = ref(DEFAULT_FEN)
  const orientation = ref<BoardOrientation>('white')

  // Main line history (preserves the original complete game)
  const mainHistory = ref<MoveHistoryItem[]>([])

  // Variation history (for what-if exploration without deleting the main game)
  const variationHistory = ref<MoveHistoryItem[]>([])
  const variationBranchIndex = ref<number>(-1)

  const isVariation = computed(() => variationBranchIndex.value !== -1)

  // Combined active history
  const history = computed<MoveHistoryItem[]>(() => {
    if (!isVariation.value) return mainHistory.value
    return [
      ...mainHistory.value.slice(0, variationBranchIndex.value + 1),
      ...variationHistory.value
    ]
  })

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
    const list = history.value
    if (currentMoveIndex.value < 0 || currentMoveIndex.value >= list.length) {
      return null
    }
    const item = list[currentMoveIndex.value]
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
      classification: item.classification,
      eval: item.eval
    }
  })

  /**
   * Returns legal destination squares for the current board position
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
   * Makes a move on the board (via drag-and-drop or programmatic input).
   * If in review mode and a different move is made, branches into a Variation without deleting the original game.
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

      if (isVariation.value) {
        // Already in a variation branch: continue extending this variation
        const branchOffset = currentMoveIndex.value - variationBranchIndex.value
        if (branchOffset < variationHistory.value.length) {
          variationHistory.value = variationHistory.value.slice(0, branchOffset)
        }
        historyItem.index = variationBranchIndex.value + 1 + variationHistory.value.length
        variationHistory.value.push(historyItem)
        currentMoveIndex.value = history.value.length - 1
      } else {
        // In main line mode
        if (currentMoveIndex.value === mainHistory.value.length - 1) {
          // At the end of the game: simply append to main line
          historyItem.index = mainHistory.value.length
          mainHistory.value.push(historyItem)
          currentMoveIndex.value = mainHistory.value.length - 1
        } else {
          // Exploring from an earlier move in the game!
          const nextMainMove = mainHistory.value[currentMoveIndex.value + 1]
          if (nextMainMove && nextMainMove.san === moveResult.san) {
            // Player repeated the exact same move as the main game: advance in main line
            currentMoveIndex.value = currentMoveIndex.value + 1
          } else {
            // Player made an alternative / what-if move:
            // Branch into a Variation tree without losing the main line!
            variationBranchIndex.value = currentMoveIndex.value
            historyItem.index = currentMoveIndex.value + 1
            variationHistory.value = [historyItem]
            currentMoveIndex.value = currentMoveIndex.value + 1
          }
        }
      }

      bestMoveArrow.value = null
      hoverArrow.value = null
      return true
    } catch (err) {
      console.warn('Illegal or invalid move:', err)
      return false
    }
  }

  /**
   * Resumes back to the main game line from a variation branch
   */
  function resumeMainLine(targetIndex?: number) {
    if (!isVariation.value) return
    const restoreIdx = targetIndex !== undefined
      ? targetIndex
      : Math.min(variationBranchIndex.value + 1, mainHistory.value.length - 1)

    variationBranchIndex.value = -1
    variationHistory.value = []
    goToMove(restoreIdx)
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

      mainHistory.value = parsedItems
      variationHistory.value = []
      variationBranchIndex.value = -1
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
      const tempChess = new Chess(fenString)
      chess.value = tempChess
      fen.value = fenString
      mainHistory.value = []
      variationHistory.value = []
      variationBranchIndex.value = -1
      currentMoveIndex.value = -1
      headers.value = {}
      reviewStats.value = null
      bestMoveArrow.value = null
      hoverArrow.value = null
      return true
    } catch (err) {
      console.warn('Failed to load FEN:', err)
      return false
    }
  }

  /**
   * Resets the entire chessboard to the starting position
   */
  function resetGame() {
    chess.value = new Chess()
    fen.value = DEFAULT_FEN
    mainHistory.value = []
    variationHistory.value = []
    variationBranchIndex.value = -1
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
    const list = history.value
    if (index < -1 || index >= list.length) return

    currentMoveIndex.value = index

    if (index === -1) {
      chess.value = new Chess()
      fen.value = DEFAULT_FEN
    } else {
      const item = list[index]
      if (item) {
        chess.value = new Chess(item.afterFen)
        fen.value = item.afterFen
      }
    }

    bestMoveArrow.value = null
    hoverArrow.value = null
  }

  /**
   * Jumps to a specific move in the main line (exiting any variation)
   */
  function goToMainMove(index: number) {
    if (isVariation.value) {
      variationBranchIndex.value = -1
      variationHistory.value = []
    }
    goToMove(index)
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
    if (!currentFen || currentFen === 'start') return

    isEngineEvaluating.value = true
    try {
      const res = await $fetch<StockfishEvalResult>(`/api/coach/eval`, {
        params: {
          fen: currentFen,
          depth: 16,
          multipv: multipv.value || 2
        }
      })

      if (fen.value === currentFen) {
        engineEval.value = res
        if (res.bestmove) {
          setBestMoveArrow(res.bestmove)
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
    if (mainHistory.value.length === 0 || isReviewing.value) return

    isReviewing.value = true
    try {
      const res = await $fetch<ReviewStats & { moves: Array<{ index: number, classification: MoveClassification, eval: StockfishEvalResult }> }>('/api/coach/review', {
        method: 'POST',
        headers: { [headerName]: csrf },
        body: {
          history: mainHistory.value
        }
      })

      for (const m of res.moves) {
        const item = mainHistory.value[m.index]
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
    mainHistory,
    variationHistory,
    variationBranchIndex,
    isVariation,
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
    resumeMainLine,
    loadPgn,
    loadFen,
    resetGame,
    flipBoard,
    goToMove,
    goToMainMove,
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
