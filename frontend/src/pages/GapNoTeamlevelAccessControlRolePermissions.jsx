import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoTeamlevelAccessControlRolePermissions() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-teamlevel-access-control-role-permissions')} />
}
