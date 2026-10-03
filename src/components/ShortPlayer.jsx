import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { shorts } from '../content/shorts.js'
import './ShortPlayer.css'

/**
 * The overlay a published short plays in: a modal <dialog> with the video,
 * its title and a close button. Escape and a click on the backdrop close it
 * (the browser fires `close` on the dialog for both); the body does not
 * scroll while it is open. Mounted only while open, so nothing of it is in
 * the static HTML.
 *
 * @param {{ short: { video: string, poster: string, title: string }, onClose: () => void }} props
 */
export default function ShortPlayer({ short, onClose }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    // jsdom has no showModal; the attribute keeps the markup honest there.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    const onDialogClose = () => closeRef.current()
    // The backdrop is part of the dialog element; a click on the frame is not.
    const onClick = (e) => {
      if (e.target !== dialog) return
      if (typeof dialog.close === 'function')
        dialog.close() // fires `close`
      else closeRef.current()
    }
    dialog.addEventListener('close', onDialogClose)
    dialog.addEventListener('click', onClick)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.removeEventListener('close', onDialogClose)
      dialog.removeEventListener('click', onClick)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <dialog ref={ref} className="short-player" aria-label={short.title}>
      <div className="short-player__frame">
        {/* Captions are not part of the upload; the title below stands in. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          className="short-player__video"
          src={short.video}
          poster={short.poster}
          controls
          autoPlay
          playsInline
        />
        <p className="short-player__title">{short.title}</p>
        <button
          type="button"
          className="short-player__close"
          onClick={onClose}
          aria-label={shorts.close}
        >
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </dialog>
  )
}
