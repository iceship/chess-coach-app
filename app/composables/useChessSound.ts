/**
 * Composable for chess sound effects
 */
export function useChessSound() {
  let moveAudio: HTMLAudioElement | null = null
  let audioContext: AudioContext | null = null

  function initAudio() {
    if (import.meta.client && !moveAudio) {
      try {
        moveAudio = new Audio('/move.mp3')
        moveAudio.volume = 0.8
        moveAudio.preload = 'auto'
      } catch (err) {
        console.warn('Failed to load move.mp3:', err)
      }
    }
  }

  /**
   * Synthesizes a crisp wood-like piece placement sound using Web Audio API as fallback
   */
  function playSynthesizedMove() {
    if (!import.meta.client) return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return

      if (!audioContext) {
        audioContext = new AudioCtx()
      }

      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }

      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(320, audioContext.currentTime)
      osc.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.06)

      gain.gain.setValueAtTime(0.3, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.06)

      osc.connect(gain)
      gain.connect(audioContext.destination)

      osc.start()
      osc.stop(audioContext.currentTime + 0.06)
    } catch {
      // ignore audio context errors
    }
  }

  /**
   * Plays the move sound effect
   */
  function playMove() {
    if (!import.meta.client) return

    initAudio()

    if (moveAudio) {
      moveAudio.currentTime = 0
      moveAudio.play().catch(() => {
        // Fallback to Web Audio synthesis if HTMLAudioElement fails (e.g. autoplay policy)
        playSynthesizedMove()
      })
    } else {
      playSynthesizedMove()
    }
  }

  return {
    playMove
  }
}
