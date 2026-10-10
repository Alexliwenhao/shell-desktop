/** Shared copy for the isolated Profile creator and its native owner. */

import type { DesktopLocale } from './runtime.ts'

export interface DesktopProfileCreateCopy {
  readonly title: string
  readonly heading: string
  readonly description: string
  readonly label: string
  readonly placeholder: string
  readonly submit: string
  readonly cancel: string
  readonly empty: string
  readonly failed: string
}

const COPY: Record<DesktopLocale, DesktopProfileCreateCopy> = {
  en: {
    title: 'New Profile',
    heading: 'Create a Profile',
    description: 'Create a Desktop-compatible Profile and select it for the next start.',
    label: 'Profile name',
    placeholder: 'For example: work',
    submit: 'Create Profile',
    cancel: 'Cancel',
    empty: 'Enter a Profile name.',
    failed: 'The Profile could not be created. Check the name and try again.',
  },
  zh: {
    title: '新建 Profile',
    heading: '新建 Profile',
    description: '创建一个支持桌面端的 Profile，并设为下次启动时使用的 Profile。',
    label: 'Profile 名称',
    placeholder: '例如：work',
    submit: '创建 Profile',
    cancel: '取消',
    empty: '请输入 Profile 名称。',
    failed: '无法创建 Profile，请检查名称后重试。',
  },
  'zh-Hant': {
    title: '新增 Profile',
    heading: '建立 Profile',
    description: '建立支援桌面版的 Profile，並設為下次啟動時使用的 Profile。',
    label: 'Profile 名稱',
    placeholder: '例如：work',
    submit: '建立 Profile',
    cancel: '取消',
    empty: '請輸入 Profile 名稱。',
    failed: '無法建立 Profile，請檢查名稱後重試。',
  },
  ja: {
    title: '新規Profile',
    heading: 'Profileの作成',
    description: 'デスクトップ版に対応したProfileを作成し、次回起動時に使用するProfileとして選択します。',
    label: 'Profile名',
    placeholder: '例: work',
    submit: 'Profileを作成',
    cancel: 'キャンセル',
    empty: 'Profile名を入力してください。',
    failed: 'Profileを作成できませんでした。名前を確認してもう一度お試しください。',
  },
  ko: {
    title: '새 Profile',
    heading: 'Profile 만들기',
    description: '데스크톱과 호환되는 Profile을 만들고 다음 시작 시 사용할 Profile로 선택하세요.',
    label: 'Profile 이름',
    placeholder: '예: work',
    submit: 'Profile 만들기',
    cancel: '취소',
    empty: 'Profile 이름을 입력하세요.',
    failed: 'Profile을 만들지 못했어요. 이름을 확인하고 다시 시도하세요.',
  },
  es: {
    title: 'Nuevo Profile',
    heading: 'Crear un Profile',
    description: 'Crear un Profile compatible con la versión de escritorio y seleccionarlo para el próximo inicio.',
    label: 'Nombre del Profile',
    placeholder: 'Por ejemplo: work',
    submit: 'Crear Profile',
    cancel: 'Cancelar',
    empty: 'Escribe un nombre de Profile.',
    failed: 'No se pudo crear el Profile. Revisar el nombre y volver a intentarlo.',
  },
  fr: {
    title: 'Nouveau Profile',
    heading: 'Créer un Profile',
    description: 'Créez un Profile compatible avec la version bureau et sélectionnez-le pour le prochain démarrage.',
    label: 'Nom du Profile',
    placeholder: 'Par exemple\u00A0: work',
    submit: 'Créer le Profile',
    cancel: 'Annuler',
    empty: 'Saisissez un nom de Profile.',
    failed: 'Impossible de créer le Profile. Vérifiez le nom et réessayez.',
  },
  de: {
    title: 'Neues Profile',
    heading: 'Profile erstellen',
    description: 'Ein Desktop-kompatibles Profile erstellen und für den nächsten Start auswählen.',
    label: 'Profile-Name',
    placeholder: 'Zum Beispiel: work',
    submit: 'Profile erstellen',
    cancel: 'Abbrechen',
    empty: 'Einen Profile-Namen eingeben.',
    failed: 'Das Profile konnte nicht erstellt werden. Namen prüfen und erneut versuchen.',
  },
}

export function desktopProfileCreateCopy(locale: DesktopLocale): DesktopProfileCreateCopy {
  return COPY[locale]
}
