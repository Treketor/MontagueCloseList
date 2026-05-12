type PageHeaderProps = {
  title: string
  description?: string
}

function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-4 text-center">
      <h2 className="text-3xl font-extrabold leading-tight tracking-normal text-[#1F1D1A]">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-2xl text-lg font-semibold leading-relaxed text-[#6F6A63]">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export default PageHeader
