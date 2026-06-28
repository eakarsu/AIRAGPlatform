import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoAuditLogOfWhoQueriedWhat() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-audit-log-of-who-queried-what')} />
}
