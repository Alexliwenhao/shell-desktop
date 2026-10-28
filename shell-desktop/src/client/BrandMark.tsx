/**
 * Desktop-owned brand mark. The shipped conversation hero falls back to its own
 * fish when no entry occupies `conversation.hero.brand.mark`, so occupying that
 * slot replaces the in-app logo without patching the shipped client. The mark is
 * an S monogram framed by a broken diamond in the product's blue-to-cyan
 * gradient.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'

/** Hero brand-mark slot currency: a square edge and the host's geometry class. */
export interface BrandMarkProps {
  /** Requested square edge in pixels. */
  readonly size?: number
  /** Host class preserving the surrounding mark geometry. */
  readonly className?: string
}

/** Gradient identity shared by the diamond frame and the S strokes. */
const GRADIENT_ID = 'ai-shell-brand-gradient'
/** Diamond-frame segments drawn around the monogram. */
const FRAME_SEGMENTS: readonly string[] = Object.freeze([
  'M19 37 L37 19',
  'M63 19 L81 37',
  'M81 63 L63 81',
  'M37 81 L19 63',
])
/** Bars that compose the square S monogram. */
const S_BARS: readonly { readonly x: number; readonly y: number; readonly width: number; readonly height: number }[] = Object.freeze([
  { x: 33, y: 31, width: 35, height: 8 },
  { x: 33, y: 31, width: 8, height: 23 },
  { x: 33, y: 42, width: 35, height: 8 },
  { x: 60, y: 42, width: 8, height: 24 },
  { x: 32, y: 58, width: 35, height: 8 },
])

/**
 * Render the product mark.
 * @param props - requested square edge and the host's geometry class.
 * @returns the mark as an accessible square SVG.
 */
export function BrandMark({ size = 34, className }: BrandMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="AI Shell"
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4D6BFE" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${GRADIENT_ID})`} strokeWidth={6} strokeLinecap="round">
        {FRAME_SEGMENTS.map(segment => <path key={segment} d={segment} />)}
      </g>
      <g fill={`url(#${GRADIENT_ID})`}>
        {S_BARS.map(bar => (
          <rect key={`${bar.x}-${bar.y}-${bar.width}-${bar.height}`} {...bar} />
        ))}
      </g>
    </svg>
  )
}

/**
 * Occupy the hero brand-mark slot with the product mark. Every desktop-owned
 * presentation calls this; compatibility mode deliberately does not, because it
 * must keep the upstream client unmodified.
 * @param ctx - Desktop client context carrying the slot registry.
 * @returns the slot registration disposer, or a no-op when the slot is unavailable.
 */
export function installBrandMark(ctx: ClientContext): () => void {
  try {
    return ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({
      name: 'conversation.hero.brand.mark',
    }, BrandMark as never))
  } catch (cause) {
    ctx.logger.warn(`shell-desktop: brand mark slot failed: ${cause instanceof Error ? cause.message : String(cause)}`)
    return () => {}
  }
}
