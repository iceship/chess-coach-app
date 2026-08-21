import type { UseChessGameReturn } from '~~/app/composables/useChessGame'
import type { CoachMessage, EngineSummaryData } from '~~/shared/types/chess'

const INITIAL_MESSAGE: CoachMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `안녕하세요! **AI 체스 코치**입니다. ♟️\n\n좌측 체스판에서 기물을 자유롭게 두거나 **PGN 기보**를 불러온 뒤, 궁금한 수와 의도를 물어보세요!\n\n**예시 질문:**\n- *"여기서 14.Nd4 둔 게 비숍을 공격하려던 건데 왜 블런더야?"*\n- *"이 상황에서 백이 노려야 할 최선의 플랜은 뭐야?"*\n- *"상대가 노리는 가장 큰 전술적 위협이 뭐야?"*`,
  createdAt: new Date().toISOString()
}

export function useCoachChat() {
  const messages = ref<CoachMessage[]>([{ ...INITIAL_MESSAGE }])

  const isStreaming = ref(false)
  const latestEngineSummary = ref<EngineSummaryData | null>(null)
  let currentAbortController: AbortController | null = null

  const { csrf, headerName } = useCsrf()

  async function askCoach(question: string, game: UseChessGameReturn) {
    if (!question.trim() || isStreaming.value) return

    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()

    const currentPlayedMove = game.playedMove.value
    const currentFen = game.fen.value
    const currentTurn = game.turn.value

    // 1. Add user message
    messages.value.push({
      id: userMessageId,
      role: 'user',
      content: question.trim(),
      boardContext: {
        fen: currentFen,
        playedMove: currentPlayedMove,
        moveNumber: currentPlayedMove?.moveNumber,
        turn: currentTurn
      },
      createdAt: new Date().toISOString()
    })

    // 2. Add placeholder assistant message
    const assistantMessage: CoachMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      boardContext: {
        fen: currentFen,
        playedMove: currentPlayedMove,
        moveNumber: currentPlayedMove?.moveNumber,
        turn: currentTurn
      },
      streaming: true,
      createdAt: new Date().toISOString()
    }
    messages.value.push(assistantMessage)

    isStreaming.value = true
    currentAbortController = new AbortController()

    try {
      const response = await fetch('/api/coach/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [headerName]: csrf
        },
        body: JSON.stringify({
          fen: currentFen,
          playedMove: currentPlayedMove || undefined,
          userQuestion: question.trim(),
          history: game.history.value.map(h => ({
            moveNumber: h.moveNumber,
            turn: h.turn,
            san: h.san
          })),
          stream: true
        }),
        signal: currentAbortController.signal
      })

      if (!response.ok || !response.body) {
        throw new Error(`Analysis request failed: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = 'message'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim()
            continue
          }

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim()
            if (!dataStr) continue

            try {
              const data = JSON.parse(dataStr)

              if (currentEvent === 'engine') {
                const engineData = data as EngineSummaryData
                latestEngineSummary.value = engineData
                assistantMessage.engineSummary = engineData

                // Visualize best move arrow on board
                if (engineData.eval.bestmove) {
                  game.setBestMoveArrow(engineData.eval.bestmove)
                }
              } else if (currentEvent === 'chunk') {
                assistantMessage.content += data.text || ''
              } else if (currentEvent === 'done') {
                assistantMessage.streaming = false
              } else if (currentEvent === 'error') {
                assistantMessage.content += `\n\n*(Error: ${data.message || 'Analysis failed'})*`
                assistantMessage.streaming = false
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (!isAbort) {
        const message = err instanceof Error ? err.message : '서버 응답 오류'
        assistantMessage.content += `\n\n*(분석 중 오류가 발생했습니다: ${message})*`
      }
    } finally {
      assistantMessage.streaming = false
      isStreaming.value = false
      currentAbortController = null
    }
  }

  function stopGenerating() {
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
    }
    isStreaming.value = false
  }

  function clearMessages() {
    messages.value = [{ ...INITIAL_MESSAGE }]
    latestEngineSummary.value = null
  }

  return {
    messages,
    isStreaming,
    latestEngineSummary,
    askCoach,
    stopGenerating,
    clearMessages
  }
}
