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
import Layout from './components/Layout'

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
      </Route>
    </Routes>
  )
}
