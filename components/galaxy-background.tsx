"use client"

import { useEffect, useRef } from "react"

type Star = {
  x: number
  y: number
  z: number
  size: number
  hue: number
  twinkle: number
  twinkleSpeed: number
}

/**
 * Animated galaxy / starfield background rendered on a canvas.
 * Stars drift and swirl slowly around a center point, with a subtle
 * parallax reaction to pointer movement. Purely decorative.
 */
export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    let dpr = 1
    let stars: Star[] = []
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let raf = 0

    // Accent hues (emerald ~ 160, cyan ~ 190, amber ~ 70) for a cohesive galaxy.
    const HUES = [160, 175, 190, 210, 70]

    function makeStars() {
      const count = Math.min(320, Math.floor((width * height) / 6000))
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * 0.8 + 0.2,
        size: Math.random() * 1.6 + 0.3,
        hue: HUES[Math.floor(Math.random() * HUES.length)],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.04 + 0.01,
      }))
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      makeStars()
    }

    let t = 0
    function draw() {
      t += 0.0016

      // Trailing fade for a soft nebula feel.
      ctx.fillStyle = "rgba(10, 12, 18, 0.35)"
      ctx.fillRect(0, 0, width, height)

      pointer.x += (pointer.tx - pointer.x) * 0.05
      pointer.y += (pointer.ty - pointer.y) * 0.05

      const cx = width / 2 + pointer.x * 20
      const cy = height / 2 + pointer.y * 20

      for (const s of stars) {
        // Slow swirl: rotate each star around the center based on depth.
        const angle = t * (0.3 + s.z * 0.5)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rx = s.x * cos - s.y * sin
        const ry = s.x * sin + s.y * cos

        const px = cx + rx * (0.6 + s.z * 0.6) + pointer.x * s.z * 40
        const py = cy + ry * (0.6 + s.z * 0.6) + pointer.y * s.z * 40

        s.twinkle += s.twinkleSpeed
        const alpha = (0.35 + 0.65 * ((Math.sin(s.twinkle) + 1) / 2)) * s.z

        const r = s.size * (0.6 + s.z)
        const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 4)
        glow.addColorStop(0, `hsla(${s.hue}, 90%, 70%, ${alpha})`)
        glow.addColorStop(1, `hsla(${s.hue}, 90%, 60%, 0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(px, py, r * 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `hsla(${s.hue}, 100%, 92%, ${alpha})`
        ctx.beginPath()
        ctx.arc(px, py, r * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    function onPointerMove(e: PointerEvent) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2
    }

    resize()
    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onPointerMove)

    if (prefersReduced) {
      // Render one static frame.
      ctx.fillStyle = "rgba(10, 12, 18, 1)"
      ctx.fillRect(0, 0, width, height)
      draw()
      cancelAnimationFrame(raf)
    } else {
      draw()
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointerMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}
