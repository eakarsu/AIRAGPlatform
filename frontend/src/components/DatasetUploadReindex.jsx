import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import api from '../api/client'

const COLLECTIONS = ['default', 'product-docs', 'engineering', 'support-kb', 'marketing', 'research']

export default function DatasetUploadReindex() {
  const [files, setFiles] = useState([])
  const [collection, setCollection] = useState('default')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const onDrop = useCallback((accepted) => {
    setFiles(prev => [...prev, ...accepted])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true })

  const reindex = async () => {
    if (files.length === 0) { setError('Pick at least one file'); return }
    setError(null); setBusy(true); setResult(null)
    try {
      const fd = new FormData()
      fd.append('collection', collection)
      for (const f of files) fd.append('files', f)
      const res = await api.post('/custom-views/upload-dataset', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
    } catch (err) {
      setError(err?.response?.data?.detail || String(err))
    } finally {
      setBusy(false)
    }
  }

  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-testid="dataset-upload">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Dataset Upload + Reindex</h3>
      <p className="text-sm text-gray-500 mb-4">Drag-drop multiple files, pick a collection, then Reindex.</p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
        <select
          value={collection}
          onChange={e => setCollection(e.target.value)}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          {COLLECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-3 ${
          isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-600">
          {isDragActive ? 'Drop files here...' : 'Drag-drop files here, or click to select'}
        </p>
      </div>

      {files.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm text-gray-700">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded">
              <span>{f.name} <span className="text-gray-400 text-xs">({f.size} bytes)</span></span>
              <button onClick={() => removeFile(i)} className="text-red-500 text-xs">remove</button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={reindex}
        disabled={busy}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? 'Reindexing...' : 'Reindex'}
      </button>

      {error && <p className="text-sm text-red-600 mt-3">Error: {error}</p>}

      {result && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-900">
          <div><strong>Ingested:</strong> {result.ingested}</div>
          <div><strong>Chunks:</strong> {result.chunks}</div>
          <div><strong>Embeddings:</strong> {result.embedding_count}</div>
          <div><strong>Reindex status:</strong> {result.reindex_status}</div>
          <div><strong>Collection:</strong> {result.collection}</div>
        </div>
      )}
    </div>
  )
}
