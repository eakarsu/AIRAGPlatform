import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoNotificationSystem() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-notification-system')} />
}
