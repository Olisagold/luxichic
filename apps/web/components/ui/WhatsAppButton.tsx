import React from 'react';
import { MessageCircleIcon } from 'lucide-react';
import { whatsappLink } from '@/lib/utils/whatsapp';
import { cn } from '@/lib/utils/cn';

interface WhatsAppButtonProps {
  number: string;
  message: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const sizes = { sm: 'h-9 px-4 text-[11px]', md: 'h-12 px-6 text-xs', lg: 'h-14 px-8 text-xs' };

/** Opens WhatsApp with a prefilled message. Numbers are configurable placeholders. */
export function WhatsAppButton({
  number,
  message,
  label = 'Chat on WhatsApp',
  size = 'md',
  fullWidth,
  className,
}: WhatsAppButtonProps) {
  return (
    <a
      href={whatsappLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-whatsapp font-bold uppercase tracking-[0.14em] text-white',
        'transition-[background-color,transform] duration-200 ease-lux hover:bg-whatsapp-hover active:scale-[0.98]',
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      <MessageCircleIcon className="h-4 w-4" aria-hidden />
      {label}
      <span className="sr-only">(opens WhatsApp)</span>
    </a>
  );
}
