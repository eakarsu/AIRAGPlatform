import { useEffect, useState } from 'react'
import api from '../api/client'

const EMPTY = { name: '', system_prompt: '', user_template: '', retrieval_k: 5 }

export default function PromptTemplateEditor() {
  const [templates, setTemplates] = useState([])
  const [editing, setEditing] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    api.get('/custom-views/prompt-templates')
      .then(res => setTemplates(res.data || []))
      .catch(err => setError(String(err)))
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!editing.name) { setError('name required'); return }
    setBusy(true); setError(null)
    try {
      if (editId) {
        await api.put(`/custom-views/prompt-templates/${editId}`, editing)
      } else {
        await api.post('/custom-views/prompt-templates', editing)
      }
      setEditing(EMPTY); setEditId(null); load()
    } catch (err) {
      setError(err?.response?.data?.detail || String(err))
    } finally { setBusy(false) }
  }

  const edit = (t) => { setEditing({ ...t }); setEditId(t.id) }
  const del = async (id) => {
    if (!confirm('Delete template?')) return
    await api.delete(`/custom-views/prompt-templates/${id}`)
    if (editId === id) { setEditing(EMPTY); setEditId(null) }
    load()
  }
  const reset = () => { setEditing(EMPTY); setEditId(null) }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-testid="prompt-editor">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Prompt Template Editor</h3>
      <p className="text-sm text-gray-500 mb-4">CRUD prompt templates with system prompt, user template ({'{{vars}}'}), and retrieval_k.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea
              rows={3}
              value={editing.system_prompt}
              onChange={e => setEditing({ ...editing, system_prompt: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">User Template (use {'{{vars}}'})</label>
            <textarea
              rows={4}
              value={editing.user_template}
              onChange={e => setEditing({ ...editing, user_template: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">retrieval_k</label>
            <input
              type="number"
              value={editing.retrieval_k}
              onChange={e => setEditing({ ...editing, retrieval_k: parseInt(e.target.value || '0', 10) })}
              className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {editId ? 'Update' : 'Create'}
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
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Existing Templates ({templates.length})</h4>
          <ul className="space-y-2">
            {templates.map(t => (
              <li key={t.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">retrieval_k = {t.retrieval_k}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => edit(t)} className="text-xs text-indigo-600">edit</button>
                    <button onClick={() => del(t.id)} className="text-xs text-red-600">delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
