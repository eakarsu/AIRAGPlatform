import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoCitationprovenanceRoute() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-citationprovenance-route')} />
}
