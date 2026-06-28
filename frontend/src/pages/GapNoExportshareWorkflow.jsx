import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoExportshareWorkflow() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-exportshare-workflow')} />
}
