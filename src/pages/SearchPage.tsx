import { Search } from 'lucide-react'
import { EmptyState } from '../components/ui'

export default function SearchPage() {
  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-bold tracking-[-0.01em]">검색</h2>
      <EmptyState icon={Search} message="검색 화면은 준비 중입니다." />
    </div>
  )
}
