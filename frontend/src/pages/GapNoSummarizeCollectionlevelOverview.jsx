import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoSummarizeCollectionlevelOverview() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-summarize-collectionlevel-overview')} />
}
