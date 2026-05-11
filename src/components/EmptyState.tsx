type EmptyStateProps = {
  message: string
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-neutral-700 bg-black p-8 text-center">
      <p className="text-2xl font-medium leading-relaxed text-neutral-300">
        {message}
      </p>
    </div>
  )
}

export default EmptyState
