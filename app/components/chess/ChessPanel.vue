<script setup lang="ts">
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'
import type { EngineSummaryData } from '~~/shared/types/chess'

const props = defineProps<{
  game: UseChessGameReturn
  engineSummary?: EngineSummaryData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  move: [from: string, to: string]
  askAboutCurrentMove: []
}>()

const pgnModalOpen = ref(false)
const toast = useToast()

function copyFen() {
  navigator.clipboard.writeText(props.game.fen.value)
  toast.add({
    title: 'FEN Copied',
    description: 'Current board FEN copied to clipboard.',
    icon: 'i-lucide-check',
    color: 'success',
    duration: 2000
  })
}

const matchInfo = computed(() => {
  const h = props.game.headers.value
  if (!h || (!h.white && !h.black && !h.event)) return null

  const whiteText = h.whiteElo ? `White (${h.whiteElo})` : 'White'
  const blackText = h.blackElo ? `Black (${h.blackElo})` : 'Black'
  const resultText = h.result ? ` • ${h.result}` : ''
  const ecoText = h.eco ? ` [${h.eco}]` : ''

  return {
    whiteText,
    blackText,
    resultText,
    ecoText
  }
})
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto custom-scrollbar bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 select-none">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-swords" class="w-5 h-5 text-primary-500" />
        <span class="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          Chess Board (인터랙티브 보드)
        </span>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          v-if="game.mainHistory.value.length > 0"
          :loading="game.isReviewing.value"
          icon="i-lucide-sparkles"
          size="xs"
          color="warning"
          variant="subtle"
          label="Game Review"
          title="스톡피시로 전 수순을 자동 분석하여 블런더/실수/최선수를 계산합니다"
          @click="game.runFullGameReview()"
        />
        <UButton
          icon="i-lucide-copy"
          size="xs"
          color="neutral"
          variant="ghost"
          label="FEN"
          aria-label="Copy FEN"
          @click="copyFen"
        />
        <UButton
          icon="i-lucide-file-text"
          size="xs"
          color="primary"
          variant="soft"
          label="PGN"
          aria-label="Import PGN"
          @click="pgnModalOpen = true"
        />
      </div>
    </div>

    <!-- Match Information Banner (If PGN loaded) -->
    <div
      v-if="matchInfo"
      class="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs shrink-0"
    >
      <div class="flex items-center gap-2 font-medium">
        <span class="text-neutral-900 dark:text-neutral-100">⚪ {{ matchInfo.whiteText }}</span>
        <span class="text-neutral-400">vs</span>
        <span class="text-neutral-900 dark:text-neutral-100">⚫ {{ matchInfo.blackText }}</span>
      </div>
      <div class="text-neutral-500 font-mono text-[11px]">
        {{ matchInfo.resultText }} {{ matchInfo.ecoText }}
      </div>
    </div>

    <!-- Review Accuracy Stats Banner (if reviewed) -->
    <div
      v-if="game.reviewStats.value"
      class="px-4 py-2 bg-primary-500/10 border-b border-primary-500/20 flex items-center justify-between text-xs shrink-0"
    >
      <div class="flex items-center gap-3">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
          <UIcon name="i-lucide-check-circle-2" class="text-primary-500 w-4 h-4" />
          Accuracy (정확도):
        </span>
        <span class="font-mono text-neutral-900 dark:text-white font-semibold">
          ⚪ {{ game.reviewStats.value.whiteAccuracy }}%
        </span>
        <span class="font-mono text-neutral-900 dark:text-white font-semibold">
          ⚫ {{ game.reviewStats.value.blackAccuracy }}%
        </span>
      </div>
      <div class="text-[11px] text-neutral-500 flex gap-2">
        <span class="text-red-500 font-semibold font-mono">
          {{ (game.reviewStats.value.stats.white.blunder || 0) + (game.reviewStats.value.stats.black.blunder || 0) }} Blunders
        </span>
        <span class="text-orange-500 font-semibold font-mono">
          {{ (game.reviewStats.value.stats.white.mistake || 0) + (game.reviewStats.value.stats.black.mistake || 0) }} Mistakes
        </span>
      </div>
    </div>

    <!-- Active Variation Branch Banner (Chess.com Style) -->
    <div
      v-if="game.isVariation.value"
      class="px-4 py-2 bg-amber-500/15 dark:bg-amber-500/20 border-b border-amber-500/30 flex items-center justify-between text-xs shrink-0"
    >
      <div class="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
        <UIcon name="i-lucide-git-branch" class="text-amber-500 w-4 h-4 shrink-0" />
        <span>대체 수순 탐색 중 (Variation Line)</span>
        <span class="text-neutral-400 font-normal hidden sm:inline">• 원본 기보 보존됨</span>
      </div>
      <UButton
        icon="i-lucide-play"
        size="xs"
        color="primary"
        variant="solid"
        label="본선 복귀 (Resume)"
        @click="game.resumeMainLine()"
      />
    </div>

    <!-- Main board container (clean layout without nested scrollbars) -->
    <div class="flex-1 flex flex-col items-center p-2 gap-2 min-h-0">
      <!-- Chessboard with integrated vertical Eval Bar -->
      <ChessBoard
        :game="game"
        @move="(from, to) => emit('move', from, to)"
      />

      <!-- Real-time Multi-Line Engine Evaluation (Chess.com Style evaluation-lines-lines) -->
      <ChessEvalLines
        :engine-eval="game.engineEval.value"
        :loading="game.isEngineEvaluating.value"
        :multipv="game.multipv.value"
        @update:multipv="game.setMultipv($event)"
        @hover-move="game.setHoverArrow($event)"
      />

      <!-- Navigation & Controls -->
      <ChessNavigation
        :game="game"
        @open-pgn="pgnModalOpen = true"
      />

      <!-- Move History List with Chess.com Style Variations -->
      <ChessMoveList :game="game" />
    </div>

    <!-- PGN Modal -->
    <ChessPgnModal
      :game="game"
      :open="pgnModalOpen"
      @update:open="pgnModalOpen = $event"
    />
  </div>
</template>
