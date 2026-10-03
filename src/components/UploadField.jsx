import { useEffect, useId, useRef, useState } from 'react'
import { UploadCloud, FileText, Image as ImageIcon, X } from 'lucide-react'
import { venueForm } from '../content/contact.js'
import { checkUpload } from '../lib/uploadCheck.js'
import './UploadField.css'

const { uploads } = venueForm

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

// Put `files` on the input so FormData posts them. DataTransfer is the only
// way to write input.files; where it is missing (jsdom) the input is cleared
// and the list in state still tells the user what they chose.
function assign(input, files) {
  if (typeof DataTransfer === 'undefined') {
    if (files.length === 0) input.value = ''
    return
  }
  const dt = new DataTransfer()
  for (const file of files) dt.items.add(file)
  input.files = dt.files
}

/**
 * One upload box: a hidden file input behind a drop zone, the chosen files
 * listed under it, and a live region for anything that was refused.
 *
 * @param {{ name: string, label: string, hint: string, multiple?: boolean }} section
 */
export default function UploadField({ section }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])
  const [dragging, setDragging] = useState(false)

  // The form resets itself after the server accepts it; follow suit.
  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return
    const clear = () => {
      setFiles([])
      setErrors([])
    }
    form.addEventListener('reset', clear)
    return () => form.removeEventListener('reset', clear)
  }, [])

  async function add(incoming) {
    const picked = Array.from(incoming ?? [])
    if (picked.length === 0) return
    const results = await Promise.all(picked.map((file) => checkUpload(file)))
    const refused = picked
      .map((file, i) => (results[i] ? `${file.name} ${uploads.errors[results[i]]}` : null))
      .filter(Boolean)
    const accepted = picked.filter((_, i) => !results[i])
    const next = section.multiple ? [...files, ...accepted] : accepted.slice(0, 1)
    setFiles(next)
    setErrors(refused)
    assign(inputRef.current, next)
  }

  function remove(index) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    setErrors([])
    assign(inputRef.current, next)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    add(e.dataTransfer?.files)
  }

  return (
    <div className="upload">
      <label
        htmlFor={inputId}
        className={`upload__zone${dragging ? ' upload__zone--over' : ''}${
          files.length ? ' upload__zone--filled' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="upload__input"
          type="file"
          name={section.name}
          accept={uploads.accept}
          multiple={section.multiple || undefined}
          onChange={(e) => add(e.target.files)}
        />
        <UploadCloud className="upload__icon" size={22} strokeWidth={1.6} aria-hidden="true" />
        <span className="upload__label">{section.label}</span>
        <span className="upload__hint">{section.hint}</span>
        <span className="upload__prompt">
          {section.multiple ? uploads.promptMultiple : uploads.prompt}
        </span>
      </label>

      {files.length > 0 && (
        <ul className="upload__files">
          {files.map((file, i) => {
            const Icon = file.type === 'application/pdf' ? FileText : ImageIcon
            return (
              <li key={`${file.name}-${file.size}-${i}`} className="upload__file">
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                <span className="upload__file-name">{file.name}</span>
                <span className="upload__file-size">{formatSize(file.size)}</span>
                <button
                  type="button"
                  className="upload__remove"
                  onClick={() => remove(i)}
                  aria-label={`${uploads.remove} ${file.name}`}
                >
                  <X size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Always present so a refusal is announced the moment it lands. */}
      <p className="upload__errors" role="status" aria-live="polite">
        {errors.map((message) => (
          <span key={message} className="upload__error">
            {message}
          </span>
        ))}
      </p>
    </div>
  )
}
