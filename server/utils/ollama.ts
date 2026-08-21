import type { ChessColor, EngineSummaryData, MoveClassification } from '~~/shared/types/chess'

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b-mlx'

export interface CoachPromptPayload {
  fen: string
  userQuestion: string
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
  engineSummary: EngineSummaryData
  historyFormatted?: string
}

/**
 * Builds a concise, focused AI Chess Coach prompt.
 */
export function buildCoachPrompt(payload: CoachPromptPayload) {
  const { fen, userQuestion, playedMove, engineSummary, historyFormatted } = payload
  const { eval: currentEval, classification, bestMoveSan, pvSan, turn } = engineSummary

  const turnText = turn === 'w' ? 'White (백)' : 'Black (흑)'
  const playedMoveText = playedMove?.san
    ? `${playedMove.moveNumber ? `${playedMove.moveNumber}. ` : ''}${playedMove.san}`
    : 'None'

  const classificationMap: Record<MoveClassification, string> = {
    brilliant: '🌟 Brilliant (경이로운 수)',
    best: '⭐ Best Move (최선의 수)',
    excellent: '✨ Excellent (훌륭한 수)',
    good: '👍 Good (좋은 수)',
    book: '📖 Book (정석 수)',
    inaccuracy: '⚠️ Inaccuracy (부정확한 수)',
    mistake: '❓ Mistake (실수)',
    blunder: '❌ Blunder (치명적 블런더)',
    missed_win: '💔 Miss (기회 놓침)'
  }

  const classText = classification ? (classificationMap[classification] || classification) : 'Analysis'

  const systemInstructions = `당신은 핵심만 간결하고 명쾌하게 짚어주는 실전 체스 코치입니다.

[답변 규칙]:
1. 서론/인사말을 완전히 생략하고 바로 핵심 분석으로 시작하세요.
2. 장황한 글 대신 다음 4개 항목을 불릿 포인트로 각 1~2문장씩 아주 간결하게 작성하세요:
   - **의도**: 플레이어가 노린 착상 (1문장)
   - **문제점 & 반격**: 왜 안 좋은지와 상대의 구체적 반격 수순 (1~2문장)
   - **최선수 & 이유**: 스톡피시 추천수(${bestMoveSan || currentEval.bestmove})가 좋은 이유 (1~2문장)
   - **핵심 팁**: 실전 1줄 요약
3. 기물과 수순은 볼드체(예: **11.Qxb7**, **Nd4**, **비숍 c5**)로 강조하세요.`

  const promptContent = `[국면 데이터]
- 현재 차례: ${turnText}
- 방금 둔 수: ${playedMoveText} (${classText})
- 스톡피시 평가: ${currentEval.scoreFormatted} (백 승률 ${currentEval.winChance}%, depth ${currentEval.depth})
- 스톡피시 최선수: ${bestMoveSan || currentEval.bestmove}
- 엔진 추천 라인: ${pvSan || currentEval.pv}
${historyFormatted ? `- 최근 기보: ${historyFormatted}\n` : ''}
[사용자 질문]
"${userQuestion}"

위 국면 데이터를 바탕으로, 핵심만 매우 간결하고 명쾌하게 코칭해 주세요.`

  return {
    systemInstructions,
    promptContent
  }
}

/**
 * Streams AI Coach response from Ollama with generous token buffer.
 */
export async function streamOllamaChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { model?: string; baseUrl?: string; signal?: AbortSignal }
): Promise<ReadableStream<Uint8Array>> {
  const baseUrl = options?.baseUrl || DEFAULT_OLLAMA_URL
  const model = options?.model || DEFAULT_OLLAMA_MODEL

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: 0.6,
        top_p: 0.9,
        num_predict: 4096 // generous token limit to prevent truncation during thinking
      }
    }),
    signal: options?.signal
  })

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Ollama API error (${response.status}): ${errText || response.statusText}`)
  }

  return response.body
}
