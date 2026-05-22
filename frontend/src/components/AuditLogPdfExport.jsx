import { useState } from 'react'
import api from '../api/client'

export default function AuditLogPdfExport() {
  const [limit, setLimit] = useState(20)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  const download = async () => {
    setBusy(true); setError(null); setStatus(null)
    try {
      const res = await api.get('/custom-views/audit-log-pdf', {
        params: { limit },
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rag_audit_log_${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setStatus(`Exported ${limit} audit records (${(blob.size / 1024).toFixed(1)} KB).`)
    } catch (err) {
      setError(err?.response?.data?.detail || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-testid="audit-log-pdf">
      <h3 className="text-lg font-bold text-gray-900 mb-1">RAG Audit Log (PDF)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Export an audit log of recent RAG queries (user, query, top source, score) as a downloadable PDF.
      </p>
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Records</label>
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value || '1', 10))}
            className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={download}
          disabled={busy}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
      {status && <p className="mt-3 text-sm text-emerald-600">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-600">Error: {error}</p>}
    </div>
  )
}
