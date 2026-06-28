import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function CfKnowledgeGraphExtraction() {
  return <AIFeatureTool feature={getFeatureByPath('/cf-knowledge-graph-extraction')} />
}
