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
 * Builds an adaptive, GM-level AI Chess Coach prompt tailored to the user's specific question.
 */
export function buildCoachPrompt(payload: CoachPromptPayload) {
  const { userQuestion, playedMove, engineSummary, historyFormatted } = payload
  const { eval: currentEval, classification, beforeEval, playerBestMoveSan, opponentBestResponseSan, turn, playerTurn, lines } = engineSummary

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
  const isPlayedMoveValid = Boolean(playedMove?.san)

  // Format Top engine lines if available
  const topLinesText = lines && lines.length > 0
    ? lines.map(l => `- 라인 ${l.multipv} (${l.scoreFormatted}): ${l.pvSan || l.pvUci}`).join('\n')
    : `- 1순위 (${currentEval.scoreFormatted}): ${currentEval.pvSan || currentEval.pv}`

  const systemInstructions = `당신은 그랜드마스터 수준의 통찰력을 갖춘 전문 체스 코치입니다.
주어진 정확한 체스 엔진 데이터(스톡피시)를 기반으로 사용자의 질문 의도에 맞추어 가장 정확하고 명쾌하게 코칭하세요.

[체스 코칭 기본 원칙]:
1. **서론 생략**: "안녕하세요", "좋은 질문입니다" 등의 상투적인 인사말을 일체 생략하고 즉시 핵심 답변으로 시작하세요.
2. **질문 맞춤형 구조 (질문의 핵심 의도에 맞추어 3~4개의 명쾌한 불릿 포인트로 작성)**:
   - **수의 의도 / 실수 분석 질문** (예: "왜 둔 거야?", "의도 분석해 줘", "블런더 이유"):
     * **수의 의도**: 둔 플레이어가 노렸던 전략적/전술적 착상 (1문장)
     * **엔진 평가 & 이유**: 최선수인지 혹은 실수인지 분석하고 대안 설명 (1~2문장)
     * **상대의 반격**: 이 수 이후 상대방의 다음 최선의 대응 수순 (1문장)
     * **핵심 팁**: 실전 1줄 요약
   - **상대의 위협 / 전술 탐지 질문** (예: "상대가 뭘 노리고 있어?", "위협이 뭐야?"):
     * **주요 위협**: 상대 기물이 노리고 있는 전술적/위치적 타겟 (핀, 포크, 폰 전진, 킹 공격 등)
     * **방어 대책**: 위협을 무력화하기 위한 최선의 수비/반격 수순
     * **전술 팁**: 놓치지 말아야 할 방어 원칙
   - **다음 최선수 / 추천 질문** (예: "다음 수는?", "최선수 3가지는?"):
     * **1순위 최선수 & 이유**: 왜 이 수가 가장 강력한지 (활동성, 폰 구조, 중앙 지배)
     * **2순위 대안**: 차선책의 특징 및 선택 기준
     * **핵심 팁**: 다음 단계 실행 조언
   - **포지션 평가 / 전략 플랜 질문** (예: "장기적인 플랜은?", "형세와 전략 알려줘", "폰 구조는?"):
     * **현재 형세 요약**: 기물 활동성, 중앙 제어, 킹 안전도 종합 평가
     * **중장기 전략 플랜**: 기물 전개 및 공격/방어 목표 지점
     * **핵심 팁**: 장기적인 승리 가이드
   - **가상 수순(What-If) 및 자유 질문** (예: "X 대신 Y를 뒀다면?", "오프닝 원칙은?"):
     * 사용자의 질문에 정확히 초점을 맞추어 3~4개의 명쾌한 불릿 포인트로 답변
3. **표기법 강조**: 모든 기물과 수순(**16.Nxc3**, **c6**, **비숍 c5**)은 반드시 볼드체로 강조하세요.
4. **팩트 준수**: 제공된 스톡피시 평가치와 라인 데이터를 100% 신뢰하여 설명하세요.`

  let moveContextBlock = ''
  if (isPlayedMoveValid && playedMove?.san) {
    const moveStr = `${playedMove.moveNumber ? `${playedMove.moveNumber}. ` : ''}${playedMove.san}`
    const moverBestAlt = playerBestMoveSan || beforeEval?.bestmoveSan || playedMove.san
    const isMoverPlayedBest = classification === 'best' || classification === 'brilliant' || moverBestAlt === playedMove.san
    const opponentReply = opponentBestResponseSan || currentEval.bestmoveSan || '없음'

    moveContextBlock = `[방금 둔 수 데이터]
- 둔 플레이어: ${moverText}
- 방금 둔 수: ${moveStr} (${classText})
- 수 이전 ${moverText}에게 엔진이 추천한 최선수: ${moverBestAlt} (${isMoverPlayedBest ? '플레이어가 둔 수가 바로 1위 최선수' : '플레이어 수보다 나은 대안'})
- 수 이후 상대방(${opponentText})의 다음 최선의 대응: ${opponentReply}`
  }

  const promptContent = `[체스 국면 데이터]
- 현재 둘 차례: ${currentTurnText}
- 스톡피시 평가: ${currentEval.scoreFormatted} (백 승률 ${currentEval.winChance}%, Depth ${currentEval.depth})
- 스톡피시 추천 최선수 (현재 차례): ${currentEval.bestmoveSan || currentEval.bestmove}
${topLinesText ? `[추천 라인 목록]\n${topLinesText}\n` : ''}${moveContextBlock ? `${moveContextBlock}\n` : ''}${historyFormatted ? `[최근 기보]\n${historyFormatted}\n` : ''}
[사용자 질문]
"${userQuestion}"

위 국면 데이터를 바탕으로, 사용자의 질문에 맞춰 가장 명쾌하고 간결하게 답변해 주세요.`

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
