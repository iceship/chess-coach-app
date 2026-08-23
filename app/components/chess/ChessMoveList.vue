<script setup lang="ts">
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'
import type { MoveClassification } from '~~/shared/types/chess'
import { useChessSound } from '~~/app/composables/useChessSound'

const props = defineProps<{
  game: UseChessGameReturn
}>()

const { playMove } = useChessSound()

function onSelectMainMove(idx: number) {
  props.game.goToMainMove(idx)
  playMove()
}

function onSelectVariationMove(offset: number) {
  const targetIndex = props.game.variationBranchIndex.value + 1 + offset
  props.game.goToMove(targetIndex)
  playMove()
}

function onResume() {
  props.game.resumeMainLine()
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
  const mainHistory = props.game.mainHistory.value

  for (let i = 0; i < mainHistory.length; i += 2) {
    const whiteMove = mainHistory[i]
    const blackMove = mainHistory[i + 1]

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
      textClass: 'text-white font-bold',
      title: 'Mistake (실수)'
    },
    blunder: {
      label: 'Blunder',
      symbol: '??',
      bgClass: 'bg-red-500 shadow-sm',
      textClass: 'text-white font-extrabold',
      title: 'Blunder (치명적 블런더)'
    },
    missed_win: {
      label: 'Missed Win',
      symbol: '✕',
      bgClass: 'bg-rose-600',
      textClass: 'text-white font-bold',
      title: 'Missed Win (승리 기회 놓침)'
    }
  }

  return configMap[cls] || null
}

const moveListContainer = ref<HTMLElement | null>(null)

// Auto-scroll to active move
watch(() => props.game.currentMoveIndex.value, (newIdx) => {
  nextTick(() => {
    if (!moveListContainer.value || newIdx < 0) return
    const el = document.getElementById(`chess-move-${newIdx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
})
</script>

<template>
  <div class="w-full max-w-[540px] mx-auto flex flex-col gap-1.5 p-2">
    <!-- Header -->
    <div class="flex items-center justify-between px-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
      <div class="flex items-center gap-1.5">
        <UIcon name="i-lucide-list-ordered" class="w-4 h-4 text-primary-500" />
        <span>Move History (기보 목록)</span>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="game.isVariation.value" class="text-amber-500 font-semibold flex items-center gap-1 text-[11px]">
          <UIcon name="i-lucide-git-branch" class="w-3.5 h-3.5" />
          Variation Active
        </span>
        <span class="text-[11px] font-mono text-neutral-400">
          {{ game.mainHistory.value.length }} Total Moves
        </span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="game.mainHistory.value.length === 0"
      class="text-center py-4 text-xs text-neutral-400 dark:text-neutral-500 italic bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800"
    >
      No moves played yet.
    </div>

    <!-- Move List Table with Variation Branch Support (Chess.com Style) -->
    <div
      v-else
      ref="moveListContainer"
      class="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-1 divide-y divide-neutral-100 dark:divide-neutral-800/80 text-xs"
    >
      <template
        v-for="pair in movePairs"
        :key="pair.moveNumber"
      >
        <!-- Main Line Move Pair Row -->
        <div
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
              :class="!game.isVariation.value && game.currentMoveIndex.value === pair.white.index
                ? 'bg-primary-500 text-white dark:bg-primary-600 font-bold shadow-xs'
                : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700/70'"
              @click="onSelectMainMove(pair.white.index)"
            >
              <span class="truncate">{{ pair.white.san }}</span>

              <!-- Annotation Badge -->
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
              :class="!game.isVariation.value && game.currentMoveIndex.value === pair.black.index
                ? 'bg-primary-500 text-white dark:bg-primary-600 font-bold shadow-xs'
                : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700/70'"
              @click="onSelectMainMove(pair.black.index)"
            >
              <span class="truncate">{{ pair.black.san }}</span>

              <!-- Annotation Badge -->
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

        <!-- Chess.com Style Variation Sub-Row (Rendered directly under the branched move) -->
        <div
          v-if="game.isVariation.value && Math.floor(game.variationBranchIndex.value / 2) + 1 === pair.moveNumber"
          class="my-1 mx-1.5 p-2 rounded-lg bg-amber-500/10 border-l-3 border-amber-500 flex flex-col gap-1.5 text-[11px]"
        >
          <div class="flex items-center justify-between border-b border-amber-500/20 pb-1">
            <span class="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
              <UIcon name="i-lucide-git-branch" class="w-3.5 h-3.5 text-amber-500" />
              <span>대체 수순 탐색 (Variation Line)</span>
            </span>

            <!-- Resume Button -->
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-600 hover:bg-primary-700 text-white font-semibold text-[10px] shadow-2xs transition-colors cursor-pointer"
              @click="onResume"
            >
              <UIcon name="i-lucide-play" class="w-3 h-3" />
              <span>본선 복귀 (Resume)</span>
            </button>
          </div>

          <!-- Variation Moves Inline Sequence -->
          <div class="font-mono flex flex-wrap items-center gap-1 text-neutral-800 dark:text-neutral-200">
            <span class="text-neutral-400 italic mr-0.5"><i>(</i></span>
            <span
              v-for="(vMove, vIdx) in game.variationHistory.value"
              :key="vIdx"
              class="inline-flex items-center px-1.5 py-0.5 rounded transition-all cursor-pointer"
              :class="game.currentMoveIndex.value === game.variationBranchIndex.value + 1 + vIdx
                ? 'bg-amber-500 text-white font-bold shadow-2xs'
                : 'hover:bg-amber-500/20 text-neutral-800 dark:text-neutral-200'"
              @click="onSelectVariationMove(vIdx)"
            >
              <span v-if="vIdx === 0 || vMove.turn === 'w'" class="text-neutral-400 mr-0.5 text-[10px]">
                {{ vMove.moveNumber }}{{ vMove.turn === 'b' ? '...' : '.' }}
              </span>
              <span>{{ vMove.san }}</span>
            </span>
            <span class="text-neutral-400 italic ml-0.5"><i>)</i></span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
