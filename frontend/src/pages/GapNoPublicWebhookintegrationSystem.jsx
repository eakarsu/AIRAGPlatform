import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoPublicWebhookintegrationSystem() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-public-webhookintegration-system')} />
}
