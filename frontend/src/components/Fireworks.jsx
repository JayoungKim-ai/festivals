import { useEffect, useRef } from 'react'

/**
 * 클릭하면 클릭 위치에서 폭죽(파티클)이 터지는 효과.
 * - 화면 전체를 덮는 투명 canvas 오버레이(클릭 통과: pointer-events none).
 * - 외부 라이브러리 없이 requestAnimationFrame으로 파티클을 그린다.
 * - 파티클이 없을 때는 애니메이션 루프를 멈춰 CPU를 아낀다.
 */

// 축제 느낌의 색상(초록·노랑 위주 + 포인트 색)
const COLORS = ['#16a34a', '#22c55e', '#eab308', '#facc15', '#ffffff', '#f97316', '#ef4444']

export default function Fireworks() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    // 모션 최소화를 선호하는 사용자는 효과를 끈다.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    const ctx = canvas.getContext('2d')
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let particles = []
    let rafId = null

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // 클릭 위치에서 파티클 생성
    function burst(x, y) {
      const count = 26 + Math.floor(Math.random() * 12) // 26~37개
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
        const speed = 2.5 + Math.random() * 4
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1, // 1 → 0 으로 감소
          decay: 0.012 + Math.random() * 0.012,
          size: 2 + Math.random() * 2.5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        })
      }
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i]
        p.vx *= 0.98 // 공기 저항
        p.vy = p.vy * 0.98 + 0.08 // 중력
        p.x += p.vx
        p.y += p.vy
        p.life -= p.decay

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.globalAlpha = Math.max(p.life, 0)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (particles.length > 0) {
        rafId = requestAnimationFrame(tick)
      } else {
        rafId = null
      }
    }

    function handleClick(e) {
      burst(e.clientX, e.clientY)
    }

    // capture 단계로 등록해, stopPropagation을 호출하는 버튼 클릭도 잡는다.
    window.addEventListener('click', handleClick, true)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('resize', resize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fireworks-canvas" aria-hidden="true" />
}
