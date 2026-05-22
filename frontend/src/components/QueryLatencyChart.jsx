import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import api from '../api/client'

export default function QueryLatencyChart() {
  const [data, setData] = useState({ series: [], unit: 'ms' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/custom-views/query-latency')
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-testid="query-latency">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Query Latency</h3>
        <p className="text-sm text-gray-500">RAG query latency percentiles ({data.unit}) across recent windows.</p>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading latency...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="window" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="p50_ms" name="p50" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p95_ms" name="p95" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p99_ms" name="p99" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
