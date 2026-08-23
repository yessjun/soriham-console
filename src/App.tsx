import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { WorkspaceProvider } from './auth/WorkspaceProvider'
import { RequireAuth } from './auth/RequireAuth'
import { PlayerProvider } from './player'
import { UploadProvider } from './components/Uploader'
import LibraryPage from './pages/LibraryPage'
import DetailPage from './pages/DetailPage'
import SearchPage from './pages/SearchPage'
import TagsPage from './pages/TagsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PendingPage from './pages/PendingPage'
import NotFoundPage from './pages/NotFoundPage'
import AdminPage from './pages/AdminPage'
import SharedPage from './pages/SharedPage'
import PublicRecordingPage from './pages/PublicRecordingPage'

// 이 파일은 라우트 표만 담는다. 화면 구성은 레이아웃이, 통과 여부는 RequireAuth가 맡는다
export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <PlayerProvider>
          <UploadProvider>
          <Routes>
            {/* 로그인 없이 열리는 유일한 화면. 앱 껍데기를 쓰지 않는다 */}
            <Route path="/s/:token" element={<PublicRecordingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <LibraryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/recordings/:id"
              element={
                <RequireAuth>
                  <DetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/search"
              element={
                <RequireAuth>
                  <SearchPage />
                </RequireAuth>
              }
            />
            <Route
              path="/tags"
              element={
                <RequireAuth>
                  <TagsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/shared"
              element={
                <RequireAuth>
                  <SharedPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/admin"
              element={
                <RequireAuth capability="admin">
                  <AdminPage />
                </RequireAuth>
              }
            />
            <Route
              path="*"
              element={
                <RequireAuth>
                  <NotFoundPage />
                </RequireAuth>
              }
            />
          </Routes>
          </UploadProvider>
        </PlayerProvider>
      </WorkspaceProvider>
    </AuthProvider>
  )
}
