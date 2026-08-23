import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui'
import { FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={FileQuestion}
        message="없는 주소입니다"
        action={
          <Link to="/" className="text-sm text-accent">
            라이브러리로
          </Link>
        }
      />
    </div>
  )
}
