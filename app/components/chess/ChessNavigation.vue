<script setup lang="ts">
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'

const props = defineProps<{
  game: UseChessGameReturn
}>()

const emit = defineEmits<{
  openPgn: []
}>()

const moveStatusText = computed(() => {
  if (props.game.currentMoveIndex.value === -1) {
    return 'Start Position'
  }
  const current = props.game.playedMove.value
  if (!current) return 'Start Position'

  const turnLabel = current.turn === 'w' ? 'White' : 'Black'
  return `${current.moveNumber}. ${current.san} (${turnLabel})`
})

const isAtStart = computed(() => props.game.currentMoveIndex.value === -1)
const isAtEnd = computed(() => {
  if (props.game.history.value.length === 0) return true
  return props.game.currentMoveIndex.value === props.game.history.value.length - 1
})

// Keyboard navigation listeners
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    // Only capture if not typing in an input/textarea
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    if (e.key === 'ArrowLeft') {
      props.game.prevMove()
    } else if (e.key === 'ArrowRight') {
      props.game.nextMove()
    } else if (e.key === 'ArrowUp') {
      props.game.goToStart()
    } else if (e.key === 'ArrowDown') {
      props.game.goToEnd()
    }
  }

  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
})
</script>

<template>
  <div class="flex flex-col gap-2 p-2 w-full max-w-[540px] mx-auto">
    <!-- Move Status & Turn Info -->
    <div class="flex items-center justify-between px-2 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
      <div class="flex items-center gap-1.5">
        <span
          class="w-2.5 h-2.5 rounded-full border border-neutral-400 dark:border-neutral-500"
          :class="game.turn.value === 'w' ? 'bg-white' : 'bg-neutral-900 dark:bg-black'"
        />
        <span>{{ game.turn.value === 'w' ? 'White to move' : 'Black to move' }}</span>
      </div>

      <div class="flex items-center gap-2">
        <UBadge
          variant="subtle"
          color="neutral"
          size="sm"
          class="font-mono text-xs"
        >
          {{ moveStatusText }}
        </UBadge>
        <span class="text-neutral-400">
          ({{ game.currentMoveIndex.value + 1 }} / {{ game.history.value.length }})
        </span>
      </div>
    </div>

    <!-- Controller Buttons -->
    <div class="flex items-center justify-between gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700/60">
      <!-- Navigation controls -->
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevrons-left"
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="isAtStart"
          aria-label="First move"
          @click="game.goToStart()"
        />
        <UButton
          icon="i-lucide-chevron-left"
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="isAtStart"
          aria-label="Previous move"
          @click="game.prevMove()"
        />
        <UButton
          icon="i-lucide-chevron-right"
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="isAtEnd"
          aria-label="Next move"
          @click="game.nextMove()"
        />
        <UButton
          icon="i-lucide-chevrons-right"
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="isAtEnd"
          aria-label="Last move"
          @click="game.goToEnd()"
        />
      </div>

      <!-- Board utility actions -->
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-arrow-up-down"
          size="sm"
          color="neutral"
          variant="ghost"
          label="Flip"
          aria-label="Flip board"
          @click="game.flipBoard()"
        />
        <UButton
          icon="i-lucide-file-text"
          size="sm"
          color="neutral"
          variant="soft"
          label="PGN"
          aria-label="Load PGN"
          @click="emit('openPgn')"
        />
        <UButton
          icon="i-lucide-rotate-ccw"
          size="sm"
          color="neutral"
          variant="ghost"
          aria-label="Reset board"
          @click="game.resetGame()"
        />
      </div>
    </div>
  </div>
</template>
