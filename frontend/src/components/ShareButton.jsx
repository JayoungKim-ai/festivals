import { useEffect, useState } from 'react'

/**
 * 상세 페이지 링크 공유
 * - 지원 시 Web Share API (모바일 등)
 * - 미지원 시 클립보드에 URL 복사
 */
export default function ShareButton({ title, text, url }) {
  const [feedback, setFeedback] = useState('') // '' | copied | shared | error

  useEffect(() => {
    if (!feedback) return undefined
    const timer = setTimeout(() => setFeedback(''), 2000)
    return () => clearTimeout(timer)
  }, [feedback])

  async function handleShare() {
    const shareUrl = url || window.location.href
    const shareData = {
      title: title || document.title,
      text: text || '',
      url: shareUrl,
    }

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData)
        setFeedback('shared')
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setFeedback('copied')
        return
      }

      // 구형 브라우저 폴백
      const input = document.createElement('input')
      input.value = shareUrl
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setFeedback('copied')
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우는 오류로 보지 않음
      if (err && err.name === 'AbortError') return
      setFeedback('error')
    }
  }

  const label =
    feedback === 'copied'
      ? '링크 복사됨'
      : feedback === 'shared'
        ? '공유함'
        : feedback === 'error'
          ? '공유 실패'
          : '링크 공유'

  return (
    <button
      type="button"
      className={
        feedback === 'copied' || feedback === 'shared'
          ? 'share-button share-button--done'
          : 'share-button'
      }
      aria-label={label}
      onClick={handleShare}
    >
      <span className="share-button__icon" aria-hidden="true">
        ↗
      </span>
      <span className="share-button__label">{label}</span>
    </button>
  )
}
