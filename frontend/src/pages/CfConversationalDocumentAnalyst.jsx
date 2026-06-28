import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function CfConversationalDocumentAnalyst() {
  return <AIFeatureTool feature={getFeatureByPath('/cf-conversational-document-analyst')} />
}
