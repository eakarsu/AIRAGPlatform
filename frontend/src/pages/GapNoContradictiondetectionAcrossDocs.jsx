import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoContradictiondetectionAcrossDocs() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-contradictiondetection-across-docs')} />
}
