type PageHeaderProps = {
  title: string
  description?: string
}

function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-4xl font-semibold leading-tight tracking-normal">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-xl leading-relaxed text-neutral-300">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export default PageHeader
