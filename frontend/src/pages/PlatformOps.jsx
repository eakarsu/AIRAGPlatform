import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  HiBell,
  HiCash,
  HiChartBar,
  HiCheckCircle,
  HiClipboardCheck,
  HiCloudUpload,
  HiCog,
  HiDatabase,
  HiDocumentSearch,
  HiKey,
  HiLightningBolt,
  HiPencil,
  HiShieldCheck,
  HiTrash,
  HiX,
} from 'react-icons/hi'
import {
  deletePlatformOpsItem,
  getPlatformOpsItems,
  getPlatformOpsSummary,
  runPlatformOpsAction,
  updatePlatformOpsItem,
} from '../api/client'
import AIResultReport from '../components/AIResultReport'

const iconMap = {
  connectors: HiCloudUpload,
  provenance: HiDocumentSearch,
  monitoring: HiCog,
  notifications: HiBell,
  'query-audit': HiClipboardCheck,
  evaluations: HiChartBar,
  'prompt-versions': HiPencil,
  'cost-analytics': HiCash,
  'tenant-billing': HiDatabase,
  'sso-scim': HiKey,
}

const statusClasses = {
  healthy: 'bg-emerald-50 text-emerald-700',
  passing: 'bg-emerald-50 text-emerald-700',
  active: 'bg-emerald-50 text-emerald-700',
  enabled: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-50 text-emerald-700',
  allowed: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  review: 'bg-amber-50 text-amber-700',
  overage: 'bg-amber-50 text-amber-700',
  canary: 'bg-blue-50 text-blue-700',
  setup: 'bg-blue-50 text-blue-700',
  paused: 'bg-gray-100 text-gray-700',
  stale: 'bg-red-50 text-red-700',
  high: 'bg-red-50 text-red-700',
}

function titleize(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
  if (typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleString()
  }
  return String(value)
}

function StatusPill({ value }) {
  const key = String(value || '').toLowerCase()
  const className = statusClasses[key] || 'bg-gray-100 text-gray-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{formatValue(value)}</span>
}

function DetailModal({ module, item, onClose, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(item || {})
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    setForm(item || {})
    setEditing(false)
    setAnalysis(null)
  }, [item])

  if (!item) return null

  const entries = Object.entries(form).filter(([key]) => key !== 'id')

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'id'))
      const res = await updatePlatformOpsItem(module.key, item.id, payload)
      toast.success('Updated')
      setEditing(false)
      onUpdated(res.data.item)
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this record?')) return
    try {
      await deletePlatformOpsItem(module.key, item.id)
      toast.success('Deleted')
      onDeleted(item.id)
      onClose()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await runPlatformOpsAction(module.key, item.id)
      toast.success(module.primary_action)
      onUpdated(res.data.item)
      setForm(res.data.item)
      setAnalysis(res.data.analysis || null)
    } catch {
      toast.error('Action failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{module.title}</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{item.name || item.tenant || item.query_id || item.answer_id || `Record ${item.id}`}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</label>
                {editing ? (
                  <textarea
                    value={formatValue(value)}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                    className="min-h-[68px] w-full rounded-lg border border-gray-200 bg-white p-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                ) : key.toLowerCase().includes('status') || key.toLowerCase().includes('risk') || key === 'severity' ? (
                  <StatusPill value={value} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{formatValue(value)}</p>
                )}
              </div>
            ))}
          </div>
          {analysis && (
            <div className="mt-5">
              <AIResultReport response={{ title: `${module.primary_action} Analysis`, result: analysis }} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-gray-50 p-4">
          <button onClick={handleRun} disabled={running} className="btn-secondary">
            <HiLightningBolt className="mr-1 inline h-4 w-4" />
            {running ? 'Running...' : module.primary_action}
          </button>
          {editing ? (
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <HiCheckCircle className="mr-1 inline h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-primary">
              <HiPencil className="mr-1 inline h-4 w-4" />
              Edit
            </button>
          )}
          <button onClick={handleDelete} className="btn-danger">
            <HiTrash className="mr-1 inline h-4 w-4" />
            Delete
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function PlatformOps() {
  const [summary, setSummary] = useState(null)
  const [module, setModule] = useState(null)
  const [items, setItems] = useState([])
  const [selectedKey, setSelectedKey] = useState('connectors')
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)

  const selectedMeta = useMemo(() => summary?.modules?.find((entry) => entry.key === selectedKey), [summary, selectedKey])
  const columns = module?.columns || []

  useEffect(() => {
    getPlatformOpsSummary()
      .then((res) => setSummary(res.data))
      .catch(() => toast.error('Failed to load platform modules'))
  }, [])

  useEffect(() => {
    setLoading(true)
    getPlatformOpsItems(selectedKey)
      .then((res) => {
        setModule(res.data)
        setItems(res.data.items || [])
      })
      .catch(() => toast.error('Failed to load module'))
      .finally(() => setLoading(false))
  }, [selectedKey])

  const handleUpdated = (updated) => {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setSelectedItem(updated)
  }

  const handleDeleted = (id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Platform Ops</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Enterprise RAG Operations</h1>
          <p className="mt-2 max-w-3xl text-gray-500">
            Operational controls for connector ingestion, provenance, monitoring, notifications, audit, evaluations, prompt versions, cost, billing, and identity.
          </p>
        </div>
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card min-w-[120px] p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{summary.module_count}</p><p className="text-xs text-gray-500">Modules</p></div>
            <div className="card min-w-[120px] p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{summary.record_count}</p><p className="text-xs text-gray-500">Records</p></div>
            <div className="card min-w-[120px] p-4 text-center"><p className="text-2xl font-bold text-amber-600">{summary.attention_count}</p><p className="text-xs text-gray-500">Attention</p></div>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Operations modules</h2>
          <div className="space-y-2">
            {(summary?.modules || []).map((entry) => {
              const Icon = iconMap[entry.key] || HiShieldCheck
              const active = selectedKey === entry.key
              return (
                <button
                  key={entry.key}
                  onClick={() => setSelectedKey(entry.key)}
                  className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}
                >
                  <div className="flex gap-3">
                    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${active ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{entry.title}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{entry.count} records · {entry.attention} attention</span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{module?.title || selectedMeta?.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{module?.description || selectedMeta?.description}</p>
              </div>
              {module && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{items.length} records</span>}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[...Array(5)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th key={column} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{titleize(column)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer hover:bg-indigo-50/60">
                      {columns.map((column) => (
                        <td key={column} className="max-w-[240px] truncate px-4 py-3 text-sm text-gray-700">
                          {column.toLowerCase().includes('status') || column.toLowerCase().includes('risk') ? <StatusPill value={item[column]} /> : formatValue(item[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <DetailModal
        module={module}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
