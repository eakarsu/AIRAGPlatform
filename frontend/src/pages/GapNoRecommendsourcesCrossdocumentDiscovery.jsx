import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoRecommendsourcesCrossdocumentDiscovery() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-recommendsources-crossdocument-discovery')} />
}
