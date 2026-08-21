<script setup lang="ts">
import type { EngineSummaryData, MoveClassification } from '~~/shared/types/chess'

const props = defineProps<{
  engineSummary?: EngineSummaryData | null
  loading?: boolean
}>()

const classificationConfig = computed(() => {
  const cls = props.engineSummary?.classification
  if (!cls) return null

  const map: Record<MoveClassification, { label: string, color: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info', icon: string }> = {
    brilliant: { label: 'Brilliant', color: 'info', icon: 'i-lucide-sparkles' },
    best: { label: 'Best Move', color: 'success', icon: 'i-lucide-star' },
    excellent: { label: 'Excellent', color: 'success', icon: 'i-lucide-check-circle' },
    good: { label: 'Good', color: 'primary', icon: 'i-lucide-thumbs-up' },
    book: { label: 'Book Move', color: 'neutral', icon: 'i-lucide-book-open' },
    inaccuracy: { label: 'Inaccuracy', color: 'warning', icon: 'i-lucide-alert-triangle' },
    mistake: { label: 'Mistake', color: 'warning', icon: 'i-lucide-help-circle' },
    blunder: { label: 'Blunder', color: 'error', icon: 'i-lucide-x-circle' },
    missed_win: { label: 'Missed Win', color: 'error', icon: 'i-lucide-heart-crack' }
  }

  return map[cls] || { label: cls, color: 'neutral', icon: 'i-lucide-info' }
})

const evalScore = computed(() => props.engineSummary?.eval.scoreFormatted || '0.0')
const winChance = computed(() => props.engineSummary?.eval.winChance ?? 50)
const bestMove = computed(() => props.engineSummary?.bestMoveSan || props.engineSummary?.eval.bestmove || '-')
const depth = computed(() => props.engineSummary?.eval.depth || 15)
</script>

<template>
  <div
    v-if="engineSummary || loading"
    class="w-full max-w-[540px] mx-auto p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 flex flex-col gap-2"
  >
    <!-- Header with Score and Best Move -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UBadge
          :color="evalScore.startsWith('+') ? 'neutral' : 'neutral'"
          variant="solid"
          size="md"
          class="font-mono font-bold text-sm px-2 py-0.5"
        >
          <UIcon v-if="loading" name="i-lucide-loader" class="animate-spin mr-1" />
          {{ evalScore }}
        </UBadge>

        <UBadge
          v-if="classificationConfig"
          :color="classificationConfig.color"
          variant="subtle"
          size="sm"
          class="font-semibold"
        >
          <UIcon :name="classificationConfig.icon" class="mr-1 w-3.5 h-3.5" />
          {{ classificationConfig.label }}
        </UBadge>
      </div>

      <div class="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
        <span class="font-medium text-neutral-700 dark:text-neutral-300">
          Best: <span class="font-mono text-primary-500 font-bold">{{ bestMove }}</span>
        </span>
        <span class="text-neutral-400 text-[10px]">(d:{{ depth }})</span>
      </div>
    </div>

    <!-- Win percentage bar -->
    <div class="flex flex-col gap-1">
      <div class="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
        <div
          class="bg-neutral-100 transition-all duration-500"
          :style="{ width: `${winChance}%` }"
        />
        <div
          class="bg-neutral-800 transition-all duration-500 flex-1"
        />
      </div>
      <div class="flex justify-between text-[10px] text-neutral-400 font-mono">
        <span>White: {{ winChance }}%</span>
        <span>Black: {{ 100 - winChance }}%</span>
      </div>
    </div>
  </div>
</template>
