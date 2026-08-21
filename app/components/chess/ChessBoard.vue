<script setup lang="ts">
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'

const props = defineProps<{
  game: UseChessGameReturn
}>()

const emit = defineEmits<{
  move: [from: string, to: string]
}>()

const boardContainer = ref<HTMLElement | null>(null)
let cg: Api | null = null

function updateBoard() {
  if (!cg) return

  const lastMove: Key[] | undefined = props.game.playedMove.value
    ? [props.game.playedMove.value.from as Key, props.game.playedMove.value.to as Key]
    : undefined

  const shapes = props.game.arrows.value.map(a => ({
    orig: a.orig,
    dest: a.dest,
    brush: a.brush
  }))

  cg.set({
    fen: props.game.fen.value,
    orientation: props.game.orientation.value,
    turnColor: props.game.turn.value === 'w' ? 'white' : 'black',
    check: props.game.isCheck.value,
    lastMove,
    movable: {
      free: false,
      color: 'both',
      dests: props.game.getDests()
    },
    drawable: {
      enabled: true,
      visible: true,
      shapes
    }
  })
}

function initChessground() {
  if (!boardContainer.value) return

  const lastMove: Key[] | undefined = props.game.playedMove.value
    ? [props.game.playedMove.value.from as Key, props.game.playedMove.value.to as Key]
    : undefined

  const config: Config = {
    fen: props.game.fen.value,
    orientation: props.game.orientation.value,
    turnColor: props.game.turn.value === 'w' ? 'white' : 'black',
    check: props.game.isCheck.value,
    lastMove,
    movable: {
      free: false,
      color: 'both',
      dests: props.game.getDests(),
      events: {
        after: (orig: Key, dest: Key) => {
          const success = props.game.makeMove({ from: orig, to: dest })
          if (success) {
            emit('move', orig, dest)
          }
          updateBoard()
        }
      }
    },
    draggable: {
      enabled: true,
      showGhost: true
    },
    highlight: {
      lastMove: true,
      check: true
    },
    drawable: {
      enabled: true,
      visible: true,
      shapes: props.game.arrows.value
    }
  }

  cg = Chessground(boardContainer.value, config)
}

// Watch state changes and synchronize with Chessground
watch(() => props.game.fen.value, () => updateBoard())
watch(() => props.game.orientation.value, () => updateBoard())
watch(() => props.game.arrows.value, () => updateBoard(), { deep: true })
watch(() => props.game.playedMove.value, () => updateBoard())

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initChessground()

  if (boardContainer.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      cg?.redrawAll()
    })
    resizeObserver.observe(boardContainer.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  cg?.destroy()
  cg = null
})
</script>

<template>
  <div class="relative w-full max-w-[540px] mx-auto aspect-square flex items-center justify-center p-2">
    <div
      ref="boardContainer"
      class="w-full h-full shadow-lg rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
    />
  </div>
</template>
