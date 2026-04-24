import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadDocument } from '../api/client'
import toast from 'react-hot-toast'
import { HiUpload, HiDocument } from 'react-icons/hi'

export default function DocumentUpload({ onComplete }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [title, setTitle] = useState('')

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append('file', file)
    if (title.trim()) {
      formData.append('title', title.trim())
    }

    setUploading(true)
    setProgress(0)

    try {
      await uploadDocument(formData)
      setProgress(100)
      onComplete?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [title, onComplete])

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Document Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-detected from filename"
          className="input-field"
          disabled={uploading}
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-indigo-400 bg-indigo-50'
            : uploading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Uploading & Processing...</p>
            <p className="text-xs text-gray-500 mt-1">Extracting text, chunking, and creating embeddings</p>
            <div className="w-48 mx-auto mt-3 bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : (
          <div>
            <HiUpload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            {isDragActive ? (
              <p className="text-sm font-medium text-indigo-600">Drop the file here</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900">
                  Drag & drop a file here, or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports PDF, DOCX, TXT, and MD files
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {acceptedFiles.length > 0 && !uploading && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <HiDocument className="w-5 h-5 text-indigo-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{acceptedFiles[0].name}</p>
            <p className="text-xs text-gray-500">{(acceptedFiles[0].size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      )}
    </div>
  )
}
