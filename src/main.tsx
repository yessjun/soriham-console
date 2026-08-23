import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { applyTheme, loadTheme } from './theme'

// 앱 껍데기 밖(공개 링크, 로그인)에서도 고른 테마가 걸리게 여기서 한 번 적용한다.
// 렌더 전에 걸어야 밝은 화면이 한 번 번쩍이지 않는다
applyTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
