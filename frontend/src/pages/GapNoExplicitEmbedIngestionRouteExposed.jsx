import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoExplicitEmbedIngestionRouteExposed() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-explicit-embed-ingestion-route-exposed')} />
}
