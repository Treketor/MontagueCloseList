import type { ReactNode } from 'react'

type SectionCardProps = {
  children: ReactNode
  title?: string
}

function SectionCard({ children, title }: SectionCardProps) {
  return (
    <section className="rounded-md border border-neutral-800 bg-black p-5">
      {title ? (
        <h3 className="mb-4 text-2xl font-semibold leading-tight tracking-normal">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  )
}

export default SectionCard
