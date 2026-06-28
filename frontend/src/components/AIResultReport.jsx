function titleize(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function stripJsonFence(text) {
  if (typeof text !== 'string') return text
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function tryParse(value) {
  if (typeof value !== 'string') return value
  const stripped = stripJsonFence(value)
  try {
    return JSON.parse(stripped)
  } catch {
    const firstObject = stripped.indexOf('{')
    const lastObject = stripped.lastIndexOf('}')
    const firstArray = stripped.indexOf('[')
    const lastArray = stripped.lastIndexOf(']')
    const starts = [firstObject, firstArray].filter((index) => index >= 0)
    const first = starts.length ? Math.min(...starts) : -1
    const last = Math.max(lastObject, lastArray)
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(stripped.slice(first, last + 1))
      } catch {
        return stripped
      }
    }
    return stripped
  }
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function parseEmbeddedValue(value) {
  if (typeof value !== 'string') return value
  const parsed = tryParse(value)
  return parsed === value ? value : parsed
}

function unwrapEmbeddedReport(result) {
  if (!isPlainObject(result)) return result

  const candidates = [
    'summary',
    'executive_summary',
    'answer',
    'content',
    'raw',
    'raw_response',
    'analysis',
    'result',
    'output',
  ]

  for (const key of candidates) {
    const parsed = parseEmbeddedValue(result[key])
    if (isPlainObject(parsed)) {
      return { ...result, [key]: undefined, ...parsed }
    }
    if (Array.isArray(parsed)) {
      return { ...result, [key]: parsed }
    }
  }

  return result
}

function normalizeResult(response) {
  const source = response?.result || response?.output || response?.data || response
  const parsedSource = tryParse(source)
  const content = parsedSource?.content || parsedSource?.raw_response || parsedSource?.raw
  const parsedContent = tryParse(content)
  const result = unwrapEmbeddedReport(parsedContent && typeof parsedContent === 'object' ? parsedContent : parsedSource)

  return {
    title: response?.title || result?.title || 'AI Analysis Report',
    slug: response?.slug,
    ok: response?.ok,
    model: result?.model || response?.model || response?.output?.model,
    mock: Boolean(result?.mock || response?.mock || response?.output?.mock),
    note: result?.note,
    prompt: result?.prompt,
    error: result?.error || response?.error,
    result,
  }
}

function renderScalar(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
  if (typeof value === 'string') return value
  return String(value)
}

function ValueBlock({ value }) {
  const parsedValue = parseEmbeddedValue(value)
  if (parsedValue !== value) {
    return <ValueBlock value={parsedValue} />
  }

  if (value === null || value === undefined || value === '') {
    return <span className="text-sm text-gray-500">-</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-sm text-gray-500">None</span>
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border border-gray-200 bg-white p-2">
            {item && typeof item === 'object' ? (
              <div className="space-y-1.5">
                {Object.entries(item).map(([key, nested]) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[150px_1fr]">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</span>
                    <ValueBlock value={nested} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-gray-800">{renderScalar(item)}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (!entries.length) return <span className="text-sm text-gray-500">None</span>
    return (
      <div className="space-y-2">
        {entries.map(([key, nested]) => (
          <div key={key} className="rounded-md bg-white p-2">
            <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</span>
              <ValueBlock value={nested} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <span className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{renderScalar(value)}</span>
}

function ListSection({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-lg bg-gray-50 p-3">
            {typeof item === 'object' && item !== null ? (
              <div className="space-y-2">
                {Object.entries(item).map(([key, value]) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[180px_1fr]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</span>
                    <ValueBlock value={value} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-gray-800">{renderScalar(item)}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function FieldGrid({ result, hiddenKeys }) {
  const entries = Object.entries(result || {}).filter(([key, value]) => {
    if (hiddenKeys.has(key)) return false
    if (Array.isArray(value)) return false
    if (value && typeof value === 'object') return false
    return value !== null && value !== undefined && value !== ''
  })
  if (!entries.length) return null
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Details</h4>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</p>
            <div className="mt-1 font-medium text-gray-900">
              <ValueBlock value={value} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ObjectSections({ result, hiddenKeys }) {
  const entries = Object.entries(result || {}).filter(([key, value]) => {
    if (hiddenKeys.has(key)) return false
    return value && typeof value === 'object' && !Array.isArray(value)
  })
  if (!entries.length) return null
  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <section key={key} className="rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(value).map(([childKey, childValue]) => (
              <div key={childKey} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titleize(childKey)}</p>
                <div className="mt-1">
                  <ValueBlock value={childValue} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ArraySections({ result, hiddenKeys }) {
  const entries = Object.entries(result || {}).filter(([key, value]) => {
    if (hiddenKeys.has(key)) return false
    return Array.isArray(value) && value.length > 0
  })
  if (!entries.length) return null
  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <ListSection key={key} title={titleize(key)} items={value} />
      ))}
    </div>
  )
}

export default function AIResultReport({ response }) {
  const normalized = normalizeResult(response)
  const result = normalized.result || {}
  const hiddenKeys = new Set([
    'summary',
    'executive_summary',
    'answer',
    'content',
    'raw',
    'raw_response',
    'findings',
    'recommendations',
    'anomalies',
    'risks',
    'risk',
    'next_actions',
    'actions',
    'follow_up_questions',
    'assumptions',
    'prompt',
    'note',
    'mock',
    'model',
    'output',
    'result',
  ])

  const summary = result.summary || result.executive_summary || result.answer || result.content || result.raw || result.raw_response || normalized.note
  const findings = result.findings || result.key_findings || result.detected_issues || result.items
  const anomalies = result.anomalies
  const recommendations = result.recommendations || result.recommended_actions || result.action_plan
  const risks = result.risks || result.risk || result.key_risks
  const nextActions = result.next_actions || result.actions
  const assumptions = result.assumptions
  const followUps = result.follow_up_questions || result.questions

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
      <div className="border-b border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">AI Analysis Report</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{normalized.title}</h2>
            {normalized.slug && <p className="mt-1 text-sm text-gray-500">{titleize(normalized.slug)}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {normalized.model && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{normalized.model}</span>}
            {normalized.mock && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Mock mode</span>}
            {normalized.ok === false && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Needs attention</span>}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {normalized.error && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <h3 className="font-semibold">Analysis Error</h3>
            <p className="mt-1 text-sm">{normalized.error}</p>
          </section>
        )}

        {summary && (
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Executive Summary</h3>
            <ValueBlock value={summary} />
          </section>
        )}

        <ListSection title="Findings" items={findings} />
        <ListSection title="Anomalies" items={anomalies} />
        <ListSection title="Recommendations" items={recommendations} />
        <ListSection title="Risks" items={Array.isArray(risks) ? risks : risks ? [risks] : []} />
        <ListSection title="Next Actions" items={nextActions} />
        <ListSection title="Assumptions" items={assumptions} />
        <ListSection title="Follow-up Questions" items={followUps} />
        <FieldGrid result={result} hiddenKeys={hiddenKeys} />
        <ArraySections result={result} hiddenKeys={hiddenKeys} />
        <ObjectSections result={result} hiddenKeys={hiddenKeys} />

        {normalized.mock && normalized.prompt && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-700">Requested Task</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">{normalized.prompt}</p>
          </section>
        )}
      </div>
    </div>
  )
}
