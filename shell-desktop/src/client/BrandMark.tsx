/**
 * Desktop-owned brand mark. The shipped conversation hero falls back to its own
 * fish when no entry occupies `conversation.hero.brand.mark`, so occupying that
 * slot replaces the in-app logo without patching the shipped client. The paths
 * trace the product mark artwork: one facet per brand shade.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'

/** Hero brand-mark slot currency: a square edge and the host's geometry class. */
export interface BrandMarkProps {
  /** Requested square edge in pixels. */
  readonly size?: number
  /** Host class preserving the surrounding mark geometry. */
  readonly className?: string
}

/** One facet of the mark: brand shade plus its traced outline. */
const FACETS: readonly { readonly fill: string; readonly path: string }[] = Object.freeze([
  { fill: '#0062a4', path: 'M221 2L220 111L330 111L222 2ZM332 112L331 221L440 221L332 113ZM1 221L0 222L109 331L110 221L2 221ZM112 332L111 333L219 441L221 441L221 332L113 332Z' },
  { fill: '#9dd3ed', path: 'M220 2L111 110L112 220L220 3ZM111 221L110 331L220 222L112 221Z' },
  { fill: '#009ad7', path: 'M222 111L221 112L331 221L331 331L441 221L331 221L331 111L223 111Z' },
  { fill: '#1eaadd', path: 'M110 112L1 220L110 221L110 113ZM221 222L112 330L221 331L221 223Z' },
  { fill: '#55bbe5', path: 'M221 221L111 330L112 331L221 222ZM330 223L221 439L222 441L331 332L330 224Z' },
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
      viewBox="0 0 441 442"
      role="img"
      aria-label="AI Shell"
    >
      {FACETS.map(facet => (
        <path key={facet.fill} fill={facet.fill} fillRule="evenodd" d={facet.path} />
      ))}
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
