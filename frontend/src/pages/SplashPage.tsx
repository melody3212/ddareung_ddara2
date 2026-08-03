import { Link } from 'react-router-dom'

export function SplashPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 text-2xl text-white shadow-lg">
        🚲
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">따릉따라</h1>
      <p className="mt-2 text-center text-slate-500">
        서울 자전거 코스, 이제 따릉따라로 간편하게
      </p>
      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <Link
          to="/home"
          className="rounded-full bg-blue-500 py-3 text-center font-semibold text-white shadow hover:bg-blue-600"
        >
          시작하기
        </Link>
        <Link
          to="/login"
          className="rounded-full border border-slate-300 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
        >
          로그인
        </Link>
      </div>
      <p className="mt-8 text-xs text-slate-400">MVP · Kakao Maps 연동 예정</p>
    </div>
  )
}
