import { ChartColumn } from 'lucide-react'
import { EmptyState } from '../components/ui'

export default function DashboardPage() {
  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-bold tracking-[-0.01em]">대시보드</h2>
      <EmptyState icon={ChartColumn} message="대시보드 화면은 준비 중입니다." />
    </div>
  )
}
