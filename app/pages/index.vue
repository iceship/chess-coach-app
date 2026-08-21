<script setup lang="ts">
import { useChessGame } from '~~/app/composables/useChessGame'
import { useCoachChat } from '~~/app/composables/useCoachChat'

const game = useChessGame()
const coach = useCoachChat()

const activeTab = ref<'board' | 'coach'>('board')

// When user makes a move on the board, auto-trigger quick evaluation or prepare context
function handleMove() {
  // If in mobile tab, keep board
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-neutral-100 dark:bg-neutral-900">
    <!-- Mobile Tab Switcher (Visible on < lg screens) -->
    <div class="lg:hidden flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 shrink-0">
      <div class="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 w-full max-w-sm mx-auto">
        <button
          type="button"
          class="flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5"
          :class="activeTab === 'board' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'"
          @click="activeTab = 'board'"
        >
          <UIcon name="i-lucide-swords" class="w-4 h-4" />
          <span>Chess Board</span>
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5"
          :class="activeTab === 'coach' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'"
          @click="activeTab = 'coach'"
        >
          <UIcon name="i-lucide-bot" class="w-4 h-4" />
          <span>AI Coach</span>
          <UBadge v-if="coach.isStreaming.value" color="primary" variant="solid" size="xs" class="ml-1 animate-pulse">
            Analyzing
          </UBadge>
        </button>
      </div>
    </div>

    <!-- Desktop Split Screen (2 columns) & Mobile Tab Content -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 min-w-0 overflow-hidden">
      <!-- Left Panel: Chess Board & Controls (Cols 1-6 on desktop) -->
      <div
        class="h-full min-h-0 overflow-y-auto lg:col-span-6 xl:col-span-6"
        :class="activeTab === 'board' ? 'block' : 'hidden lg:block'"
      >
        <ChessPanel
          :game="game"
          :engine-summary="coach.latestEngineSummary.value"
          :loading="coach.isStreaming.value"
          @move="handleMove"
        />
      </div>

      <!-- Right Panel: AI Chess Coach Chat (Cols 7-12 on desktop) -->
      <div
        class="h-full min-h-0 overflow-hidden lg:col-span-6 xl:col-span-6 flex flex-col"
        :class="activeTab === 'coach' ? 'flex' : 'hidden lg:flex'"
      >
        <CoachPanel
          :game="game"
          :coach="coach"
        />
      </div>
    </div>
  </div>
</template>
