import type { ReactNode } from 'react'

type SectionCardProps = {
  children: ReactNode
  title?: string
}

function SectionCard({ children, title }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-[#DED8CF] bg-[#FFFCF7] p-4 shadow-[0_1px_2px_rgba(31,29,26,0.04)] sm:p-5">
      {title ? (
        <h3 className="mb-3 text-xl font-extrabold leading-tight tracking-normal text-[#1F1D1A]">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  )
}

export default SectionCard
