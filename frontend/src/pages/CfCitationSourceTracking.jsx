import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function CfCitationSourceTracking() {
  return <AIFeatureTool feature={getFeatureByPath('/cf-citation-source-tracking')} />
}
