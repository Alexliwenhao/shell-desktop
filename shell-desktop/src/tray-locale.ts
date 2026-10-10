/** Desktop-owned native tray copy for the locales shipped by DSH. */

import type { DesktopLocale } from './runtime.ts'
import { desktopRecoveryCopy } from './recovery-copy.ts'

export type DesktopTrayLabelKey =
  | 'addProfile'
  | 'checkForUpdates'
  | 'checkingForUpdates'
  | 'downloadingUpdate'
  | 'enterSafeMode'
  | 'exportDiagnostics'
  | 'exitSafeMode'
  | 'openDesktop'
  | 'openTerminal'
  | 'profile'
  | 'quit'
  | 'installStable'
  | 'unavailableForDesktop'
  | 'updateAvailable'

const labels: Record<DesktopLocale, Record<DesktopTrayLabelKey, (value: string) => string>> = {
  en: {
    addProfile: () => 'New Profile…',
    checkForUpdates: () => 'Check for Updates…',
    checkingForUpdates: () => 'Checking for Updates…',
    downloadingUpdate: version => `Downloading AI Shell Desktop ${version}…`,
    enterSafeMode: () => 'Enter Safe Mode…',
    exportDiagnostics: () => 'Export Diagnostics…',
    exitSafeMode: () => 'Exit Safe Mode and Restart…',
    openDesktop: productName => `Open ${productName}`,
    openTerminal: () => 'Open DSH Terminal',
    profile: profileName => `Profile: ${profileName}`,
    quit: () => 'Quit',
    installStable: () => 'Install Stable Edition…',
    unavailableForDesktop: profileName => `${profileName} (Unavailable for Desktop)`,
    updateAvailable: version => `AI Shell Desktop ${version} Available`,
  },
  zh: {
    addProfile: () => '新建 Profile…',
    checkForUpdates: () => '检查更新…',
    checkingForUpdates: () => '正在检查更新…',
    downloadingUpdate: version => `正在下载 AI Shell Desktop ${version}…`,
    enterSafeMode: () => '进入安全模式…',
    exportDiagnostics: () => '导出诊断信息…',
    exitSafeMode: () => '退出安全模式并重启…',
    openDesktop: productName => `打开 ${productName}`,
    openTerminal: () => '打开 DSH 终端',
    profile: profileName => `Profile：${profileName}`,
    quit: () => '退出',
    installStable: () => '安装稳定版…',
    unavailableForDesktop: profileName => `${profileName}（不可用于桌面端）`,
    updateAvailable: version => `AI Shell Desktop ${version} 可用`,
  },
  'zh-Hant': {
    addProfile: () => '新增 Profile…',
    checkForUpdates: () => '檢查更新…',
    checkingForUpdates: () => '正在檢查更新…',
    downloadingUpdate: version => `正在下載 AI Shell Desktop ${version}…`,
    enterSafeMode: () => '進入安全模式…',
    exportDiagnostics: () => '匯出診斷資訊…',
    exitSafeMode: () => '退出安全模式並重新啟動…',
    openDesktop: productName => `開啟 ${productName}`,
    openTerminal: () => '開啟 DSH 終端機',
    profile: profileName => `Profile：${profileName}`,
    quit: () => '結束',
    installStable: () => '安裝穩定版…',
    unavailableForDesktop: profileName => `${profileName}（不適用於桌面版）`,
    updateAvailable: version => `AI Shell Desktop ${version} 可用`,
  },
  ja: {
    addProfile: () => '新規 Profile…',
    checkForUpdates: () => 'アップデートを確認…',
    checkingForUpdates: () => 'アップデートを確認しています…',
    downloadingUpdate: version => `AI Shell Desktop ${version}をダウンロードしています…`,
    enterSafeMode: () => 'セーフモードに入る…',
    exportDiagnostics: () => '診断情報をエクスポート…',
    exitSafeMode: () => 'セーフモードを終了して再起動…',
    openDesktop: productName => `${productName}を開く`,
    openTerminal: () => 'DSHターミナルを開く',
    profile: profileName => `Profile：${profileName}`,
    quit: () => '終了',
    installStable: () => '安定版をインストール…',
    unavailableForDesktop: profileName => `${profileName}（デスクトップ版には対応していません）`,
    updateAvailable: version => `AI Shell Desktop ${version}が利用可能`,
  },
  ko: {
    addProfile: () => '새 Profile…',
    checkForUpdates: () => '업데이트 확인…',
    checkingForUpdates: () => '업데이트 확인 중…',
    downloadingUpdate: version => `AI Shell Desktop ${version} 다운로드 중…`,
    enterSafeMode: () => '안전 모드 시작…',
    exportDiagnostics: () => '진단 정보 내보내기…',
    exitSafeMode: () => '안전 모드 종료 후 다시 시작…',
    openDesktop: productName => `${productName} 열기`,
    openTerminal: () => 'DSH 터미널 열기',
    profile: profileName => `Profile: ${profileName}`,
    quit: () => '종료',
    installStable: () => '안정판 설치…',
    unavailableForDesktop: profileName => `${profileName} (데스크톱과 호환되지 않음)`,
    updateAvailable: version => `AI Shell Desktop ${version} 사용 가능`,
  },
  es: {
    addProfile: () => 'Nuevo Profile…',
    checkForUpdates: () => 'Buscar actualizaciones…',
    checkingForUpdates: () => 'Buscando actualizaciones…',
    downloadingUpdate: version => `Descargando AI Shell Desktop ${version}…`,
    enterSafeMode: () => 'Entrar en modo seguro…',
    exportDiagnostics: () => 'Exportar diagnóstico…',
    exitSafeMode: () => 'Salir del modo seguro y reiniciar…',
    openDesktop: productName => `Abrir ${productName}`,
    openTerminal: () => 'Abrir la terminal de DSH',
    profile: profileName => `Profile: ${profileName}`,
    quit: () => 'Salir',
    installStable: () => 'Instalar edición estable…',
    unavailableForDesktop: profileName => `${profileName} (no compatible con la versión de escritorio)`,
    updateAvailable: version => `AI Shell Desktop ${version} disponible`,
  },
  fr: {
    addProfile: () => 'Nouveau Profile…',
    checkForUpdates: () => 'Rechercher des mises à jour…',
    checkingForUpdates: () => 'Recherche des mises à jour…',
    downloadingUpdate: version => `Téléchargement d’AI Shell Desktop ${version}…`,
    enterSafeMode: () => 'Passer en mode sans échec…',
    exportDiagnostics: () => 'Exporter les diagnostics…',
    exitSafeMode: () => 'Quitter le mode sans échec et redémarrer…',
    openDesktop: productName => `Ouvrir ${productName}`,
    openTerminal: () => 'Ouvrir le terminal DSH',
    profile: profileName => `Profile\u00A0: ${profileName}`,
    quit: () => 'Quitter',
    installStable: () => 'Installer l’édition stable…',
    unavailableForDesktop: profileName => `${profileName} (non compatible avec la version bureau)`,
    updateAvailable: version => `AI Shell Desktop ${version} disponible`,
  },
  de: {
    addProfile: () => 'Neues Profile…',
    checkForUpdates: () => 'Nach Updates suchen…',
    checkingForUpdates: () => 'Suche nach Updates…',
    downloadingUpdate: version => `AI Shell Desktop ${version} wird heruntergeladen…`,
    enterSafeMode: () => 'Abgesicherten Modus starten…',
    exportDiagnostics: () => 'Diagnose exportieren…',
    exitSafeMode: () => 'Abgesicherten Modus beenden und neu starten…',
    openDesktop: productName => `${productName} öffnen`,
    openTerminal: () => 'DSH-Terminal öffnen',
    profile: profileName => `Profile: ${profileName}`,
    quit: () => 'Beenden',
    installStable: () => 'Stabile Edition installieren…',
    unavailableForDesktop: profileName => `${profileName} (nicht mit Desktop kompatibel)`,
    updateAvailable: version => `AI Shell Desktop ${version} verfügbar`,
  },
}

export interface DesktopDiagnosticsPrivacyCopy {
  readonly title: string
  readonly message: string
  readonly detail: string
  readonly confirm: string
  readonly cancel: string
}

export interface DesktopRestartConfirmationCopy {
  readonly title: string
  readonly message: string
  readonly detail: string
  readonly confirm: string
  readonly cancel: string
}

export const rendererRecoveryCopy: Record<DesktopLocale, DesktopRestartConfirmationCopy> = {
  en: {
    title: 'Restore AI Shell Desktop',
    message: 'The interface could not recover automatically.',
    detail: 'Automatic recovery stopped after repeated failures to avoid a restart loop. You can try again without restarting the background service. Unsent input may be lost. Export diagnostics from the tray to investigate. Choose Open AI Shell Desktop from the tray to return to this prompt later.',
    confirm: 'Try recovery again',
    cancel: 'Not now',
  },
  zh: {
    title: '恢复 AI Shell Desktop',
    message: '界面未能自动恢复。',
    detail: '自动恢复连续失败，为避免重启循环已暂停。可以再次尝试恢复，无需重启后台服务。未发送的输入可能丢失。请从托盘导出诊断信息以继续调查。稍后可从托盘选择“打开 AI Shell Desktop”再次打开此提示。',
    confirm: '再次尝试恢复',
    cancel: '暂不处理',
  },
  'zh-Hant': {
    title: '復原 AI Shell Desktop',
    message: '介面未能自動復原。',
    detail: '自動復原連續失敗，為避免重新啟動迴圈已暫停。可以再次嘗試復原，無需重新啟動背景服務。未傳送的輸入可能遺失。請從托盤匯出診斷資訊以繼續調查。稍後可從托盤選擇「開啟 AI Shell Desktop」再次開啟此提示。',
    confirm: '重試復原',
    cancel: '暫不處理',
  },
  ja: {
    title: 'AI Shell Desktopを復元',
    message: 'インターフェースを自動的に復元できませんでした。',
    detail: '自動復元は失敗を繰り返したため、再起動ループを防ぐために停止しました。バックグラウンドサービスを再起動せずに、もう一度試すことができます。未送信の入力は失われる可能性があります。調査するには、トレイから診断情報をエクスポートしてください。後でこのプロンプトに戻るには、トレイから「AI Shell Desktopを開く」を選択してください。',
    confirm: '復元を再試行',
    cancel: '後で',
  },
  ko: {
    title: 'AI Shell Desktop 복원',
    message: '인터페이스를 자동으로 복구하지 못했어요.',
    detail: '자동 복구가 반복해서 실패해 다시 시작 루프를 막기 위해 중단했어요. 백그라운드 서비스를 다시 시작하지 않고 다시 시도할 수 있어요. 보내지 않은 입력은 손실될 수 있어요. 조사하려면 트레이에서 진단 정보를 내보내세요. 나중에 이 프롬프트로 돌아가려면 트레이에서 "AI Shell Desktop 열기"를 선택하세요.',
    confirm: '복구 다시 시도',
    cancel: '나중에',
  },
  es: {
    title: 'Restaurar AI Shell Desktop',
    message: 'La interfaz no pudo recuperarse automáticamente.',
    detail: 'La recuperación automática se detuvo tras varios fallos para evitar un bucle de reinicio. Se puede volver a intentar sin reiniciar el servicio en segundo plano. Es posible que se pierda la entrada no enviada. Para investigar, exportar el diagnóstico desde la bandeja. Para volver a este aviso más tarde, seleccionar Abrir AI Shell Desktop en la bandeja.',
    confirm: 'Reintentar la restauración',
    cancel: 'Ahora no',
  },
  fr: {
    title: 'Restaurer AI Shell Desktop',
    message: 'L’interface n’a pas pu être rétablie automatiquement.',
    detail: 'La restauration automatique s’est arrêtée après plusieurs échecs afin d’éviter une boucle de redémarrage. Vous pouvez réessayer sans redémarrer le service en arrière-plan. Les saisies non envoyées peuvent être perdues. Exportez les diagnostics depuis la zone de notification pour analyser le problème. Choisissez Ouvrir AI Shell Desktop dans la zone de notification pour revenir à cette invite plus tard.',
    confirm: 'Réessayer la restauration',
    cancel: 'Plus tard',
  },
  de: {
    title: 'AI Shell Desktop wiederherstellen',
    message: 'Die Oberfläche konnte nicht automatisch wiederhergestellt werden.',
    detail: 'Die automatische Wiederherstellung wurde nach wiederholten Fehlern beendet, um eine Neustartschleife zu vermeiden. Ein erneuter Versuch ist möglich, ohne den Hintergrunddienst neu zu starten. Nicht gesendete Eingaben können verloren gehen. Diagnose zur Untersuchung über das Tray exportieren. Um diesen Hinweis später erneut zu öffnen, im Tray „AI Shell Desktop öffnen“ wählen.',
    confirm: 'Erneut versuchen',
    cancel: 'Nicht jetzt',
  },
}

const restartConfirmationCopy: Record<DesktopLocale, Record<'normal' | 'recovery', DesktopRestartConfirmationCopy>> = {
  en: {
    normal: {
      title: 'Restart AI Shell Desktop',
      message: 'Restart AI Shell Desktop now?',
      detail: 'Running operations may be interrupted, and unsent content may be lost. Saved settings will be kept.',
      confirm: 'Restart',
      cancel: 'Cancel',
    },
    recovery: {
      title: 'Restart in Recovery Mode',
      message: 'Restart AI Shell Desktop in Recovery Mode?',
      detail: 'The app will open the recovery assistant before loading the current Profile and plugins. Running operations may be interrupted, and unsent content may be lost.',
      confirm: 'Restart in Recovery Mode',
      cancel: 'Cancel',
    },
  },
  zh: {
    normal: {
      title: '重启 AI Shell Desktop',
      message: '现在重启 AI Shell Desktop？',
      detail: '正在运行的操作可能中断，未发送的内容可能丢失。已保存的设置会保留。',
      confirm: '重启应用',
      cancel: '取消',
    },
    recovery: {
      title: '重启到恢复模式',
      message: '重启 AI Shell Desktop 并进入恢复模式？',
      detail: '应用将先打开恢复助手，暂不加载当前 Profile 和插件。正在运行的操作可能中断，未发送的内容可能丢失。',
      confirm: '重启到恢复模式',
      cancel: '取消',
    },
  },
  'zh-Hant': {
    normal: {
      title: '重新啟動 AI Shell Desktop',
      message: '現在重新啟動 AI Shell Desktop？',
      detail: '正在執行的操作可能中斷，未傳送的內容可能遺失。已儲存的設定會保留。',
      confirm: '重新啟動應用程式',
      cancel: '取消',
    },
    recovery: {
      title: '重新啟動至復原模式',
      message: '重新啟動 AI Shell Desktop 並進入復原模式？',
      detail: '應用程式會先開啟復原小幫手，暫不載入目前的 Profile 與外掛。正在執行的操作可能中斷，未傳送的內容可能遺失。',
      confirm: '重新啟動至復原模式',
      cancel: '取消',
    },
  },
  ja: {
    normal: {
      title: 'AI Shell Desktopを再起動',
      message: 'AI Shell Desktopを今すぐ再起動しますか？',
      detail: '実行中の操作が中断され、未送信の内容が失われる可能性があります。保存済みの設定は保持されます。',
      confirm: '再起動',
      cancel: 'キャンセル',
    },
    recovery: {
      title: 'リカバリーモードで再起動',
      message: 'AI Shell Desktopをリカバリーモードで再起動しますか？',
      detail: 'アプリは現在のProfileとプラグインを読み込む前に、リカバリーアシスタントを開きます。実行中の操作が中断され、未送信の内容が失われる可能性があります。',
      confirm: 'リカバリーモードで再起動',
      cancel: 'キャンセル',
    },
  },
  ko: {
    normal: {
      title: 'AI Shell Desktop 다시 시작',
      message: '지금 AI Shell Desktop을 다시 시작할까요?',
      detail: '실행 중인 작업이 중단되고 보내지 않은 내용이 손실될 수 있어요. 저장된 설정은 유지돼요.',
      confirm: '다시 시작',
      cancel: '취소',
    },
    recovery: {
      title: '복구 모드로 다시 시작',
      message: 'AI Shell Desktop을 복구 모드로 다시 시작할까요?',
      detail: '앱은 현재 Profile과 플러그인을 불러오기 전에 복구 도우미를 열어요. 실행 중인 작업이 중단되고 보내지 않은 내용이 손실될 수 있어요.',
      confirm: '복구 모드로 다시 시작',
      cancel: '취소',
    },
  },
  es: {
    normal: {
      title: 'Reiniciar AI Shell Desktop',
      message: '¿Reiniciar AI Shell Desktop ahora?',
      detail: 'Las operaciones en curso pueden interrumpirse y el contenido no enviado puede perderse. La configuración guardada se conservará.',
      confirm: 'Reiniciar',
      cancel: 'Cancelar',
    },
    recovery: {
      title: 'Reiniciar en modo de recuperación',
      message: '¿Reiniciar AI Shell Desktop en modo de recuperación?',
      detail: 'La aplicación abrirá el asistente de recuperación antes de cargar el Profile actual y los complementos. Las operaciones en curso pueden interrumpirse y el contenido no enviado puede perderse.',
      confirm: 'Reiniciar en modo de recuperación',
      cancel: 'Cancelar',
    },
  },
  fr: {
    normal: {
      title: 'Redémarrer AI Shell Desktop',
      message: 'Redémarrer AI Shell Desktop maintenant\u00A0?',
      detail: 'Les opérations en cours peuvent être interrompues et le contenu non envoyé peut être perdu. Les paramètres enregistrés seront conservés.',
      confirm: 'Redémarrer',
      cancel: 'Annuler',
    },
    recovery: {
      title: 'Redémarrer en mode récupération',
      message: 'Redémarrer AI Shell Desktop en mode récupération\u00A0?',
      detail: 'L’application ouvrira l’assistant de récupération avant de charger le Profile actuel et les extensions. Les opérations en cours peuvent être interrompues et le contenu non envoyé peut être perdu.',
      confirm: 'Redémarrer en mode récupération',
      cancel: 'Annuler',
    },
  },
  de: {
    normal: {
      title: 'AI Shell Desktop neu starten',
      message: 'AI Shell Desktop jetzt neu starten?',
      detail: 'Laufende Vorgänge können unterbrochen werden und nicht gesendete Inhalte können verloren gehen. Gespeicherte Einstellungen bleiben erhalten.',
      confirm: 'Neu starten',
      cancel: 'Abbrechen',
    },
    recovery: {
      title: 'Im Wiederherstellungsmodus neu starten',
      message: 'AI Shell Desktop im Wiederherstellungsmodus neu starten?',
      detail: 'Die App öffnet den Wiederherstellungsassistenten, bevor das aktuelle Profile und die Plugins geladen werden. Laufende Vorgänge können unterbrochen werden und nicht gesendete Inhalte können verloren gehen.',
      confirm: 'Im Wiederherstellungsmodus neu starten',
      cancel: 'Abbrechen',
    },
  },
}

const diagnosticsPrivacyCopy: Record<DesktopLocale, DesktopDiagnosticsPrivacyCopy> = {
  en: {
    title: 'Export Diagnostics',
    message: 'Review the diagnostic archive before sharing it.',
    detail: 'The archive contains recent application logs, local crash dumps, and system information. Logs may contain local paths, workspace IDs, and session IDs. Crash dumps may contain fragments of process memory. Authentication credentials are masked in logs when recognized, but you should still review the archive before uploading it publicly.',
    confirm: 'Export',
    cancel: 'Cancel',
  },
  zh: {
    title: '导出诊断信息',
    message: '分享诊断包前请先检查其中的内容。',
    detail: '诊断包包含最近的应用日志、本地崩溃转储和系统信息。日志可能包含本地路径、工作区 ID 和会话 ID，崩溃转储可能包含进程内存片段。系统会对日志中可识别的认证凭据进行脱敏，但公开上传前仍应检查诊断包。',
    confirm: '导出',
    cancel: '取消',
  },
  'zh-Hant': {
    title: '匯出診斷資訊',
    message: '分享診斷封存檔前請先檢查其中的內容。',
    detail: '診斷封存檔包含最近的應用程式日誌、本機當機傾印和系統資訊。日誌可能包含本機路徑、工作區 ID 和工作階段 ID，當機傾印可能包含處理程序記憶體片段。系統會遮罩日誌中可辨識的驗證憑證，但公開上傳前仍應檢查診斷封存檔。',
    confirm: '匯出',
    cancel: '取消',
  },
  ja: {
    title: '診断情報をエクスポート',
    message: '共有する前に診断アーカイブの内容を確認してください。',
    detail: 'アーカイブには、最近のアプリケーションログ、ローカルのクラッシュダンプ、システム情報が含まれます。ログにはローカルパス、ワークスペース ID、セッション ID が含まれる場合があります。クラッシュダンプにはプロセスメモリの断片が含まれる場合があります。認証情報はログ内で認識されるとマスクされますが、公開アップロードの前にアーカイブを確認することをおすすめします。',
    confirm: 'エクスポート',
    cancel: 'キャンセル',
  },
  ko: {
    title: '진단 정보 내보내기',
    message: '공유하기 전에 진단 아카이브의 내용을 검토하세요.',
    detail: '아카이브에는 최근 애플리케이션 로그, 로컬 충돌 덤프, 시스템 정보가 포함되어 있어요. 로그에는 로컬 경로, 작업 공간 ID, 세션 ID가 포함될 수 있어요. 충돌 덤프에는 프로세스 메모리 조각이 포함될 수 있어요. 인증 자격 증명은 인식된 경우 로그에서 마스킹되지만, 공개 업로드 전에 아카이브를 검토하는 것이 좋아요.',
    confirm: '내보내기',
    cancel: '취소',
  },
  es: {
    title: 'Exportar diagnóstico',
    message: 'Revisar el archivo de diagnóstico antes de compartirlo.',
    detail: 'El archivo contiene registros recientes de la aplicación, volcados de errores locales e información del sistema. Los registros pueden contener rutas locales, IDs de espacio de trabajo e IDs de sesión. Los volcados de errores pueden contener fragmentos de la memoria del proceso. Las credenciales de autenticación se enmascaran en los registros cuando se reconocen, pero conviene revisar el archivo antes de subirlo públicamente.',
    confirm: 'Exportar',
    cancel: 'Cancelar',
  },
  fr: {
    title: 'Exporter les diagnostics',
    message: 'Vérifiez l’archive de diagnostic avant de la partager.',
    detail: 'L’archive contient les journaux récents de l’application, les vidages de crash locaux et les informations système. Les journaux peuvent contenir des chemins locaux, des ID d’espace de travail et des ID de session. Les vidages de crash peuvent contenir des fragments de la mémoire du processus. Les identifiants d’authentification sont masqués dans les journaux lorsqu’ils sont reconnus, mais vous devez tout de même vérifier l’archive avant de la téléverser publiquement.',
    confirm: 'Exporter',
    cancel: 'Annuler',
  },
  de: {
    title: 'Diagnose exportieren',
    message: 'Vor dem Teilen den Inhalt des Diagnosearchivs prüfen.',
    detail: 'Das Archiv enthält aktuelle Anwendungsprotokolle, lokale Absturzabbilder und Systeminformationen. Protokolle können lokale Pfade, Arbeitsbereichs-IDs und Sitzungs-IDs enthalten. Absturzabbilder können Fragmente des Prozessspeichers enthalten. Anmeldeinformationen werden in Protokollen maskiert, sofern erkannt; das Archiv sollte vor dem öffentlichen Hochladen dennoch geprüft werden.',
    confirm: 'Exportieren',
    cancel: 'Abbrechen',
  },
}

/** Resolve one native tray label in the active desktop locale. */
export function desktopTrayLabel(
  locale: DesktopLocale,
  key: DesktopTrayLabelKey,
  value = '',
): string {
  return labels[locale][key](value)
}

/** Resolve the native privacy confirmation shown before diagnostics export. */
export function desktopDiagnosticsPrivacyCopy(locale: DesktopLocale): DesktopDiagnosticsPrivacyCopy {
  return diagnosticsPrivacyCopy[locale]
}

/** Resolve the native confirmation shown before every ordinary relaunch request. */
export function desktopRestartConfirmationCopy(
  locale: DesktopLocale,
  target: 'normal' | 'recovery' | 'safe-mode' = 'normal',
): DesktopRestartConfirmationCopy {
  if (target === 'safe-mode') {
    const copy = desktopRecoveryCopy(locale)
    return {
      title: copy.confirmSafeMode,
      message: copy.confirmSafeModeMessage,
      detail: copy.confirmSafeModeBody,
      confirm: copy.confirmSafeModeAction,
      cancel: copy.cancel,
    }
  }
  return restartConfirmationCopy[locale][target]
}
