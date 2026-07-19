"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type Ripple = { id: number; x: number; y: number }

/**
 * Global press feedback:
 *  - plays a short synthesized "blip" via the Web Audio API (no asset needed)
 *  - spawns an expanding ripple where the user pressed
 *  - gives the whole page a tiny springy bounce
 *
 * Sound is muted until the first user gesture (browser autoplay policy) and
 * can be toggled off with the speaker button.
 */
export function InteractionFx() {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [muted, setMuted] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const idRef = useRef(0)

  const playBlip = useCallback(() => {
    if (muted) return
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtxRef.current = new Ctx()
      }
      const ac = audioCtxRef.current
      if (ac.state === "suspended") void ac.resume()

      const now = ac.currentTime
      const osc = ac.createOscillator()
      const gain = ac.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.09)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

      osc.connect(gain).connect(ac.destination)
      osc.start(now)
      osc.stop(now + 0.2)
    } catch {
      // Audio not available — ignore silently.
    }
  }, [muted])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      playBlip()

      const id = idRef.current++
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }])
      setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 650)

      // Springy bounce on the whole app.
      const root = document.getElementById("app-shell")
      if (root) {
        root.classList.remove("fx-bounce")
        // Force reflow so the animation can retrigger.
        void root.offsetWidth
        root.classList.add("fx-bounce")
      }
    }

    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [playBlip])

  return (
    <>
      {/* Ripples */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {ripples.map((r) => (
          <span
            key={r.id}
            className="fx-ripple absolute rounded-full"
            style={{ left: r.x, top: r.y }}
          />
        ))}
      </div>

      {/* Sound toggle */}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Enable sound effects" : "Mute sound effects"}
        className="fixed bottom-4 right-4 z-50 flex size-10 items-center justify-center rounded-full border border-primary/40 bg-card/80 text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary/10"
      >
        {muted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>
    </>
  )
}
