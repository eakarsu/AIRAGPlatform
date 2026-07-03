import QueryLatencyChart from '../components/QueryLatencyChart'
import RelevanceHeatmap from '../components/RelevanceHeatmap'
import AuditLogPdfExport from '../components/AuditLogPdfExport'
import RetrievalRulesEditor from '../components/RetrievalRulesEditor'
import VectorSpaceScatter from '../components/VectorSpaceScatter'
import RetrievalQualityChart from '../components/RetrievalQualityChart'
import PromptTemplateEditor from '../components/PromptTemplateEditor'
import DatasetUploadReindex from '../components/DatasetUploadReindex'

export default function CustomViewsPage() {
  return (
    <div className="space-y-6" data-testid="custom-views-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RAG Views</h1>
        <p className="text-sm text-gray-500">
          Custom RAG-platform features: query latency, vector space, retrieval quality, relevance heatmap, audit exports, prompt templates, dataset reindexing, and retrieval rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueryLatencyChart />
        <RetrievalQualityChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VectorSpaceScatter />
        <RelevanceHeatmap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AuditLogPdfExport />
        <RetrievalRulesEditor />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PromptTemplateEditor />
        <DatasetUploadReindex />
      </div>
    </div>
  )
}
