import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function CfComparisonContradictionDetection() {
  return <AIFeatureTool feature={getFeatureByPath('/cf-comparison-contradiction-detection')} />
}
