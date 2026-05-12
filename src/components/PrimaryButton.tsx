import type { ButtonHTMLAttributes } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

function PrimaryButton({ className = '', type = 'button', ...props }: PrimaryButtonProps) {
  return (
    <button
      className={[
        'min-h-12 rounded-xl border border-[#1F1D1A] bg-[#1F1D1A] px-6 text-lg font-bold text-[#FFFCF7]',
        'active:bg-[#3A352F] disabled:cursor-not-allowed disabled:border-[#DED8CF] disabled:bg-[#EFE8DD] disabled:text-[#6F6A63]',
        'focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]',
        className,
      ].join(' ')}
      type={type}
      {...props}
    />
  )
}

export default PrimaryButton
