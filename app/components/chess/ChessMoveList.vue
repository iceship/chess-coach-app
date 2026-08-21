<script setup lang="ts">
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'
import type { MoveClassification } from '~~/shared/types/chess'
import { useChessSound } from '~~/app/composables/useChessSound'

const props = defineProps<{
  game: UseChessGameReturn
}>()

const { playMove } = useChessSound()

function onSelectMove(idx: number) {
  props.game.goToMove(idx)
  playMove()
}

interface MovePair {
  moveNumber: number
  white?: {
    index: number
    san: string
    classification?: MoveClassification
  }
  black?: {
    index: number
    san: string
    classification?: MoveClassification
  }
}

const movePairs = computed<MovePair[]>(() => {
  const pairs: MovePair[] = []
  const history = props.game.history.value

  for (let i = 0; i < history.length; i += 2) {
    const whiteMove = history[i]
    const blackMove = history[i + 1]

    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: whiteMove
        ? { index: i, san: whiteMove.san, classification: whiteMove.classification }
        : undefined,
      black: blackMove
        ? { index: i + 1, san: blackMove.san, classification: blackMove.classification }
        : undefined
    })
  }

  return pairs
})

function getAnnotationBadge(cls?: MoveClassification) {
  if (!cls) return null

  const configMap: Record<
    MoveClassification,
    { label: string, symbol: string, bgClass: string, textClass: string, title: string }
  > = {
    brilliant: {
      label: 'Brilliant',
      symbol: '!!',
      bgClass: 'bg-teal-500 shadow-sm',
      textClass: 'text-white',
      title: 'Brilliant Move (경이로운 수)'
    },
    best: {
      label: 'Best',
      symbol: '!',
      bgClass: 'bg-sky-500 shadow-sm',
      textClass: 'text-white',
      title: 'Great / Best Move (최선의 수)'
    },
    excellent: {
      label: 'Excellent',
      symbol: '✓',
      bgClass: 'bg-emerald-500',
      textClass: 'text-white',
      title: 'Excellent Move (훌륭한 수)'
    },
    good: {
      label: 'Good',
      symbol: '👍',
      bgClass: 'bg-green-600',
      textClass: 'text-white',
      title: 'Good Move (좋은 수)'
    },
    book: {
      label: 'Book',
      symbol: '📖',
      bgClass: 'bg-amber-700/80',
      textClass: 'text-white',
      title: 'Book Move (오프닝 정석)'
    },
    inaccuracy: {
      label: 'Inaccuracy',
      symbol: '?!',
      bgClass: 'bg-amber-400',
      textClass: 'text-neutral-900 font-extrabold',
      title: 'Inaccuracy (부정확한 수)'
    },
    mistake: {
      label: 'Mistake',
      symbol: '?',
      bgClass: 'bg-orange-500',
      textClass: 'text-white font-extrabold',
      title: 'Mistake (실수)'
    },
    missed_win: {
      label: 'Miss',
      symbol: '✕',
      bgClass: 'bg-rose-500',
      textClass: 'text-white font-bold',
      title: 'Missed Opportunity (놓친 기회)'
    },
    blunder: {
      label: 'Blunder',
      symbol: '??',
      bgClass: 'bg-red-600 animate-pulse',
      textClass: 'text-white font-black',
      title: 'Blunder (치명적인 블런더)'
    }
  }

  return configMap[cls] || null
}

watch(() => props.game.currentMoveIndex.value, (idx) => {
  if (idx >= 0) {
    nextTick(() => {
      const el = document.getElementById(`chess-move-${idx}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }
})
</script>

<template>
  <div class="w-full max-w-[540px] mx-auto flex flex-col gap-1.5 p-2">
    <div class="flex items-center justify-between px-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
      <span>Move History (Chess.com 리뷰 기보)</span>
      <span class="text-[10px] text-neutral-400 font-normal lowercase">클릭하여 국면 이동</span>
    </div>

    <div
      v-if="movePairs.length === 0"
      class="text-xs text-neutral-400 dark:text-neutral-500 italic py-4 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg"
    >
      No moves played yet.
    </div>

    <div
      v-else
      class="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-1 divide-y divide-neutral-100 dark:divide-neutral-800/80 text-xs"
    >
      <div
        v-for="pair in movePairs"
        :key="pair.moveNumber"
        class="grid grid-cols-[32px_1fr_1fr] items-center py-1 px-1.5 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 rounded transition-colors"
      >
        <!-- Move number -->
        <span class="text-neutral-400 font-mono select-none text-[11px]">{{ pair.moveNumber }}.</span>

        <!-- White Move -->
        <div class="flex items-center gap-1 min-w-0 pr-1">
          <button
            v-if="pair.white"
            :id="`chess-move-${pair.white.index}`"
            type="button"
            class="flex items-center justify-between gap-1.5 font-mono font-medium px-2 py-0.5 rounded transition-all cursor-pointer w-full text-left"
            :class="game.currentMoveIndex.value === pair.white.index
              ? 'bg-primary-500 text-white dark:bg-primary-600 font-bold shadow-xs'
              : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700/70'"
            @click="onSelectMove(pair.white.index)"
          >
            <span class="truncate">{{ pair.white.san }}</span>

            <!-- Chess.com Annotation Badge -->
            <span
              v-if="getAnnotationBadge(pair.white.classification)"
              :title="getAnnotationBadge(pair.white.classification)!.title"
              class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 select-none cursor-help"
              :class="[
                getAnnotationBadge(pair.white.classification)!.bgClass,
                getAnnotationBadge(pair.white.classification)!.textClass
              ]"
            >
              {{ getAnnotationBadge(pair.white.classification)!.symbol }}
            </span>
          </button>
          <span v-else class="text-neutral-300 px-2">-</span>
        </div>

        <!-- Black Move -->
        <div class="flex items-center gap-1 min-w-0 pl-1">
          <button
            v-if="pair.black"
            :id="`chess-move-${pair.black.index}`"
            type="button"
            class="flex items-center justify-between gap-1.5 font-mono font-medium px-2 py-0.5 rounded transition-all cursor-pointer w-full text-left"
            :class="game.currentMoveIndex.value === pair.black.index
              ? 'bg-primary-500 text-white dark:bg-primary-600 font-bold shadow-xs'
              : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700/70'"
            @click="onSelectMove(pair.black.index)"
          >
            <span class="truncate">{{ pair.black.san }}</span>

            <!-- Chess.com Annotation Badge -->
            <span
              v-if="getAnnotationBadge(pair.black.classification)"
              :title="getAnnotationBadge(pair.black.classification)!.title"
              class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 select-none cursor-help"
              :class="[
                getAnnotationBadge(pair.black.classification)!.bgClass,
                getAnnotationBadge(pair.black.classification)!.textClass
              ]"
            >
              {{ getAnnotationBadge(pair.black.classification)!.symbol }}
            </span>
          </button>
          <span v-else class="text-neutral-300 px-2">-</span>
        </div>
      </div>
    </div>
  </div>
</template>
