import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACKNOWLEDGED_WELCOME_NOTICE_VERSION,
  WELCOME_NOTICE_NAMESPACE,
  WELCOME_NOTICE_VERSION_FIELD,
  acknowledgeWelcomeNotice,
} from '../src/desktop-onboarding.ts'

/** Minimal settings face recording reads and writes. */
function settingsFace(sections: Record<string, unknown>, failure?: unknown) {
  const updates: { namespace: string, patch: object }[] = []
  return {
    updates,
    get: (namespace: string) => sections[namespace],
    update: async (namespace: string, patch: object) => {
      if (failure !== undefined) throw failure
      updates.push({ namespace, patch })
      sections[namespace] = { ...(sections[namespace] as object | undefined), ...patch }
    },
  }
}

afterEach(() => { vi.useRealTimers() })

describe('internal-testing notice acknowledgement', () => {
  it('waits for the upstream section, then stores the accepted revision', async () => {
    vi.useFakeTimers()
    const sections: Record<string, unknown> = {}
    const settings = settingsFace(sections)
    acknowledgeWelcomeNotice(settings, { attempts: 3, retryMs: 100 })

    await vi.advanceTimersByTimeAsync(250)
    expect(settings.updates).toHaveLength(0)

    sections[WELCOME_NOTICE_NAMESPACE] = {}
    await vi.advanceTimersByTimeAsync(150)
    expect(settings.updates).toEqual([{
      namespace: WELCOME_NOTICE_NAMESPACE,
      patch: { [WELCOME_NOTICE_VERSION_FIELD]: ACKNOWLEDGED_WELCOME_NOTICE_VERSION },
    }])
  })

  it('leaves an already acknowledged section untouched', async () => {
    vi.useFakeTimers()
    const settings = settingsFace({
      [WELCOME_NOTICE_NAMESPACE]: { [WELCOME_NOTICE_VERSION_FIELD]: ACKNOWLEDGED_WELCOME_NOTICE_VERSION },
    })
    acknowledgeWelcomeNotice(settings, { attempts: 2, retryMs: 100 })

    await vi.advanceTimersByTimeAsync(500)
    expect(settings.updates).toHaveLength(0)
  })

  it('reports a refused write without failing boot', async () => {
    vi.useFakeTimers()
    const failure = new Error('read-only document')
    const onFailure = vi.fn()
    acknowledgeWelcomeNotice(settingsFace({ [WELCOME_NOTICE_NAMESPACE]: {} }, failure), {
      attempts: 2,
      retryMs: 100,
      onFailure,
    })

    await vi.advanceTimersByTimeAsync(300)
    expect(onFailure).toHaveBeenCalledWith(failure)
  })

  it('stops waiting once the disposer runs', async () => {
    vi.useFakeTimers()
    const settings = settingsFace({})
    const dispose = acknowledgeWelcomeNotice(settings, { attempts: 5, retryMs: 100 })
    dispose()

    settings.get = () => ({})
    await vi.advanceTimersByTimeAsync(500)
    expect(settings.updates).toHaveLength(0)
  })
})
