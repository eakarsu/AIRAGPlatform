import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import api from '../api/client'

export default function RetrievalQualityChart() {
  const [data, setData] = useState({ series: [], k: 5 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/custom-views/retrieval-quality')
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Retrieval Quality</h3>
        <p className="text-sm text-gray-500">precision@{data.k} / recall@{data.k} over time.</p>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading retrieval quality...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div style={{ width: '100%', height: 320 }} data-testid="retrieval-quality">
          <ResponsiveContainer>
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="precision_at_k" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="recall_at_k" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
