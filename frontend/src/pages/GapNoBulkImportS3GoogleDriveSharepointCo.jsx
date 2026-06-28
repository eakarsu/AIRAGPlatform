import AIFeatureTool from '../components/AIFeatureTool'
import { getFeatureByPath } from '../config/aiFeatureCatalog'

export default function GapNoBulkImportS3GoogleDriveSharepointCo() {
  return <AIFeatureTool feature={getFeatureByPath('/gap-no-bulk-import-s3-google-drive-sharepoint-co')} />
}
