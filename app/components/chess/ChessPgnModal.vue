<script setup lang="ts">
import type { UseChessGameReturn } from '~~/app/composables/useChessGame'

const props = defineProps<{
  game: UseChessGameReturn
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const pgnText = ref('')
const errorMessage = ref<string | null>(null)

const sampleGames = [
  {
    title: 'Chess.com 실전 대국 (White 727 vs Black 700)',
    description: '10...d4 블런더로 퀸 침투(11.Qxb7)를 허용하며 승부가 갈린 실전 대국',
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.21"]
[Round "-"]
[White "White"]
[Black "Black"]
[Result "1-0"]
[ECO "B07"]
[WhiteElo "727"]
[BlackElo "700"]
[TimeControl "180+2"]
[Termination "White won by resignation"]

1. e4 {[%clk 0:03:01][%timestamp 10]} 1... d6 {[%clk 0:03:00.2][%timestamp 18]}
2. Qf3 $6 {[%clk 0:03:00.9][%timestamp 21][%c_effect
f3;square;f3;type;Inaccuracy;persistent;true]} 2... Nf6 {[%clk
0:03:01.1][%timestamp 11]} 3. Bc4 {[%clk 0:03:01.3][%timestamp 16]} 3... g6
{[%clk 0:03:01.6][%timestamp 15]} 4. h3 {[%clk 0:03:01.6][%timestamp 17]} 4...
Bg7 {[%clk 0:03:02.8][%timestamp 8]} 5. d3 {[%clk 0:03:02.3][%timestamp 13]}
5... O-O {[%clk 0:03:03.3][%timestamp 15]} 6. Nc3 {[%clk 0:03:02.6][%timestamp
17]} 6... a6 {[%clk 0:02:47.5][%timestamp 178]} 7. Nge2 {[%clk
0:03:02.8][%timestamp 18]} 7... b5 $2 {[%clk 0:02:48.1][%timestamp 14][%c_effect
b5;square;b5;type;Mistake;persistent;true]} 8. Bb3 $9 {[%clk
0:03:02.9][%timestamp 19]} 8... Bb7 {[%clk 0:02:45.1][%timestamp 50]} 9. Bg5
{[%clk 0:03:00.6][%timestamp 43]} 9... d5 $2 {[%clk 0:02:32.3][%timestamp
148][%c_effect d5;square;d5;type;Mistake;persistent;true]} 10. e5 {[%clk
0:03:00.5][%timestamp 21]} 10... d4 $4 {[%clk 0:02:28.3][%timestamp 60][%c_effect
d4;square;d4;type;Blunder;persistent;true]} 11. Qxb7 $1 {[%clk
0:02:54.3][%timestamp 82][%c_effect
b7;square;b7;type;GreatFind;persistent;true]} 11... dxc3 {[%clk
0:02:16.1][%timestamp 142]} 12. bxc3 {[%clk 0:02:45.4][%timestamp 109]} 12...
Nbd7 {[%clk 0:02:10][%timestamp 81]} 13. Bxf6 $9 {[%clk 0:02:44.2][%timestamp
32]} 13... Nxf6 $9 {[%clk 0:02:07.4][%timestamp 46]} 14. exf6 {[%clk
0:02:44.9][%timestamp 13]} 14... Bxf6 {[%clk 0:02:09.1][%timestamp 3]} 15. O-O
{[%clk 0:02:42.9][%timestamp 40]} 15... Bxc3 $2 {[%clk 0:02:09.5][%timestamp
16][%c_effect
c3;square;c3;type;Mistake;size;100%25;animated;false;persistent;true]} 16. Nxc3
{[%clk 0:02:43.4][%c_effect
g1;square;g1;type;Winner;animated;true,g8;square;g8;type;ResignBlack;animated;true][%timestamp
15]} 1-0`
  },
  {
    title: '모피의 오페라 하우스 명국 (The Opera Game, 1858)',
    description: '체스 역사상 가장 아름다운 기물 전개와 퀸 희생 체크메이트',
    pgn: `1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#`
  },
  {
    title: '카스파로프의 불멸의 대국 (Kasparov vs Topalov, 1999)',
    description: '24.Rxd4!! 루크 희생과 킹 사냥으로 이어지는 전설적인 명국',
    pgn: `1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7`
  }
]

function loadSample(pgn: string) {
  pgnText.value = pgn.trim()
  errorMessage.value = null
}

function handleLoadPgn() {
  if (!pgnText.value.trim()) {
    errorMessage.value = 'PGN text cannot be empty.'
    return
  }

  const result = props.game.loadPgn(pgnText.value.trim())
  if (result.success) {
    emit('update:open', false)
    pgnText.value = ''
    errorMessage.value = null
  } else {
    errorMessage.value = result.error || 'Failed to parse PGN.'
  }
}
</script>

<template>
  <UModal
    :open="open"
    title="PGN 기보 불러오기 (Load Game)"
    description="Chess.com이나 Lichess의 PGN 기보 텍스트를 그대로 붙여넣거나 아래 추천 대국을 1클릭으로 불러올 수 있습니다."
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Sample games selection -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            추천 예제 게임 (Quick Samples)
          </label>
          <div class="grid grid-cols-1 gap-2">
            <button
              v-for="(sample, idx) in sampleGames"
              :key="idx"
              type="button"
              class="text-left p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-primary-500 dark:hover:border-primary-500 bg-neutral-50 dark:bg-neutral-900/60 transition-colors cursor-pointer"
              @click="loadSample(sample.pgn)"
            >
              <div class="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <UIcon name="i-lucide-play" class="text-primary-500 w-3.5 h-3.5" />
                {{ sample.title }}
              </div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {{ sample.description }}
              </div>
            </button>
          </div>
        </div>

        <!-- PGN Textarea -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            PGN 입력창 (Chess.com / Lichess PGN 지원)
          </label>
          <UTextarea
            v-model="pgnText"
            placeholder="[Event &quot;Live Chess&quot;]... 1. e4 e5 2. Nf3..."
            :rows="6"
            class="font-mono text-xs"
          />
          <span v-if="errorMessage" class="text-xs text-red-500 font-medium">
            {{ errorMessage }}
          </span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="emit('update:open', false)"
        />
        <UButton
          label="Load Game (불러오기)"
          color="primary"
          icon="i-lucide-upload"
          @click="handleLoadPgn"
        />
      </div>
    </template>
  </UModal>
</template>
