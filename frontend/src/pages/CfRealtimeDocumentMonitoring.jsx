import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function CfRealtimeDocumentMonitoring() {
  return <AIFeatureTool feature={getFeatureByPath('/cf-realtime-document-monitoring')} />
}
