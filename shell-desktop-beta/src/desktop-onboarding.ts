/**
 * The upstream browser surface opens a first-run internal-testing notice whose
 * dismissal is a durable onboarding fact: it stays hidden while the
 * `ui-onboarding` section already stores the acknowledged copy revision. The
 * desktop product accepts that revision for its users, so an AI-Shell launch is
 * never gated behind the notice.
 */

import type { SettingsProvider } from '@deepseek-ai/dsh-settings'

/** Durable namespace owned by the upstream settings surface. */
export const WELCOME_NOTICE_NAMESPACE = 'ui-onboarding'
/** Field holding the copy revision the user acknowledged. */
export const WELCOME_NOTICE_VERSION_FIELD = 'welcomeNoticeVersion'
/** Copy revision the desktop product acknowledges on the user's behalf. */
export const ACKNOWLEDGED_WELCOME_NOTICE_VERSION = '2026-08-13.1'
/** Delay between registration waits, in milliseconds. */
export const WELCOME_NOTICE_RETRY_MS = 500
/** Registration waits before the attempt is abandoned. */
export const WELCOME_NOTICE_RETRY_ATTEMPTS = 40

/** Failure sink and retry schedule for {@link acknowledgeWelcomeNotice}. */
export interface WelcomeNoticeOptions {
  /** Registration waits; defaults to {@link WELCOME_NOTICE_RETRY_ATTEMPTS}. */
  readonly attempts?: number
  /** Delay between waits; defaults to {@link WELCOME_NOTICE_RETRY_MS}. */
  readonly retryMs?: number
  /** Observe a refused or failed write without disturbing boot. */
  readonly onFailure?: (cause: unknown) => void
}

/**
 * Persist the acknowledged notice revision once the upstream section is
 * registered. The section belongs to the settings surface, so boot may run
 * before it exists; the wait is bounded and the returned disposer cancels it.
 * An already-acknowledged section is left untouched, keeping the document free
 * of redundant writes.
 * @param settings - Host settings face holding the durable document.
 * @param options - retry schedule and failure sink.
 * @returns disposer cancelling a pending wait.
 */
export function acknowledgeWelcomeNotice(
  settings: Pick<SettingsProvider, 'get' | 'update'>,
  options: WelcomeNoticeOptions = {},
): () => void {
  const attempts = options.attempts ?? WELCOME_NOTICE_RETRY_ATTEMPTS
  const retryMs = options.retryMs ?? WELCOME_NOTICE_RETRY_MS
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const attempt = (remaining: number): void => {
    if (disposed) return
    const section = settings.get(WELCOME_NOTICE_NAMESPACE) as Record<string, unknown> | undefined
    if (section === undefined) {
      if (remaining > 0) timer = setTimeout(() => { attempt(remaining - 1) }, retryMs)
      return
    }
    if (section[WELCOME_NOTICE_VERSION_FIELD] === ACKNOWLEDGED_WELCOME_NOTICE_VERSION) return
    void settings.update(WELCOME_NOTICE_NAMESPACE, {
      [WELCOME_NOTICE_VERSION_FIELD]: ACKNOWLEDGED_WELCOME_NOTICE_VERSION,
    }).catch((cause: unknown) => { options.onFailure?.(cause) })
  }
  attempt(attempts)
  return () => {
    disposed = true
    if (timer !== undefined) clearTimeout(timer)
  }
}
