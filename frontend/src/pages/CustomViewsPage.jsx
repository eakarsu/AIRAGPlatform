import QueryLatencyChart from '../components/QueryLatencyChart'
import RelevanceHeatmap from '../components/RelevanceHeatmap'
import AuditLogPdfExport from '../components/AuditLogPdfExport'
import RetrievalRulesEditor from '../components/RetrievalRulesEditor'

export default function CustomViewsPage() {
  return (
    <div className="space-y-6" data-testid="custom-views-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RAG Views</h1>
        <p className="text-sm text-gray-500">
          Custom RAG-platform features: query latency, retrieval relevance heatmap, audit log export, and retrieval rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueryLatencyChart />
        <RelevanceHeatmap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AuditLogPdfExport />
        <RetrievalRulesEditor />
      </div>
    </div>
  )
}
