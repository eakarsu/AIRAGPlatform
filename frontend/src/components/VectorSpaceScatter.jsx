import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import api from '../api/client'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function VectorSpaceScatter() {
  const [data, setData] = useState({ points: [], collections: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/custom-views/vector-space')
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [])

  const byCollection = {}
  for (const p of data.points || []) {
    if (!byCollection[p.collection]) byCollection[p.collection] = []
    byCollection[p.collection].push(p)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Vector Space Scatter</h3>
        <p className="text-sm text-gray-500">2D-projected document embeddings (UMAP), colored by collection.</p>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading vector space...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div style={{ width: '100%', height: 400 }} data-testid="vector-scatter">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="x" />
              <YAxis type="number" dataKey="y" name="y" />
              <ZAxis range={[60, 60]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              {(data.collections || []).map((name, idx) => (
                <Scatter
                  key={name}
                  name={name}
                  data={byCollection[name] || []}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
