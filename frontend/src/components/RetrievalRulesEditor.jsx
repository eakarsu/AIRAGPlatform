import { useEffect, useState } from 'react'
import api from '../api/client'

const EMPTY = {
  name: '',
  chunk_size: 512,
  top_k: 5,
  reranking: 'none',
  description: '',
}

const RERANK_OPTIONS = ['none', 'cross-encoder', 'cohere-rerank', 'mmr']

export default function RetrievalRulesEditor() {
  const [rules, setRules] = useState([])
  const [editing, setEditing] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    api.get('/custom-views/retrieval-rules')
      .then(res => setRules(res.data || []))
      .catch(err => setError(String(err)))
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!editing.name) { setError('name required'); return }
    setBusy(true); setError(null)
    try {
      if (editId) {
        await api.put(`/custom-views/retrieval-rules/${editId}`, editing)
      } else {
        await api.post('/custom-views/retrieval-rules', editing)
      }
      setEditing(EMPTY); setEditId(null); load()
    } catch (err) {
      setError(err?.response?.data?.detail || String(err))
    } finally { setBusy(false) }
  }

  const edit = (r) => { setEditing({ ...r }); setEditId(r.id) }
  const del = async (id) => {
    if (!confirm('Delete retrieval rule?')) return
    try {
      await api.delete(`/custom-views/retrieval-rules/${id}`)
      if (editId === id) { setEditing(EMPTY); setEditId(null) }
      load()
    } catch (err) {
      setError(err?.response?.data?.detail || String(err))
    }
  }
  const reset = () => { setEditing(EMPTY); setEditId(null); setError(null) }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-testid="retrieval-rules-editor">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Retrieval Rules Editor</h3>
      <p className="text-sm text-gray-500 mb-4">
        CRUD retrieval rules: chunk_size, top_k, and reranking strategy.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="e.g. Precise Lookup"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Chunk Size (tokens)</label>
              <input
                type="number"
                min={32}
                max={8192}
                value={editing.chunk_size}
                onChange={e => setEditing({ ...editing, chunk_size: parseInt(e.target.value || '0', 10) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Top-K</label>
              <input
                type="number"
                min={1}
                max={100}
                value={editing.top_k}
                onChange={e => setEditing({ ...editing, top_k: parseInt(e.target.value || '0', 10) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reranking</label>
            <select
              value={editing.reranking}
              onChange={e => setEditing({ ...editing, reranking: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              {RERANK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={editing.description}
              onChange={e => setEditing({ ...editing, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {editId ? 'Update Rule' : 'Create Rule'}
            </button>
            {editId && (
              <button onClick={reset} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">
                Cancel
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">Error: {error}</p>}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Existing Rules ({rules.length})</h4>
          <ul className="space-y-2">
            {rules.map(r => (
              <li key={r.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{r.name}</div>
                    <div className="text-xs text-gray-500">
                      chunk={r.chunk_size} - top_k={r.top_k} - rerank={r.reranking}
                    </div>
                    {r.description && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">{r.description}</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => edit(r)} className="text-xs text-indigo-600">edit</button>
                    <button onClick={() => del(r.id)} className="text-xs text-red-600">delete</button>
                  </div>
                </div>
              </li>
            ))}
            {rules.length === 0 && <li className="text-xs text-gray-400">No retrieval rules yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
