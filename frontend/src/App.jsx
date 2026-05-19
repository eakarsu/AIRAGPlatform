import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import DocumentDetail from './pages/DocumentDetail'
import Chat from './pages/Chat'
import ChatSession from './pages/ChatSession'
import KnowledgeBase from './pages/KnowledgeBase'
import AISummary from './pages/AISummary'
import SmartSearch from './pages/SmartSearch'
import Analytics from './pages/Analytics'
import Tags from './pages/Tags'
import PromptTemplates from './pages/PromptTemplates'
import ActivityLog from './pages/ActivityLog'
import Favorites from './pages/Favorites'
import UserManagement from './pages/UserManagement'
import Settings from './pages/Settings'
import Workspaces from './pages/Workspaces'
import CustomViewsPage from './pages/CustomViewsPage'
import Layout from './components/Layout'

// === Batch 07 Gaps & Frontend Mounts ===
import CfMultisourceRag from './pages/CfMultisourceRag';
import CfConversationalDocumentAnalyst from './pages/CfConversationalDocumentAnalyst';
import CfComparisonContradictionDetection from './pages/CfComparisonContradictionDetection';
import CfKnowledgeGraphExtraction from './pages/CfKnowledgeGraphExtraction';
import CfCitationSourceTracking from './pages/CfCitationSourceTracking';
import CfRealtimeDocumentMonitoring from './pages/CfRealtimeDocumentMonitoring';
import GapNoExplicitEmbedIngestionRouteExposed from './pages/GapNoExplicitEmbedIngestionRouteExposed';
import GapNoSummarizeCollectionlevelOverview from './pages/GapNoSummarizeCollectionlevelOverview';
import GapNoRecommendsourcesCrossdocumentDiscovery from './pages/GapNoRecommendsourcesCrossdocumentDiscovery';
import GapNoMultisourceRagApisDbsLiveWeb from './pages/GapNoMultisourceRagApisDbsLiveWeb';
import GapNoContradictiondetectionAcrossDocs from './pages/GapNoContradictiondetectionAcrossDocs';
import GapNoCitationprovenanceRoute from './pages/GapNoCitationprovenanceRoute';
import GapNoTeamlevelAccessControlRolePermissions from './pages/GapNoTeamlevelAccessControlRolePermissions';
import GapNoPublicWebhookintegrationSystem from './pages/GapNoPublicWebhookintegrationSystem';
import GapNoBulkImportS3GoogleDriveSharepointCo from './pages/GapNoBulkImportS3GoogleDriveSharepointCo';
import GapNoNotificationSystem from './pages/GapNoNotificationSystem';
import GapNoAuditLogOfWhoQueriedWhat from './pages/GapNoAuditLogOfWhoQueriedWhat';
import GapNoExportshareWorkflow from './pages/GapNoExportshareWorkflow';
// === End Batch 07 ===


function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="documents/:id" element={<DocumentDetail />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:id" element={<ChatSession />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="summaries" element={<AISummary />} />
        <Route path="search" element={<SmartSearch />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="tags" element={<Tags />} />
        <Route path="prompts" element={<PromptTemplates />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="settings" element={<Settings />} />
        <Route path="workspaces" element={<Workspaces />} />
        <Route path="custom-views" element={<CustomViewsPage />} />
      </Route>
          // === Batch 07 Gaps & Frontend Mounts ===
          <Route path='/cf-multisource-rag' element={<CfMultisourceRag />} />
          <Route path='/cf-conversational-document-analyst' element={<CfConversationalDocumentAnalyst />} />
          <Route path='/cf-comparison-contradiction-detection' element={<CfComparisonContradictionDetection />} />
          <Route path='/cf-knowledge-graph-extraction' element={<CfKnowledgeGraphExtraction />} />
          <Route path='/cf-citation-source-tracking' element={<CfCitationSourceTracking />} />
          <Route path='/cf-realtime-document-monitoring' element={<CfRealtimeDocumentMonitoring />} />
          <Route path='/gap-no-explicit-embed-ingestion-route-exposed' element={<GapNoExplicitEmbedIngestionRouteExposed />} />
          <Route path='/gap-no-summarize-collectionlevel-overview' element={<GapNoSummarizeCollectionlevelOverview />} />
          <Route path='/gap-no-recommendsources-crossdocument-discovery' element={<GapNoRecommendsourcesCrossdocumentDiscovery />} />
          <Route path='/gap-no-multisource-rag-apis-dbs-live-web' element={<GapNoMultisourceRagApisDbsLiveWeb />} />
          <Route path='/gap-no-contradictiondetection-across-docs' element={<GapNoContradictiondetectionAcrossDocs />} />
          <Route path='/gap-no-citationprovenance-route' element={<GapNoCitationprovenanceRoute />} />
          <Route path='/gap-no-teamlevel-access-control-role-permissions' element={<GapNoTeamlevelAccessControlRolePermissions />} />
          <Route path='/gap-no-public-webhookintegration-system' element={<GapNoPublicWebhookintegrationSystem />} />
          <Route path='/gap-no-bulk-import-s3-google-drive-sharepoint-co' element={<GapNoBulkImportS3GoogleDriveSharepointCo />} />
          <Route path='/gap-no-notification-system' element={<GapNoNotificationSystem />} />
          <Route path='/gap-no-audit-log-of-who-queried-what' element={<GapNoAuditLogOfWhoQueriedWhat />} />
          <Route path='/gap-no-exportshare-workflow' element={<GapNoExportshareWorkflow />} />
          // === End Batch 07 ===
    </Routes>
  )
}
