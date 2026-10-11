import Image from 'next/image';

interface SiteImageProps {
  src: string;
  alt: string;
  /**
   * How wide the image shows at each screen size, e.g. '(min-width: 1024px) 25vw, 50vw' or '80px'. The browser
   * uses it to download the smallest stored width that stays sharp (see lib/media).
   */
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  /** Load at once and preload: only for the main image near the top of a page. */
  priority?: boolean;
}

/**
 * A storefront image. Drop-in for `<img>`: the className still sets its size and crop (`aspect-*`, `h-*`, `w-*`,
 * `object-cover`), and it loads lazily unless `priority`. The width/height below only give the browser a
 * starting shape until the CSS applies.
 */
export function SiteImage({ src, alt, sizes, className, style, priority }: SiteImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      sizes={sizes}
      width={1200}
      height={1500}
      className={className}
      style={style}
      priority={priority}
    />
  );
}
