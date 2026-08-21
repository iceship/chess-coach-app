<script setup lang="ts">
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'
import type { MoveClassification } from '~~/shared/types/chess'

const props = defineProps<{
  game: UseChessGameReturn
  coach: ReturnType<typeof useCoachChat>
}>()

const input = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

interface QuickPromptItem {
  label: string
  icon: string
  prompt: string
}

const quickPrompts = computed<QuickPromptItem[]>(() => {
  const currentMove = props.game.playedMove.value
  if (currentMove) {
    return [
      {
        label: `${currentMove.san} 의도 분석`,
        icon: 'i-lucide-target',
        prompt: `여기서 ${currentMove.moveNumber}.${currentMove.san} 둔 게 무엇을 노린 건지 의도를 분석해 줘.`
      },
      {
        label: '최선수 추천',
        icon: 'i-lucide-sparkles',
        prompt: `이 상황에서 ${currentMove.san} 대신 둘 수 있는 가장 강력한 최선수는 뭐야?`
      },
      {
        label: '상대 위협 파악',
        icon: 'i-lucide-shield-alert',
        prompt: '상대가 노리고 있는 가장 치명적인 전술적 위협이 뭐야?'
      },
      {
        label: '포지션 형세 평가',
        icon: 'i-lucide-trending-up',
        prompt: '현재 국면의 형세를 평가하고 전략 플랜을 알려줘.'
      }
    ]
  }
  return [
    {
      label: '핵심 전술 포인트',
      icon: 'i-lucide-target',
      prompt: '이 포지션에서 가장 중요한 전술적/전략적 핵심 포인트가 뭐야?'
    },
    {
      label: '추천 최선수 3가지',
      icon: 'i-lucide-sparkles',
      prompt: '현재 차례에서 엔진이 추천하는 최선의 수 3가지는 뭐야?'
    },
    {
      label: '킹 안전도 & 활동성',
      icon: 'i-lucide-shield',
      prompt: '킹의 안전도와 기물 활동성을 비교 분석해 줘.'
    },
    {
      label: '오프닝/전략 플랜',
      icon: 'i-lucide-book-open',
      prompt: '오프닝/미들게임 원칙에 맞는 최선의 계획을 알려줘.'
    }
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

function getBadgeColor(cls?: MoveClassification) {
  switch (cls) {
    case 'brilliant': return 'info'
    case 'best': return 'success'
    case 'excellent': return 'success'
    case 'good': return 'neutral'
    case 'inaccuracy': return 'warning'
    case 'mistake': return 'warning'
    case 'blunder': return 'error'
    case 'missed_win': return 'error'
    default: return 'neutral'
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-neutral-900 overflow-hidden select-none">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500">
          <UIcon name="i-lucide-bot" class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              AI Chess Coach
            </span>
            <UBadge size="xs" color="primary" variant="subtle">
              Qwen 3.8 27B (Local)
            </UBadge>
          </div>
          <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
            Stockfish 18 Engine + 심리적 의도 분석
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <UBadge
          variant="outline"
          color="neutral"
          size="sm"
          class="font-mono text-xs"
        >
          {{ currentBoardTag }}
        </UBadge>
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          color="neutral"
          variant="ghost"
          aria-label="Clear chat"
          @click="coach.clearMessages()"
        />
      </div>
    </div>

    <!-- Messages Container -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
    >
      <!-- Welcome Message if empty -->
      <div
        v-if="coach.messages.value.length === 0"
        class="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 dark:text-neutral-500"
      >
        <div class="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
          <UIcon name="i-lucide-brain" class="w-8 h-8 text-primary-500" />
        </div>
        <h3 class="font-bold text-base text-neutral-700 dark:text-neutral-300 mb-1">
          의도 분석 AI 체스 코치에게 질문해보세요
        </h3>
        <p class="text-xs max-w-sm text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          체스판에서 기물을 움직이거나 PGN을 불러온 뒤, 왜 이 수를 두었는지 노림수를 질문하시면 스톡피시 분석과 함께 심리적 의도를 코칭해 드립니다.
        </p>

        <!-- Quick Starter Chips (Grid Layout) -->
        <div class="grid grid-cols-2 gap-2 w-full max-w-md">
          <button
            v-for="(item, idx) in quickPrompts"
            :key="idx"
            type="button"
            class="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-colors text-left text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer"
            @click="sendPrompt(item.prompt)"
          >
            <UIcon :name="item.icon" class="w-4 h-4 text-primary-500 shrink-0" />
            <span class="font-medium truncate">{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Message History -->
      <div
        v-for="msg in coach.messages.value"
        :key="msg.id"
        class="flex flex-col gap-1.5"
      >
        <!-- User Message -->
        <div
          v-if="msg.role === 'user'"
          class="flex justify-end"
        >
          <div class="max-w-[85%] rounded-2xl rounded-tr-xs bg-primary-600 text-white px-4 py-2.5 text-xs sm:text-sm shadow-xs leading-relaxed">
            {{ msg.content }}
          </div>
        </div>

        <!-- Assistant Message -->
        <div
          v-else
          class="flex items-start gap-2.5"
        >
          <div class="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0 mt-0.5">
            <UIcon name="i-lucide-bot" class="w-4 h-4" />
          </div>

          <div class="flex-1 max-w-[90%] space-y-2">
            <!-- Board Context & Engine Badge -->
            <div
              v-if="msg.engineSummary"
              class="bg-neutral-50 dark:bg-neutral-800/60 rounded-lg p-2.5 border border-neutral-200/80 dark:border-neutral-700/60 text-xs flex flex-col gap-1.5 font-mono"
            >
              <div class="flex items-center justify-between font-sans">
                <div class="flex items-center gap-1.5 font-bold">
                  <UIcon name="i-lucide-cpu" class="w-3.5 h-3.5 text-primary-500" />
                  <span>Stockfish Evaluation</span>
                </div>
                <div class="flex items-center gap-1">
                  <UBadge
                    v-if="msg.engineSummary.classification"
                    :color="getBadgeColor(msg.engineSummary.classification)"
                    size="xs"
                    class="capitalize font-sans"
                  >
                    {{ msg.engineSummary.classification }}
                  </UBadge>
                  <span class="font-bold text-neutral-900 dark:text-neutral-100">
                    {{ msg.engineSummary.eval.scoreFormatted }}
                  </span>
                </div>
              </div>

              <div class="text-[11px] text-neutral-600 dark:text-neutral-300 flex flex-wrap gap-x-3 gap-y-1">
                <span>Best: <strong class="text-primary-500">{{ msg.engineSummary.bestMoveSan || msg.engineSummary.eval.bestmove }}</strong></span>
                <span v-if="msg.engineSummary.pvSan" class="truncate max-w-[280px]">
                  Line: {{ msg.engineSummary.pvSan }}
                </span>
              </div>
            </div>

            <!-- Markdown Content -->
            <ChatComark
              v-if="msg.content"
              :value="msg.content"
              :streaming="msg.streaming"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Prompts Chips (Wrapped without horizontal scroll) -->
    <div class="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-200/60 dark:border-neutral-800/60 flex flex-wrap gap-1.5 shrink-0">
      <button
        v-for="(item, idx) in quickPrompts"
        :key="idx"
        type="button"
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        :disabled="coach.isStreaming.value"
        @click="sendPrompt(item.prompt)"
      >
        <UIcon :name="item.icon" class="text-primary-500 w-3 h-3" />
        <span>{{ item.label }}</span>
      </button>
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
