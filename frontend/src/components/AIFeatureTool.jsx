import { useMemo, useState } from 'react'
import AIResultReport from './AIResultReport'

export default function AIFeatureTool({ feature, embedded = false }) {
  const [input, setInput] = useState(feature?.presets?.[0]?.value || '')
  const [activePreset, setActivePreset] = useState(feature?.presets?.[0]?.label || '')
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const presets = useMemo(() => feature?.presets || [], [feature])

  if (!feature) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        AI feature is not configured.
      </div>
    )
  }

  const applyPreset = (preset) => {
    setInput(preset.value)
    setActivePreset(preset.label)
    setError(null)
  }

  async function run() {
    setLoading(true)
    setError(null)
    setOutput(null)
    try {
      const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || ''
      const res = await fetch(feature.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ input }),
      })
      const ct = res.headers.get('content-type') || ''
      const data = ct.includes('json') ? await res.json() : { text: await res.text() }
      if (!res.ok) throw new Error((data && (data.error || data.detail)) || res.statusText)
      setOutput({ ...data, title: data.title || feature.title })
    } catch (e) {
      setError(e && e.message ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={embedded ? '' : 'mx-auto max-w-5xl animate-fade-in'}>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{feature.category}</span>
          <span className={feature.type === 'Custom AI' ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700'}>
            {feature.type}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">{feature.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">{feature.description}</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Task presets</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose the workflow that matches the work. Each button fills the AI prompt with feature-specific context.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                activePreset === preset.label
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor={`ai-input-${feature.path}`}>
          AI task context
        </label>
        <textarea
          id={`ai-input-${feature.path}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the source documents, question, customer context, constraints, or expected report..."
          className="min-h-[210px] w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? 'Running analysis...' : `Run ${feature.title}`}
          </button>
          {activePreset && <span className="text-sm text-gray-500">Selected: {activePreset}</span>}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}
      </section>

      {output && <AIResultReport response={output} />}
    </div>
  )
}
