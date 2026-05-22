import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

function scoreColor(score) {
  // score 0..1 -> indigo gradient
  const s = Math.max(0, Math.min(1, score || 0))
  const alpha = 0.15 + 0.75 * s
  return `rgba(79, 70, 229, ${alpha.toFixed(3)})`
}

function textColorFor(score) {
  return (score || 0) > 0.55 ? '#fff' : '#1f2937'
}

export default function RelevanceHeatmap() {
  const [data, setData] = useState({ queries: [], sources: [], cells: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/custom-views/relevance-heatmap')
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [])

  const cellLookup = useMemo(() => {
    const m = new Map()
    for (const c of data.cells || []) {
      m.set(`${c.query}||${c.source}`, c.score)
    }
    return m
  }, [data])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-testid="relevance-heatmap">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Retrieval Relevance Heatmap</h3>
        <p className="text-sm text-gray-500">Query (rows) x Source (columns) cosine relevance.</p>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading heatmap...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-gray-600 font-medium"></th>
                {(data.sources || []).map(s => (
                  <th key={s} className="p-2 text-left text-gray-600 font-medium whitespace-nowrap">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.queries || []).map(q => (
                <tr key={q}>
                  <td className="p-2 text-gray-700 font-medium whitespace-nowrap">{q}</td>
                  {(data.sources || []).map(s => {
                    const sc = cellLookup.get(`${q}||${s}`)
                    return (
                      <td key={s} className="p-0">
                        <div
                          className="w-20 h-9 flex items-center justify-center text-[11px] font-medium border border-white"
                          style={{ background: scoreColor(sc), color: textColorFor(sc) }}
                          title={`${q} x ${s}: ${sc}`}
                        >
                          {sc !== undefined ? sc.toFixed(2) : '-'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
