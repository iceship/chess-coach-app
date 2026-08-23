<script setup lang="ts">
import type { BoardOrientation, StockfishEvalResult } from '~~/shared/types/chess'

const props = defineProps<{
  engineEval?: StockfishEvalResult | null
  orientation?: BoardOrientation
  loading?: boolean
}>()

/**
 * Calculates the percentage height for the White side of the eval bar (0% - 100%).
 */
const whiteHeightPercent = computed(() => {
  if (!props.engineEval || !props.engineEval.score) return 50

  const { score, whiteScoreCp, winChance } = props.engineEval

  if (score?.type === 'mate') {
    if (score.value > 0) {
      // White has mate in N
      return 100
    } else {
      // Black has mate in N
      return 0
    }
  }

  if (typeof winChance === 'number') {
    return Math.max(3, Math.min(97, winChance))
  }

  // Fallback to centipawn sigmoid
  const cp = whiteScoreCp ?? 0
  const win = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
  return Math.max(3, Math.min(97, Math.round(win)))
})

/**
 * Height percentage of top segment and bottom segment based on orientation
 */
const bottomHeightPercent = computed(() => {
  const isFlipped = props.orientation === 'black'
  return isFlipped ? 100 - whiteHeightPercent.value : whiteHeightPercent.value
})

/**
 * Determines which side (White or Black) is currently leading
 */
const isWhiteLeading = computed(() => {
  if (!props.engineEval || !props.engineEval.score) return true
  if (props.engineEval.score?.type === 'mate') {
    return props.engineEval.score.value > 0
  }
  return (props.engineEval.whiteScoreCp ?? 0) >= 0
})

const scoreDisplay = computed(() => {
  if (!props.engineEval) return '0.0'
  return props.engineEval.scoreFormatted || '0.0'
})
</script>

<template>
  <div
    class="relative w-7 sm:w-8 h-full rounded-md overflow-hidden flex flex-col justify-end bg-neutral-800 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-sm select-none shrink-0"
    :title="`Engine Evaluation: ${scoreDisplay}`"
  >
    <!-- Top section (Black advantage when normal orientation) -->
    <div
      class="w-full flex-1 flex flex-col justify-start items-center transition-all duration-300 relative"
      :class="orientation === 'black' ? 'bg-white dark:bg-neutral-100 text-neutral-900' : 'bg-neutral-800 text-neutral-100'"
    >
      <!-- Score indicator if Black is winning or flipped -->
      <span
        v-if="!isWhiteLeading && orientation !== 'black'"
        class="text-[10px] sm:text-[11px] font-black font-mono pt-1.5 px-0.5 tracking-tighter"
      >
        {{ scoreDisplay }}
      </span>
      <span
        v-else-if="isWhiteLeading && orientation === 'black'"
        class="text-[10px] sm:text-[11px] font-black font-mono pt-1.5 px-0.5 tracking-tighter"
      >
        {{ scoreDisplay }}
      </span>
    </div>

    <!-- Bottom section (White advantage when normal orientation) with animated height -->
    <div
      class="w-full flex flex-col justify-end items-center transition-all duration-500 ease-out relative"
      :style="{ height: `${bottomHeightPercent}%` }"
      :class="orientation === 'black' ? 'bg-neutral-800 text-neutral-100' : 'bg-white dark:bg-neutral-100 text-neutral-900'"
    >
      <!-- Score indicator if White is winning or flipped -->
      <span
        v-if="isWhiteLeading && orientation !== 'black'"
        class="text-[10px] sm:text-[11px] font-black font-mono pb-1.5 px-0.5 tracking-tighter"
      >
        {{ scoreDisplay }}
      </span>
      <span
        v-else-if="!isWhiteLeading && orientation === 'black'"
        class="text-[10px] sm:text-[11px] font-black font-mono pb-1.5 px-0.5 tracking-tighter"
      >
        {{ scoreDisplay }}
      </span>
    </div>

    <!-- Loading subtle pulse overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 bg-primary-500/15 animate-pulse pointer-events-none"
    />
  </div>
</template>
