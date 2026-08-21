<script setup lang="ts">
import type { EngineLine, StockfishEvalResult } from '~~/shared/types/chess'

const props = defineProps<{
  engineEval?: StockfishEvalResult | null
  loading?: boolean
  multipv?: number
}>()

const emit = defineEmits<{
  'update:multipv': [value: number]
  'hoverMove': [uci?: string]
}>()

const lines = computed<EngineLine[]>(() => {
  return props.engineEval?.lines || []
})

const displayLines = computed<EngineLine[]>(() => {
  const max = props.multipv || 2
  return lines.value.slice(0, max)
})
</script>

<template>
  <div
    class="w-full max-w-[540px] mx-auto flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 p-2.5 shadow-2xs select-none transition-all duration-200 shrink-0"
    :class="multipv === 3 ? 'min-h-[124px]' : 'min-h-[92px]'"
  >
    <!-- Header: Engine Status, Depth, MultiPV Selector -->
    <div class="h-6 flex items-center justify-between px-1 text-xs border-b border-neutral-100 dark:border-neutral-800/80 pb-1.5 mb-1 shrink-0">
      <div class="flex items-center gap-2">
        <span class="relative flex h-2 w-2">
          <span
            v-if="loading"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
          />
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span class="font-bold text-[11px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
          Stockfish Engine (실시간 라인 분석)
        </span>
        <span class="text-[10px] text-neutral-400 font-mono">
          Depth {{ engineEval?.depth || 16 }}
        </span>
      </div>

      <!-- MultiPV Lines Toggle (2 vs 3 lines) -->
      <div class="flex items-center gap-1 text-[11px]">
        <span class="text-neutral-400 text-[10px]">Lines:</span>
        <button
          type="button"
          class="px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer"
          :class="multipv === 2 || !multipv
            ? 'bg-primary-500 text-white font-bold'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'"
          @click="emit('update:multipv', 2)"
        >
          2
        </button>
        <button
          type="button"
          class="px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer"
          :class="multipv === 3
            ? 'bg-primary-500 text-white font-bold'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'"
          @click="emit('update:multipv', 3)"
        >
          3
        </button>
      </div>
    </div>

    <!-- Lines Area: Ample row heights to completely prevent vertical clipping -->
    <div class="flex flex-col gap-1.5 text-xs justify-center flex-1 py-0.5">
      <!-- Loading Skeleton (matches exact height of lines) -->
      <template v-if="displayLines.length === 0">
        <div
          v-for="i in (multipv || 2)"
          :key="i"
          class="h-7 flex items-center gap-2 px-1.5 animate-pulse"
        >
          <div class="w-12 h-5 bg-neutral-200 dark:bg-neutral-800 rounded shrink-0" />
          <div class="flex-1 h-4 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
        </div>
      </template>

      <!-- MultiPV Line rows (Roomy single line with smooth horizontal scrolling) -->
      <template v-else>
        <div
          v-for="line in displayLines"
          :key="line.multipv"
          class="h-7 flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-colors shrink-0"
        >
          <!-- Score Badge (e.g. +9.09 or -2.34) -->
          <span
            class="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 shadow-2xs leading-none"
            :class="line.whiteScoreCp >= 0
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700'
              : 'bg-neutral-900 dark:bg-neutral-950 text-white border border-neutral-800'"
          >
            {{ line.scoreFormatted }}
          </span>

          <!-- Sequence of SAN Nodes (Single-line with smooth horizontal scrolling on overflow) -->
          <div class="flex-1 font-mono text-[11px] whitespace-nowrap overflow-x-auto no-scrollbar flex items-center h-full">
            <template v-if="line.pvNodes && line.pvNodes.length > 0">
              <span
                v-for="(node, idx) in line.pvNodes"
                :key="idx"
                class="inline-flex items-center mr-1.5 hover:text-primary-500 hover:underline cursor-pointer transition-colors shrink-0 leading-none"
                @mouseenter="emit('hoverMove', node.uci)"
                @mouseleave="emit('hoverMove', undefined)"
              >
                <span v-if="idx === 0 || node.turn === 'w'" class="text-neutral-400 font-normal mr-0.5">
                  {{ node.moveNumber }}{{ node.turn === 'b' ? '...' : '.' }}
                </span>
                <span class="font-medium font-mono text-neutral-900 dark:text-neutral-100">
                  {{ node.san }}
                </span>
              </span>
            </template>
            <span v-else class="text-neutral-400 shrink-0">
              {{ line.pvSan || line.pvUci }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
