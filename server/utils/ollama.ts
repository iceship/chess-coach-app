import type { ChessColor, EngineSummaryData, MoveClassification } from '~~/shared/types/chess'

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.8:27b-mlx'

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
 * Builds an accurate, context-aware AI Chess Coach prompt.
 */
export function buildCoachPrompt(payload: CoachPromptPayload) {
  const { userQuestion, playedMove, engineSummary, historyFormatted } = payload
  const { eval: currentEval, classification, beforeEval, playerBestMoveSan, opponentBestResponseSan, turn, playerTurn } = engineSummary

  const mover = playerTurn || playedMove?.turn || (turn === 'w' ? 'b' : 'w')
  const moverText = mover === 'w' ? 'White (백)' : 'Black (흑)'
  const opponentText = mover === 'w' ? 'Black (흑)' : 'White (백)'
  const currentTurnText = turn === 'w' ? 'White (백)' : 'Black (흑)'

  const classificationMap: Record<MoveClassification, string> = {
    brilliant: '🌟 Brilliant (경이로운 최선수)',
    best: '⭐ Best Move (최선의 수)',
    excellent: '✨ Excellent (훌륭한 수)',
    good: '👍 Good (좋은 수)',
    book: '📖 Book (오프닝 정석)',
    inaccuracy: '⚠️ Inaccuracy (부정확한 수)',
    mistake: '❓ Mistake (실수)',
    blunder: '❌ Blunder (치명적 블런더)',
    missed_win: '💔 Miss (기회 놓침)'
  }

  const classText = classification ? (classificationMap[classification] || classification) : 'Analysis'
  const isAnalyzingPlayedMove = Boolean(playedMove?.san)

  let systemInstructions: string
  let promptContent: string

  if (isAnalyzingPlayedMove && playedMove?.san) {
    const moveStr = `${playedMove.moveNumber ? `${playedMove.moveNumber}. ` : ''}${playedMove.san}`
    const moverBestAlt = playerBestMoveSan || beforeEval?.bestmoveSan || playedMove.san
    const isMoverPlayedBest = classification === 'best' || classification === 'brilliant' || moverBestAlt === playedMove.san
    const opponentReply = opponentBestResponseSan || currentEval.bestmoveSan || '없음'

    systemInstructions = `당신은 핵심만 간결하고 정확하게 짚어주는 실전 체스 코치입니다.

[분석 규칙 (CRITICAL)]:
1. 지금 분석하는 대상은 방금 **${moverText}**이 둔 수 **${moveStr}**입니다.
2. 절대 헷갈리지 마세요:
   - 방금 수(**${moveStr}**)를 둔 사람: **${moverText}**
   - **${moverText}**이 뒀어야 할 엔진 최선수: **${moverBestAlt}** (${isMoverPlayedBest ? '플레이어가 둔 수가 바로 최선수임' : '플레이어의 수보다 더 좋은 대안'})
   - 이후 상대방(**${opponentText}**)의 다음 대응 최선수: **${opponentReply}**
3. 서론을 생략하고 다음 4개 항목을 불릿 포인트로 작성하세요:
   - **의도**: 방금 **${moverText}**이 **${playedMove.san}**를 두며 노렸던 착상 (1문장)
   - **평가 & 이유**: 이 수가 왜 ${classText}인지 분석. ${isMoverPlayedBest ? '최선수로서 국면 우세를 굳힌 이유' : `대신 **${moverBestAlt}**를 두었어야 하는 이유`} (1~2문장)
   - **상대의 반격**: 이 수 이후 상대방(**${opponentText}**)이 준비할 수 있는 대응(**${opponentReply}**) (1문장)
   - **핵심 팁**: 실전 1줄 요약
4. 기물과 수순은 볼드체(예: **${playedMove.san}**, **${moverBestAlt}**, **${opponentReply}**)로 강조하세요.`

    promptContent = `[방금 둔 수 데이터]
- 둔 플레이어: ${moverText}
- 방금 둔 수: ${moveStr} (${classText})
- 수 이전 ${moverText}에게 엔진이 추천한 최선수: ${moverBestAlt}
- 수 이후 현재 평가치: ${currentEval.scoreFormatted} (백 승률 ${currentEval.winChance}%)
- 수 이후 상대방(${opponentText})의 다음 최선의 대응 수순: ${opponentReply}
${historyFormatted ? `- 최근 기보: ${historyFormatted}\n` : ''}
[사용자 질문]
"${userQuestion}"

위 데이터를 바탕으로 방금 둔 수에 대해 핵심만 매우 간결하고 명쾌하게 코칭해 주세요.`
  } else {
    systemInstructions = `당신은 핵심만 간결하고 정확하게 짚어주는 실전 체스 코치입니다.

[분석 규칙]:
1. 지금은 **${currentTurnText}** 차례에서 다음에 무엇을 두어야 할지 포지션을 분석합니다.
2. 서론을 생략하고 다음 3개 항목을 불릿 포인트로 작성하세요:
   - **현재 형세**: 국면의 유불리와 핵심 폰/기물 구조 (1문장)
   - **추천 최선수 & 이유**: 지금 **${currentTurnText}**이 두어야 할 최선수(**${currentEval.bestmoveSan || currentEval.bestmove}**)와 그 이유 (1~2문장)
   - **주의할 위협 & 팁**: 상대방의 주요 노림수와 실전 1줄 팁
3. 기물과 수순은 볼드체로 강조하세요.`

    promptContent = `[현재 국면 데이터]
- 현재 둘 차례: ${currentTurnText}
- 스톡피시 평가: ${currentEval.scoreFormatted} (백 승률 ${currentEval.winChance}%)
- 스톡피시 추천 최선수: ${currentEval.bestmoveSan || currentEval.bestmove}
- 엔진 추천 라인: ${engineSummary.pvSan || currentEval.pv}
${historyFormatted ? `- 최근 기보: ${historyFormatted}\n` : ''}
[사용자 질문]
"${userQuestion}"

위 국면 데이터를 바탕으로, 다음에 둘 수에 대해 핵심만 간결하고 명쾌하게 코칭해 주세요.`
  }

  return {
    systemInstructions,
    promptContent
  }
}

/**
 * Streams AI Coach response from Ollama with generous token buffer.
 */
export async function streamOllamaChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  options?: { model?: string, baseUrl?: string, signal?: AbortSignal }
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
        num_predict: 4096
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
