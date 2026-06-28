import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoMultisourceRagApisDbsLiveWeb() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-multisource-rag-apis-dbs-live-web')} />
}
