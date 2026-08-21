<script setup lang="ts">
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'
import type { MoveClassification } from '~~/shared/types/chess'

const props = defineProps<{
  game: UseChessGameReturn
  coach: ReturnType<typeof useCoachChat>
}>()

const input = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

const quickPrompts = computed(() => {
  const currentMove = props.game.playedMove.value
  if (currentMove) {
    return [
      `여기서 ${currentMove.moveNumber}.${currentMove.san} 둔 게 무엇을 노린 건지 의도를 분석해 주고, 왜 실수/블런더인지 알려줘.`,
      `이 상황에서 ${currentMove.san} 대신 둘 수 있는 가장 강력한 최선수는 뭐야?`,
      `상대가 노리고 있는 가장 치명적인 전술적 위협이 뭐야?`,
      `현재 국면의 형세를 평가하고 장기적인 전략 플랜을 알려줘.`
    ]
  }
  return [
    '이 포지션에서 가장 중요한 전술적/전략적 핵심 포인트가 뭐야?',
    '현재 차례에서 엔진이 추천하는 최선의 수 3가지는 뭐야?',
    '킹의 안전도와 기물 활동성을 비교 분석해 줘.',
    '오프닝/미들게임 원칙에 맞는 최선의 계획을 알려줘.'
  ]
})

function sendPrompt(text: string) {
  if (!text.trim() || props.coach.isStreaming.value) return
  props.coach.askCoach(text, props.game)
  input.value = ''
  scrollToBottom()
}

function handleFormSubmit(e: Event) {
  e.preventDefault()
  sendPrompt(input.value)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(() => props.coach.messages.value.length, () => {
  scrollToBottom()
})

const currentBoardTag = computed(() => {
  const move = props.game.playedMove.value
  if (!move) return 'Start Position'
  return `${move.moveNumber}. ${move.san} (${move.turn === 'w' ? 'White' : 'Black'})`
})

function getClassificationBadge(cls?: MoveClassification) {
  if (!cls) return null
  const map: Record<MoveClassification, { label: string, color: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info', icon: string }> = {
    brilliant: { label: 'Brilliant', color: 'info', icon: 'i-lucide-sparkles' },
    best: { label: 'Best Move', color: 'success', icon: 'i-lucide-star' },
    excellent: { label: 'Excellent', color: 'success', icon: 'i-lucide-check-circle' },
    good: { label: 'Good Move', color: 'primary', icon: 'i-lucide-thumbs-up' },
    book: { label: 'Book Move', color: 'neutral', icon: 'i-lucide-book-open' },
    inaccuracy: { label: 'Inaccuracy', color: 'warning', icon: 'i-lucide-alert-triangle' },
    mistake: { label: 'Mistake', color: 'warning', icon: 'i-lucide-help-circle' },
    blunder: { label: 'Blunder', color: 'error', icon: 'i-lucide-x-circle' },
    missed_win: { label: 'Missed Win', color: 'error', icon: 'i-lucide-heart-crack' }
  }
  return map[cls] || { label: cls, color: 'neutral', icon: 'i-lucide-info' }
}
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50/50 dark:bg-neutral-950 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
          ♟️
        </div>
        <div>
          <div class="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            AI Chess Coach
            <UBadge color="primary" variant="subtle" size="xs">
              Gemma 4
            </UBadge>
          </div>
          <div class="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <span>Analyzing:</span>
            <span class="font-mono font-medium text-neutral-700 dark:text-neutral-300">{{ currentBoardTag }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          color="neutral"
          variant="ghost"
          label="Clear"
          aria-label="Clear chat"
          @click="coach.clearMessages()"
        />
      </div>
    </div>

    <!-- Messages Container -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <div
        v-for="msg in coach.messages.value"
        :key="msg.id"
        class="flex flex-col gap-1.5"
        :class="msg.role === 'user' ? 'items-end' : 'items-start'"
      >
        <!-- Board Context Pill for User Message -->
        <div
          v-if="msg.role === 'user' && msg.boardContext?.playedMove"
          class="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono px-1 flex items-center gap-1"
        >
          <UIcon name="i-lucide-pin" class="w-3 h-3" />
          Move {{ msg.boardContext.playedMove.moveNumber }}. {{ msg.boardContext.playedMove.san }}
        </div>

        <!-- Message Bubble -->
        <div
          class="max-w-[88%] rounded-2xl p-3.5 shadow-sm text-sm"
          :class="msg.role === 'user'
            ? 'bg-primary-600 text-white rounded-tr-none'
            : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none'"
        >
          <!-- Assistant Engine Summary Badge -->
          <div
            v-if="msg.role === 'assistant' && msg.engineSummary"
            class="mb-3 p-2.5 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 flex flex-col gap-2"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UBadge
                  color="neutral"
                  variant="solid"
                  size="sm"
                  class="font-mono font-bold"
                >
                  Stockfish {{ msg.engineSummary.eval.scoreFormatted }}
                </UBadge>

                <UBadge
                  v-if="getClassificationBadge(msg.engineSummary.classification)"
                  :color="getClassificationBadge(msg.engineSummary.classification)!.color"
                  variant="subtle"
                  size="xs"
                  class="font-semibold"
                >
                  <UIcon :name="getClassificationBadge(msg.engineSummary.classification)!.icon" class="mr-1 w-3 h-3" />
                  {{ getClassificationBadge(msg.engineSummary.classification)!.label }}
                </UBadge>
              </div>

              <div class="text-[11px] text-neutral-500 font-mono">
                Best: <span class="text-primary-500 font-bold">{{ msg.engineSummary.bestMoveSan || msg.engineSummary.eval.bestmove }}</span>
              </div>
            </div>

            <!-- PV Line -->
            <div v-if="msg.engineSummary.pvSan" class="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
              Line: {{ msg.engineSummary.pvSan }}
            </div>
          </div>

          <!-- Message Text Content -->
          <div v-if="msg.role === 'user'" class="whitespace-pre-wrap">
            {{ msg.content }}
          </div>

          <div v-else class="space-y-2">
            <!-- Shimmer when thinking and content is empty -->
            <div v-if="msg.streaming && !msg.content" class="flex items-center gap-2 text-neutral-500 text-xs py-1">
              <UIcon name="i-lucide-loader" class="w-4 h-4 animate-spin text-primary-500" />
              <span>체스 엔진과 코치가 국면과 의도를 분석 중입니다...</span>
            </div>

            <ChatComark
              v-if="msg.content"
              :value="msg.content"
              :streaming="msg.streaming"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Prompts Chips -->
    <div class="px-4 py-2 bg-neutral-100/60 dark:bg-neutral-900/40 border-t border-neutral-200/60 dark:border-neutral-800/60 overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
      <UButton
        v-for="(prompt, idx) in quickPrompts"
        :key="idx"
        size="xs"
        color="neutral"
        variant="outline"
        class="rounded-full shrink-0 text-xs font-normal"
        :disabled="coach.isStreaming.value"
        @click="sendPrompt(prompt)"
      >
        <UIcon name="i-lucide-sparkles" class="text-primary-500 w-3 h-3 mr-1" />
        {{ prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt }}
      </UButton>
    </div>

    <!-- Input Footer -->
    <div class="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
      <form class="flex items-end gap-2" @submit="handleFormSubmit">
        <UTextarea
          v-model="input"
          placeholder="현재 수의 의도나 궁금한 점을 코치에게 질문하세요... (예: 여기서 Nd4 둔 게 왜 블런더야?)"
          :rows="2"
          :maxrows="4"
          autoresize
          class="flex-1 text-sm"
          :disabled="coach.isStreaming.value"
          @keydown.enter.exact.prevent="handleFormSubmit"
        />

        <div class="flex items-center gap-1">
          <UButton
            v-if="coach.isStreaming.value"
            icon="i-lucide-square"
            color="error"
            size="md"
            label="Stop"
            @click="coach.stopGenerating()"
          />
          <UButton
            v-else
            icon="i-lucide-send"
            color="primary"
            size="md"
            type="submit"
            :disabled="!input.trim()"
            aria-label="Send question"
          />
        </div>
      </form>
    </div>
  </div>
</template>
