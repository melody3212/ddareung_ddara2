import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SplashPage } from './pages/SplashPage'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="mx-auto min-h-full max-w-lg bg-white shadow-sm">
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<PlaceholderPage title="로그인" note="확장: JWT 로그인" />} />
            <Route path="/signup" element={<PlaceholderPage title="회원가입" />} />
            <Route path="/search-route" element={<PlaceholderPage title="길찾기" />} />
            <Route path="/riding" element={<PlaceholderPage title="주행" note="확장: GPS 대시보드" />} />
            <Route path="/community" element={<PlaceholderPage title="커뮤니티" note="확장 후반" />} />
            <Route path="/mypage" element={<PlaceholderPage title="마이페이지" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
