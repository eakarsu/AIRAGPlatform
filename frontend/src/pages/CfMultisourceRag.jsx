import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function CfMultisourceRag() {
  return <AIFeatureTool feature={getFeatureByPath('/cf-multisource-rag')} />
}
