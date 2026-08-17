import { Tags } from 'lucide-react'
import { EmptyState } from '../components/ui'

export default function TagsPage() {
  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-bold tracking-[-0.01em]">태그</h2>
      <EmptyState icon={Tags} message="태그 화면은 준비 중입니다." />
    </div>
  )
}
