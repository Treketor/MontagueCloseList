import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  message: string
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#DED8CF] bg-[#FFFCF7] p-8 text-center">
      <Inbox aria-hidden="true" className="mb-3 h-7 w-7 text-[#6F6A63]" />
      <p className="max-w-xl text-xl font-semibold leading-relaxed text-[#6F6A63]">
        {message}
      </p>
    </div>
  )
}

export default EmptyState
