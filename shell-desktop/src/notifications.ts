/** Privacy-safe desktop attention for completed user turns and background jobs. */

import type { Context } from '@deepseek-ai/cordis'
import type { JobSnapshot } from '@deepseek-ai/dsh-jobs'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import z from '@deepseek-ai/schemastery'
import type { DesktopLocale, DesktopNotification } from './runtime.ts'

export const name = 'desktop-notifications'
export const inject = ['desktopRuntime']

export const DESKTOP_NOTIFICATIONS_SETTINGS_NAMESPACE = 'shell-desktop-notifications'

export interface DesktopNotificationSettings {
  enabled: boolean
  notifyOnTurnCompletion: boolean
  notifyOnTurnFailure: boolean
  notifyOnJobCompletion: boolean
  notifyOnJobFailure: boolean
}

export const DesktopNotificationSettingsSchema: z<DesktopNotificationSettings> = z.object({
  enabled: z.boolean().default(true),
  notifyOnTurnCompletion: z.boolean().default(true),
  notifyOnTurnFailure: z.boolean().default(true),
  notifyOnJobCompletion: z.boolean().default(true),
  notifyOnJobFailure: z.boolean().default(true),
})

const DEFAULT_SETTINGS = DesktopNotificationSettingsSchema({} as DesktopNotificationSettings)

type NotificationOutcome = 'turn-completed' | 'turn-failed' | 'job-completed' | 'job-failed'

const NOTIFICATION_COPY: Record<DesktopLocale, Record<NotificationOutcome, DesktopNotification>> = {
  en: {
    'turn-completed': { title: 'User Turn Completed', body: 'A user-initiated turn has finished.' },
    'turn-failed': { title: 'User Turn Failed', body: 'A user-initiated turn could not finish. Open AI Shell Desktop for details.' },
    'job-completed': { title: 'Background Job Completed', body: 'A background job has finished.' },
    'job-failed': { title: 'Background Job Failed', body: 'A background job could not finish. Open AI Shell Desktop for details.' },
  },
  zh: {
    'turn-completed': { title: '用户回合已完成', body: '一个由你发起的回合已完成。' },
    'turn-failed': { title: '用户回合失败', body: '一个由你发起的回合未能完成，请打开 AI Shell Desktop 查看详情。' },
    'job-completed': { title: '后台任务已完成', body: '有一个后台任务已结束。' },
    'job-failed': { title: '后台任务失败', body: '一个后台任务未能完成，请打开 AI Shell Desktop 查看详情。' },
  },
  'zh-Hant': {
    'turn-completed': { title: '使用者回合已完成', body: '一個由你發起的回合已完成。' },
    'turn-failed': { title: '使用者回合失敗', body: '一個由你發起的回合未能完成，請開啟 AI Shell Desktop 查看詳情。' },
    'job-completed': { title: '背景工作已完成', body: '有一個背景工作已結束。' },
    'job-failed': { title: '背景工作失敗', body: '一個背景工作未能完成，請開啟 AI Shell Desktop 查看詳情。' },
  },
  ja: {
    'turn-completed': { title: 'ユーザーターン完了', body: 'ユーザーが開始したターンが完了しました。' },
    'turn-failed': { title: 'ユーザーターン失敗', body: 'ユーザーが開始したターンを完了できませんでした。詳細はAI Shell Desktopを開いて確認してください。' },
    'job-completed': { title: 'バックグラウンドジョブ完了', body: 'バックグラウンドジョブが完了しました。' },
    'job-failed': { title: 'バックグラウンドジョブ失敗', body: 'バックグラウンドジョブを完了できませんでした。詳細はAI Shell Desktopを開いて確認してください。' },
  },
  ko: {
    'turn-completed': { title: '사용자 턴 완료', body: '사용자가 시작한 턴이 완료되었어요.' },
    'turn-failed': { title: '사용자 턴 실패', body: '사용자가 시작한 턴을 완료하지 못했어요. 자세한 내용은 AI Shell Desktop을 열어 확인하세요.' },
    'job-completed': { title: '백그라운드 작업 완료', body: '백그라운드 작업이 완료되었어요.' },
    'job-failed': { title: '백그라운드 작업 실패', body: '백그라운드 작업을 완료하지 못했어요. 자세한 내용은 AI Shell Desktop을 열어 확인하세요.' },
  },
  es: {
    'turn-completed': { title: 'Turno del usuario completado', body: 'Un turno iniciado por el usuario ha finalizado.' },
    'turn-failed': { title: 'Turno del usuario fallido', body: 'Un turno iniciado por el usuario no pudo finalizar. Abrir AI Shell Desktop para ver los detalles.' },
    'job-completed': { title: 'Tarea en segundo plano completada', body: 'Una tarea en segundo plano ha finalizado.' },
    'job-failed': { title: 'Tarea en segundo plano fallida', body: 'Una tarea en segundo plano no pudo finalizar. Abrir AI Shell Desktop para ver los detalles.' },
  },
  fr: {
    'turn-completed': { title: 'Tour utilisateur terminé', body: 'Un tour lancé par l’utilisateur est terminé.' },
    'turn-failed': { title: 'Échec du tour utilisateur', body: 'Un tour lancé par l’utilisateur n’a pas pu se terminer. Ouvrez AI Shell Desktop pour plus de détails.' },
    'job-completed': { title: 'Tâche d’arrière-plan terminée', body: 'Une tâche d’arrière-plan est terminée.' },
    'job-failed': { title: 'Échec de la tâche d’arrière-plan', body: 'Une tâche d’arrière-plan n’a pas pu se terminer. Ouvrez AI Shell Desktop pour plus de détails.' },
  },
  de: {
    'turn-completed': { title: 'Benutzerrunde abgeschlossen', body: 'Eine vom Benutzer gestartete Runde wurde abgeschlossen.' },
    'turn-failed': { title: 'Benutzerrunde fehlgeschlagen', body: 'Eine vom Benutzer gestartete Runde konnte nicht abgeschlossen werden. AI Shell Desktop öffnen, um Details zu sehen.' },
    'job-completed': { title: 'Hintergrundaufgabe abgeschlossen', body: 'Eine Hintergrundaufgabe wurde abgeschlossen.' },
    'job-failed': { title: 'Hintergrundaufgabe fehlgeschlagen', body: 'Eine Hintergrundaufgabe konnte nicht abgeschlossen werden. AI Shell Desktop öffnen, um Details zu sehen.' },
  },
}

interface OpenTurn {
  readonly turn: number
  userInitiated: boolean
}

function notifyJob(
  runtime: Context['desktopRuntime'],
  settings: DesktopNotificationSettings,
  snapshot: JobSnapshot,
): void {
  if (!settings.enabled) return
  if (snapshot.status === 'completed' && settings.notifyOnJobCompletion) {
    runtime.notifyAttention(NOTIFICATION_COPY[runtime.locale]['job-completed'])
  } else if (snapshot.status === 'failed' && settings.notifyOnJobFailure) {
    runtime.notifyAttention(NOTIFICATION_COPY[runtime.locale]['job-failed'])
  }
}

function trackTurn(
  runtime: Context['desktopRuntime'],
  settings: DesktopNotificationSettings,
  openTurns: Map<string, OpenTurn>,
  session: Session,
  event: SessionEvent,
): void {
  if (!settings.enabled) return
  if (session.header.origin === 'subagent') return
  const sessionId = String(session.header.id)

  if (event.type === 'turn/start') {
    openTurns.set(sessionId, { turn: event.data.turn, userInitiated: false })
    return
  }
  if (event.type === 'user/message') {
    const openTurn = openTurns.get(sessionId)
    if (openTurn !== undefined && event.data.source.kind === 'user') openTurn.userInitiated = true
    return
  }
  if (event.type !== 'turn/end') return

  const openTurn = openTurns.get(sessionId)
  if (openTurn === undefined || openTurn.turn !== event.data.turn) return
  openTurns.delete(sessionId)
  if (!openTurn.userInitiated) return

  const reason = event.data.reason.kind
  if (reason === 'completed' && settings.notifyOnTurnCompletion) {
    runtime.notifyAttention(NOTIFICATION_COPY[runtime.locale]['turn-completed'])
  } else if ((reason === 'error' || reason === 'max-tokens') && settings.notifyOnTurnFailure) {
    runtime.notifyAttention(NOTIFICATION_COPY[runtime.locale]['turn-failed'])
  }
}

/** Register independently optional settings, job, and live-session observers. */
export function apply(ctx: Context): void {
  let settings = DEFAULT_SETTINGS

  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => {
      const scope = settingsCtx.settings.register(
        DESKTOP_NOTIFICATIONS_SETTINGS_NAMESPACE,
        DesktopNotificationSettingsSchema,
        { applies: 'live' },
      )
      settings = scope.get()
      const stopWatching = scope.watch((next) => { settings = next })
      return () => {
        stopWatching()
        settings = DEFAULT_SETTINGS
      }
    }, 'shell-desktop: native notification settings')
  })

  ctx.inject(['jobs'], (jobsCtx) => {
    jobsCtx.effect(
      () => jobsCtx.jobs.onJobDone(snapshot => { notifyJob(jobsCtx.desktopRuntime, settings, snapshot) }),
      'shell-desktop: background job attention',
    )
  })

  ctx.inject(['sessions'], (sessionsCtx) => {
    sessionsCtx.effect(() => {
      const openTurns = new Map<string, OpenTurn>()
      const stopEvents = sessionsCtx.on('session/event', (session, event) => {
        trackTurn(sessionsCtx.desktopRuntime, settings, openTurns, session, event)
      })
      const stopDisposed = sessionsCtx.on('session/disposed', (session) => {
        openTurns.delete(String(session.header.id))
      })
      return () => {
        stopDisposed()
        stopEvents()
      }
    }, 'shell-desktop: direct user turn attention')
  })
}
