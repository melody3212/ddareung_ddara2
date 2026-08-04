import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NavigationPage, RouteSearchPage } from './features/routes'
import { RideDetailPage, RidingPage } from './features/rides'
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
        {/* 모바일 앱 프레임: 높이·폭 고정으로 비율 유지 */}
        <div className="relative mx-auto min-h-[100dvh] max-w-lg bg-white shadow-sm">
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<PlaceholderPage title="로그인" note="확장: JWT 로그인" />} />
            <Route path="/signup" element={<PlaceholderPage title="회원가입" />} />
            <Route path="/search-route" element={<RouteSearchPage />} />
            <Route path="/navigate" element={<NavigationPage />} />
            <Route path="/riding" element={<RidingPage />} />
            <Route path="/riding/:rideId" element={<RideDetailPage />} />
            <Route path="/community" element={<PlaceholderPage title="커뮤니티" note="확장 후반" />} />
            <Route path="/mypage" element={<PlaceholderPage title="마이페이지" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
