import type { ButtonHTMLAttributes } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

function PrimaryButton({ className = '', type = 'button', ...props }: PrimaryButtonProps) {
  return (
    <button
      className={[
        'min-h-14 rounded-md border border-white bg-white px-6 text-lg font-semibold text-black',
        'active:bg-neutral-200 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-500',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black',
        className,
      ].join(' ')}
      type={type}
      {...props}
    />
  )
}

export default PrimaryButton
