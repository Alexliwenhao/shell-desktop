/** Localized copy for Desktop-owned native dialogs and notifications. */

import type { DesktopLocale } from './runtime.ts'

export interface DesktopNativeCopy {
  readonly ok: string
  readonly pluginRecoveryTitle: string
  readonly pluginRecoveryMessage: string
  readonly unknownPlugin: string
  readonly missingPluginError: string
  readonly failedPlugins: string
  readonly pluginRecoveryInstructions: string
  readonly openTerminal: string
  readonly restart: string
  readonly dismiss: string
  readonly updateAvailableTitle: string
  readonly updateAvailableMessage: (version: string) => string
  readonly downloadUpdate: string
  readonly installStableAlongsideBeta: string
  readonly download: string
  readonly later: string
  readonly updateCheckFailedTitle: string
  readonly updateCheckFailedMessage: string
  readonly tryAgainLater: string
  readonly upToDateTitle: string
  readonly upToDateMessage: string
  readonly installedVersion: (version: string) => string
  readonly installerUnavailable: string
  readonly updateDownloadedTitle: string
  readonly updateReady: (version: string) => string
  readonly macInstallInstructions: string
  readonly windowsInstallQuestion: string
  readonly restartAndInstall: string
  readonly saveInstallerTitle: string
  readonly saveAndDownload: string
  readonly diskImage: string
  readonly windowsInstaller: string
  readonly removeInstallerTitle: string
  readonly updateInstalled: (version: string) => string
  readonly removeInstallerQuestion: (path: string) => string
  readonly deleteInstaller: string
  readonly keepInstaller: string
  readonly terminalErrorTitle: string
  readonly terminalErrorMessage: string
  readonly diagnosticsErrorTitle: string
  readonly diagnosticsErrorMessage: string
  readonly skippedPluginTitle: string
  readonly skippedPluginBody: (name: string, additionalCount: number) => string
  readonly unsupportedStorageTitle: string
  readonly unsupportedStorageBody: (label: string) => string
  readonly profileCompatibilityTitle: string
  readonly profileCompatibilityMessage: (profileName: string, previousProductName?: string) => string
  readonly profileCompatibilityDetail: (
    previousDesktopVersion: string,
    previousDshVersion: string,
    currentProductName: string,
    currentDesktopVersion: string,
    currentDshVersion: string,
  ) => string
  readonly profileCompatibilityUnknownDetail: (
    currentProductName: string,
    currentDesktopVersion: string,
    currentDshVersion: string,
  ) => string
  readonly profileCompatibilityWarning: string
  readonly switchProfile: string
  readonly useProfileAnyway: string
  readonly quit: string
  readonly unknownVersion: string
}

const COPY: Record<DesktopLocale, DesktopNativeCopy> = {
  en: {
    ok: 'OK',
    pluginRecoveryTitle: 'Plugin Load Failed',
    pluginRecoveryMessage: 'Some plugins could not be loaded.',
    unknownPlugin: 'Unknown client plugin',
    missingPluginError: 'The plugin loader did not provide an error message.',
    failedPlugins: 'Plugins that failed to load:',
    pluginRecoveryInstructions: 'Update or uninstall the failed third-party plugins in DSH Terminal, then restart the app.',
    openTerminal: 'Open DSH Terminal',
    restart: 'Restart AI Shell Desktop',
    dismiss: 'Dismiss',
    updateAvailableTitle: 'AI Shell Desktop Update Available',
    updateAvailableMessage: version => `AI Shell Desktop ${version} is available.`,
    downloadUpdate: 'Download this update now?',
    installStableAlongsideBeta: 'Install the stable edition alongside AI Shell Desktop Beta? The Beta app will remain installed.',
    download: 'Download',
    later: 'Later',
    updateCheckFailedTitle: 'Unable to Check for Updates',
    updateCheckFailedMessage: 'Could not retrieve update information.',
    tryAgainLater: 'Please try again later.',
    upToDateTitle: 'AI Shell Desktop Is Up to Date',
    upToDateMessage: 'You are using the latest version.',
    installedVersion: version => `Installed version: ${version}`,
    installerUnavailable: 'This version cannot download installers from within the app.',
    updateDownloadedTitle: 'AI Shell Desktop Update Downloaded',
    updateReady: version => `AI Shell Desktop ${version} is ready to install.`,
    macInstallInstructions: 'The disk image has opened. Replace AI Shell Desktop in Applications, then reopen it.',
    windowsInstallQuestion: 'Restart AI Shell Desktop and run the installer now?',
    restartAndInstall: 'Restart and Install',
    saveInstallerTitle: 'Save Update Installer',
    saveAndDownload: 'Save and Download',
    diskImage: 'Disk Image',
    windowsInstaller: 'Windows Installer',
    removeInstallerTitle: 'Remove Update Installer',
    updateInstalled: version => `AI Shell Desktop ${version} has been installed.`,
    removeInstallerQuestion: path => `Delete the downloaded installer to free disk space?\n\n${path}`,
    deleteInstaller: 'Delete Installer',
    keepInstaller: 'Keep Installer',
    terminalErrorTitle: 'Unable to Open DSH Terminal',
    terminalErrorMessage: 'Could not start the terminal. Please try again.',
    diagnosticsErrorTitle: 'Unable to Export Diagnostics',
    diagnosticsErrorMessage: 'Could not create the diagnostic archive. Please try again.',
    skippedPluginTitle: 'UI Plugin Not Loaded',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} and ${additionalCount} other UI ${additionalCount === 1 ? 'plugin are' : 'plugins are'} not installed in this Profile.`
      : `${name} is not installed in this Profile.`,
    unsupportedStorageTitle: 'Storage May Be Unsupported',
    unsupportedStorageBody: label => `${label} is on a volume that may prevent sandboxed commands or plugin installation from working.`,
    profileCompatibilityTitle: 'Profile Compatibility Warning',
    profileCompatibilityMessage: profileName =>
      `The Desktop version last used by the current Profile “${profileName}” differs from the current version:`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Last Desktop/DSH version: ${previousDesktopVersion}/${previousDshVersion}\nCurrent Desktop/DSH version: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Last Desktop/DSH version: Unknown/Unknown\nCurrent Desktop/DSH version: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'DSH version differences may cause:\n1. Historical session information to fail to load;\n2. Some plugins in the current Profile to be incompatible and possibly cause errors or crashes.\nWe recommend switching to a compatible Profile or creating a new Profile.',
    switchProfile: 'Switch Profile',
    useProfileAnyway: 'Use Anyway',
    quit: 'Quit',
    unknownVersion: 'Unknown',
  },
  zh: {
    ok: '确定',
    pluginRecoveryTitle: '插件加载失败',
    pluginRecoveryMessage: '部分插件未能加载。',
    unknownPlugin: '未知客户端插件',
    missingPluginError: '插件加载器没有提供错误信息。',
    failedPlugins: '加载失败的插件：',
    pluginRecoveryInstructions: '请在 DSH 终端中更新或卸载加载失败的第三方插件，然后重启应用。',
    openTerminal: '打开 DSH 终端',
    restart: '重启 AI Shell Desktop',
    dismiss: '关闭',
    updateAvailableTitle: 'AI Shell Desktop 有可用更新',
    updateAvailableMessage: version => `AI Shell Desktop ${version} 已可用。`,
    downloadUpdate: '现在下载此更新？',
    installStableAlongsideBeta: '是否同时安装稳定版？AI Shell Desktop Beta 将继续保留。',
    download: '下载',
    later: '稍后',
    updateCheckFailedTitle: '无法检查更新',
    updateCheckFailedMessage: '未能获取更新信息。',
    tryAgainLater: '请稍后重试。',
    upToDateTitle: 'AI Shell Desktop 已是最新版本',
    upToDateMessage: '当前已是最新版本。',
    installedVersion: version => `当前版本：${version}`,
    installerUnavailable: '当前版本不支持在应用内下载安装包。',
    updateDownloadedTitle: 'AI Shell Desktop 更新已下载',
    updateReady: version => `AI Shell Desktop ${version} 已可安装。`,
    macInstallInstructions: '磁盘映像已打开。请替换“应用程序”中的 AI Shell Desktop，然后重新打开。',
    windowsInstallQuestion: '现在重启 AI Shell Desktop 并运行安装程序？',
    restartAndInstall: '重启并安装',
    saveInstallerTitle: '保存更新安装包',
    saveAndDownload: '保存并下载',
    diskImage: '磁盘映像',
    windowsInstaller: 'Windows 安装程序',
    removeInstallerTitle: '删除更新安装包',
    updateInstalled: version => `AI Shell Desktop ${version} 已安装。`,
    removeInstallerQuestion: path => `是否删除下载的安装包以释放磁盘空间？\n\n${path}`,
    deleteInstaller: '删除安装包',
    keepInstaller: '保留安装包',
    terminalErrorTitle: '无法打开 DSH 终端',
    terminalErrorMessage: '未能启动终端。请重试。',
    diagnosticsErrorTitle: '无法导出诊断信息',
    diagnosticsErrorMessage: '未能生成诊断包。请重试。',
    skippedPluginTitle: '界面插件未加载',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} 及另外 ${additionalCount} 个界面插件未安装在当前 Profile 中。`
      : `${name} 未安装在当前 Profile 中。`,
    unsupportedStorageTitle: '存储位置可能不受支持',
    unsupportedStorageBody: label => `${label} 所在的磁盘可能导致沙盒命令或插件安装无法正常工作。`,
    profileCompatibilityTitle: 'Profile 兼容性警告',
    profileCompatibilityMessage: profileName =>
      `当前 Profile“${profileName}”最后一次使用的桌面版本与当前版本不同：`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `最后一次的桌面版/DSH 版本：${previousDesktopVersion}/${previousDshVersion}\n当前的桌面版/DSH 版本：${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `最后一次的桌面版/DSH 版本：未知/未知\n当前的桌面版/DSH 版本：${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'DSH 版本差异可能会导致：\n1. 历史会话信息加载出错；\n2. 当前 Profile 下的部分插件不兼容，甚至引发报错或崩溃。\n建议您切换到兼容的 Profile，或创建新的 Profile。',
    switchProfile: '切换 Profile',
    useProfileAnyway: '仍然使用',
    quit: '退出',
    unknownVersion: '未知',
  },
  'zh-Hant': {
    ok: '確定',
    pluginRecoveryTitle: '外掛載入失敗',
    pluginRecoveryMessage: '部分外掛無法載入。',
    unknownPlugin: '未知用戶端外掛',
    missingPluginError: '外掛載入器未提供錯誤訊息。',
    failedPlugins: '載入失敗的外掛：',
    pluginRecoveryInstructions: '請在 DSH 終端機中更新或解除安裝載入失敗的第三方外掛，然後重新啟動應用程式。',
    openTerminal: '開啟 DSH 終端機',
    restart: '重新啟動 AI Shell Desktop',
    dismiss: '關閉',
    updateAvailableTitle: 'AI Shell Desktop 有可用更新',
    updateAvailableMessage: version => `AI Shell Desktop ${version} 已可用。`,
    downloadUpdate: '要立即下載此更新嗎？',
    installStableAlongsideBeta: '要同時安裝穩定版嗎？AI Shell Desktop Beta 將繼續保留。',
    download: '下載',
    later: '稍後',
    updateCheckFailedTitle: '無法檢查更新',
    updateCheckFailedMessage: '未能取得更新資訊。',
    tryAgainLater: '請稍後再試。',
    upToDateTitle: 'AI Shell Desktop 已是最新版本',
    upToDateMessage: '您目前使用的是最新版本。',
    installedVersion: version => `已安裝版本：${version}`,
    installerUnavailable: '此版本無法在應用程式內下載安裝程式。',
    updateDownloadedTitle: 'AI Shell Desktop 更新已下載',
    updateReady: version => `AI Shell Desktop ${version} 已可安裝。`,
    macInstallInstructions: '磁碟映像已開啟。請取代「應用程式」中的 AI Shell Desktop，然後重新開啟。',
    windowsInstallQuestion: '要重新啟動 AI Shell Desktop 並立即執行安裝程式嗎？',
    restartAndInstall: '重新啟動並安裝',
    saveInstallerTitle: '儲存更新安裝程式',
    saveAndDownload: '儲存並下載',
    diskImage: '磁碟映像',
    windowsInstaller: 'Windows 安裝程式',
    removeInstallerTitle: '移除更新安裝程式',
    updateInstalled: version => `AI Shell Desktop ${version} 已安裝。`,
    removeInstallerQuestion: path => `要刪除已下載的安裝程式以釋放磁碟空間嗎？\n\n${path}`,
    deleteInstaller: '刪除安裝程式',
    keepInstaller: '保留安裝程式',
    terminalErrorTitle: '無法開啟 DSH 終端機',
    terminalErrorMessage: '未能啟動終端機。請重試。',
    diagnosticsErrorTitle: '無法匯出診斷資訊',
    diagnosticsErrorMessage: '未能建立診斷封存檔。請重試。',
    skippedPluginTitle: '介面外掛未載入',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} 及另外 ${additionalCount} 個介面外掛未安裝在目前的 Profile 中。`
      : `${name} 未安裝在目前的 Profile 中。`,
    unsupportedStorageTitle: '儲存位置可能不受支援',
    unsupportedStorageBody: label => `${label} 所在的磁碟區可能導致沙盒指令或外掛安裝無法正常運作。`,
    profileCompatibilityTitle: 'Profile 相容性警告',
    profileCompatibilityMessage: profileName =>
      `目前的 Profile「${profileName}」上次使用的桌面版本與目前版本不同：`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `上次的桌面版/DSH 版本：${previousDesktopVersion}/${previousDshVersion}\n目前的桌面版/DSH 版本：${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `上次的桌面版/DSH 版本：未知/未知\n目前的桌面版/DSH 版本：${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'DSH 版本差異可能會導致：\n1. 歷史工作階段資訊載入失敗；\n2. 目前 Profile 中的部分外掛不相容，甚至引發錯誤或當機。\n建議切換至相容的 Profile，或建立新的 Profile。',
    switchProfile: '切換 Profile',
    useProfileAnyway: '仍要使用',
    quit: '結束',
    unknownVersion: '未知',
  },
  ja: {
    ok: 'OK',
    pluginRecoveryTitle: 'プラグインの読み込みに失敗しました',
    pluginRecoveryMessage: '一部のプラグインを読み込めませんでした。',
    unknownPlugin: '不明なクライアントプラグイン',
    missingPluginError: 'プラグインローダーからエラーメッセージが返されませんでした。',
    failedPlugins: '読み込みに失敗したプラグイン：',
    pluginRecoveryInstructions: 'DSH ターミナルで読み込みに失敗したサードパーティ製プラグインを更新またはアンインストールしてから、アプリを再起動してください。',
    openTerminal: 'DSH ターミナルを開く',
    restart: 'AI Shell Desktop を再起動',
    dismiss: '閉じる',
    updateAvailableTitle: 'AI Shell Desktop のアップデートが利用可能です',
    updateAvailableMessage: version => `AI Shell Desktop ${version} が利用可能です。`,
    downloadUpdate: 'このアップデートを今すぐダウンロードしますか？',
    installStableAlongsideBeta: '安定版を AI Shell Desktop Beta と一緒にインストールしますか？Beta アプリは引き続きインストールされたままになります。',
    download: 'ダウンロード',
    later: '後で',
    updateCheckFailedTitle: 'アップデートを確認できません',
    updateCheckFailedMessage: 'アップデート情報を取得できませんでした。',
    tryAgainLater: '後でもう一度お試しください。',
    upToDateTitle: 'AI Shell Desktop は最新です',
    upToDateMessage: '最新バージョンを使用しています。',
    installedVersion: version => `インストール済みバージョン：${version}`,
    installerUnavailable: 'このバージョンはアプリ内からインストーラーをダウンロードできません。',
    updateDownloadedTitle: 'AI Shell Desktop のアップデートをダウンロードしました',
    updateReady: version => `AI Shell Desktop ${version} をインストールする準備ができました。`,
    macInstallInstructions: 'ディスクイメージを開きました。アプリケーション内の AI Shell Desktop を置き換えてから、もう一度開いてください。',
    windowsInstallQuestion: 'AI Shell Desktop を再起動して、今すぐインストーラーを実行しますか？',
    restartAndInstall: '再起動してインストール',
    saveInstallerTitle: 'アップデートインストーラーを保存',
    saveAndDownload: '保存してダウンロード',
    diskImage: 'ディスクイメージ',
    windowsInstaller: 'Windows インストーラー',
    removeInstallerTitle: 'アップデートインストーラーを削除',
    updateInstalled: version => `AI Shell Desktop ${version} をインストールしました。`,
    removeInstallerQuestion: path => `ダウンロードしたインストーラーを削除してディスク容量を解放しますか？\n\n${path}`,
    deleteInstaller: 'インストーラーを削除',
    keepInstaller: 'インストーラーを保持',
    terminalErrorTitle: 'DSH ターミナルを開けません',
    terminalErrorMessage: 'ターミナルを起動できませんでした。もう一度お試しください。',
    diagnosticsErrorTitle: '診断情報をエクスポートできません',
    diagnosticsErrorMessage: '診断アーカイブを作成できませんでした。もう一度お試しください。',
    skippedPluginTitle: 'UI プラグインが読み込まれていません',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} および他 ${additionalCount} 個の UI プラグインは、現在の Profile にインストールされていません。`
      : `${name} は現在の Profile にインストールされていません。`,
    unsupportedStorageTitle: 'ストレージがサポートされていない可能性があります',
    unsupportedStorageBody: label => `${label} は、サンドボックス化されたコマンドやプラグインのインストールが正常に動作しない可能性があるボリューム上にあります。`,
    profileCompatibilityTitle: 'Profile の互換性に関する警告',
    profileCompatibilityMessage: profileName =>
      `現在の Profile「${profileName}」で最後に使用されたデスクトップ版のバージョンが、現在のバージョンと異なります：`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `前回のデスクトップ版/DSH バージョン：${previousDesktopVersion}/${previousDshVersion}\n現在のデスクトップ版/DSH バージョン：${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `前回のデスクトップ版/DSH バージョン：不明/不明\n現在のデスクトップ版/DSH バージョン：${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'DSH バージョンの違いにより、次の問題が発生する可能性があります：\n1. 過去のセッション情報が読み込めない場合があります。\n2. 現在の Profile 内の一部のプラグインが互換性を持たず、エラーやクラッシュを引き起こす可能性があります。\n互換性のある Profile に切り替えるか、新しい Profile の作成をおすすめします。',
    switchProfile: 'Profile を切り替え',
    useProfileAnyway: 'そのまま使用',
    quit: '終了',
    unknownVersion: '不明',
  },
  ko: {
    ok: '확인',
    pluginRecoveryTitle: '플러그인 로드 실패',
    pluginRecoveryMessage: '일부 플러그인을 로드하지 못했어요.',
    unknownPlugin: '알 수 없는 클라이언트 플러그인',
    missingPluginError: '플러그인 로더가 오류 메시지를 제공하지 않았어요.',
    failedPlugins: '로드에 실패한 플러그인:',
    pluginRecoveryInstructions: 'DSH 터미널에서 로드에 실패한 서드파티 플러그인을 업데이트하거나 제거한 후 앱을 다시 시작해 주세요.',
    openTerminal: 'DSH 터미널 열기',
    restart: 'AI Shell Desktop 다시 시작',
    dismiss: '닫기',
    updateAvailableTitle: 'AI Shell Desktop 업데이트 사용 가능',
    updateAvailableMessage: version => `AI Shell Desktop ${version} 버전을 사용할 수 있어요.`,
    downloadUpdate: '이 업데이트를 지금 다운로드할까요?',
    installStableAlongsideBeta: '안정 버전을 AI Shell Desktop Beta와 함께 설치할까요? Beta 앱은 계속 설치된 상태로 유지돼요.',
    download: '다운로드',
    later: '나중에',
    updateCheckFailedTitle: '업데이트를 확인할 수 없음',
    updateCheckFailedMessage: '업데이트 정보를 가져오지 못했어요.',
    tryAgainLater: '나중에 다시 시도해 주세요.',
    upToDateTitle: 'AI Shell Desktop 최신 버전 사용 중',
    upToDateMessage: '최신 버전을 사용하고 있어요.',
    installedVersion: version => `설치된 버전: ${version}`,
    installerUnavailable: '이 버전은 앱 내에서 설치 프로그램을 다운로드할 수 없어요.',
    updateDownloadedTitle: 'AI Shell Desktop 업데이트 다운로드 완료',
    updateReady: version => `AI Shell Desktop ${version} 버전을 설치할 준비가 되었어요.`,
    macInstallInstructions: '디스크 이미지가 열렸어요. 응용 프로그램 폴더에서 AI Shell Desktop을 교체한 후 다시 열어 주세요.',
    windowsInstallQuestion: 'AI Shell Desktop을 다시 시작하고 지금 설치 프로그램을 실행할까요?',
    restartAndInstall: '다시 시작하고 설치',
    saveInstallerTitle: '업데이트 설치 프로그램 저장',
    saveAndDownload: '저장 및 다운로드',
    diskImage: '디스크 이미지',
    windowsInstaller: 'Windows 설치 프로그램',
    removeInstallerTitle: '업데이트 설치 프로그램 제거',
    updateInstalled: version => `AI Shell Desktop ${version} 버전이 설치되었어요.`,
    removeInstallerQuestion: path => `다운로드한 설치 프로그램을 삭제하여 디스크 공간을 확보할까요?\n\n${path}`,
    deleteInstaller: '설치 프로그램 삭제',
    keepInstaller: '설치 프로그램 유지',
    terminalErrorTitle: 'DSH 터미널을 열 수 없음',
    terminalErrorMessage: '터미널을 시작하지 못했어요. 다시 시도해 주세요.',
    diagnosticsErrorTitle: '진단 정보를 내보낼 수 없음',
    diagnosticsErrorMessage: '진단 아카이브를 만들지 못했어요. 다시 시도해 주세요.',
    skippedPluginTitle: 'UI 플러그인이 로드되지 않음',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} 및 다른 UI 플러그인 ${additionalCount}개가 현재 Profile에 설치되어 있지 않아요.`
      : `${name}이(가) 현재 Profile에 설치되어 있지 않아요.`,
    unsupportedStorageTitle: '저장소가 지원되지 않을 수 있음',
    unsupportedStorageBody: label => `${label}이(가) 샌드박스 명령이나 플러그인 설치가 작동하지 않을 수 있는 볼륨에 있어요.`,
    profileCompatibilityTitle: 'Profile 호환성 경고',
    profileCompatibilityMessage: profileName =>
      `현재 Profile “${profileName}”에서 마지막으로 사용한 데스크톱 버전이 현재 버전과 달라요:`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `마지막 데스크톱/DSH 버전: ${previousDesktopVersion}/${previousDshVersion}\n현재 데스크톱/DSH 버전: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `마지막 데스크톱/DSH 버전: 알 수 없음/알 수 없음\n현재 데스크톱/DSH 버전: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'DSH 버전 차이로 인해 다음과 같은 문제가 발생할 수 있어요:\n1. 이전 세션 정보를 로드하지 못할 수 있어요.\n2. 현재 Profile의 일부 플러그인이 호환되지 않아 오류나 충돌이 발생할 수 있어요.\n호환되는 Profile로 전환하거나 새 Profile을 만드는 것이 좋아요.',
    switchProfile: 'Profile 전환',
    useProfileAnyway: '계속 사용',
    quit: '종료',
    unknownVersion: '알 수 없음',
  },
  es: {
    ok: 'Aceptar',
    pluginRecoveryTitle: 'Error al cargar complementos',
    pluginRecoveryMessage: 'No se pudieron cargar algunos complementos.',
    unknownPlugin: 'Complemento de cliente desconocido',
    missingPluginError: 'El cargador de complementos no proporcionó ningún mensaje de error.',
    failedPlugins: 'Complementos que no se pudieron cargar:',
    pluginRecoveryInstructions: 'Actualizar o desinstalar los complementos de terceros que no se pudieron cargar en el terminal DSH y, después, reiniciar la aplicación.',
    openTerminal: 'Abrir terminal DSH',
    restart: 'Reiniciar AI Shell Desktop',
    dismiss: 'Cerrar',
    updateAvailableTitle: 'Actualización de AI Shell Desktop disponible',
    updateAvailableMessage: version => `AI Shell Desktop ${version} está disponible.`,
    downloadUpdate: '¿Descargar esta actualización ahora?',
    installStableAlongsideBeta: '¿Instalar la edición estable junto con AI Shell Desktop Beta? La aplicación Beta permanecerá instalada.',
    download: 'Descargar',
    later: 'Más tarde',
    updateCheckFailedTitle: 'No se pueden buscar actualizaciones',
    updateCheckFailedMessage: 'No se pudo obtener la información de actualización.',
    tryAgainLater: 'Volver a intentarlo más tarde.',
    upToDateTitle: 'AI Shell Desktop está actualizado',
    upToDateMessage: 'Se está usando la versión más reciente.',
    installedVersion: version => `Versión instalada: ${version}`,
    installerUnavailable: 'Esta versión no puede descargar instaladores desde la aplicación.',
    updateDownloadedTitle: 'Actualización de AI Shell Desktop descargada',
    updateReady: version => `AI Shell Desktop ${version} está listo para instalarse.`,
    macInstallInstructions: 'Se abrió la imagen de disco. Reemplazar AI Shell Desktop en Aplicaciones y volver a abrirlo.',
    windowsInstallQuestion: '¿Reiniciar AI Shell Desktop y ejecutar el instalador ahora?',
    restartAndInstall: 'Reiniciar e instalar',
    saveInstallerTitle: 'Guardar el instalador de la actualización',
    saveAndDownload: 'Guardar y descargar',
    diskImage: 'Imagen de disco',
    windowsInstaller: 'Instalador de Windows',
    removeInstallerTitle: 'Eliminar el instalador de la actualización',
    updateInstalled: version => `AI Shell Desktop ${version} se ha instalado.`,
    removeInstallerQuestion: path => `¿Eliminar el instalador descargado para liberar espacio en disco?\n\n${path}`,
    deleteInstaller: 'Eliminar instalador',
    keepInstaller: 'Conservar instalador',
    terminalErrorTitle: 'No se puede abrir el terminal DSH',
    terminalErrorMessage: 'No se pudo iniciar el terminal. Volver a intentarlo.',
    diagnosticsErrorTitle: 'No se pueden exportar los diagnósticos',
    diagnosticsErrorMessage: 'No se pudo crear el archivo de diagnóstico. Volver a intentarlo.',
    skippedPluginTitle: 'Complemento de interfaz no cargado',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} y ${additionalCount} ${additionalCount === 1 ? 'complemento de interfaz más' : 'complementos de interfaz más'} no están instalados en este Profile.`
      : `${name} no está instalado en este Profile.`,
    unsupportedStorageTitle: 'Es posible que el almacenamiento no sea compatible',
    unsupportedStorageBody: label => `${label} está en un volumen que puede impedir que los comandos en sandbox o la instalación de complementos funcionen.`,
    profileCompatibilityTitle: 'Advertencia de compatibilidad del Profile',
    profileCompatibilityMessage: profileName =>
      `La versión de escritorio utilizada por última vez por el Profile actual “${profileName}” difiere de la versión actual:`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Última versión de escritorio/DSH: ${previousDesktopVersion}/${previousDshVersion}\nVersión actual de escritorio/DSH: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Última versión de escritorio/DSH: Desconocida/Desconocida\nVersión actual de escritorio/DSH: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'Las diferencias de versión de DSH pueden provocar lo siguiente:\n1. Que la información de las sesiones anteriores no se cargue;\n2. Que algunos complementos del Profile actual sean incompatibles y puedan causar errores o fallos.\nSe recomienda cambiar a un Profile compatible o crear un Profile nuevo.',
    switchProfile: 'Cambiar de Profile',
    useProfileAnyway: 'Usar de todos modos',
    quit: 'Salir',
    unknownVersion: 'Desconocida',
  },
  fr: {
    ok: 'OK',
    pluginRecoveryTitle: 'Échec du chargement des extensions',
    pluginRecoveryMessage: 'Certaines extensions n’ont pas pu être chargées.',
    unknownPlugin: 'Extension client inconnue',
    missingPluginError: 'Le chargeur d’extensions n’a fourni aucun message d’erreur.',
    failedPlugins: 'Extensions dont le chargement a échoué :',
    pluginRecoveryInstructions: 'Mettez à jour ou désinstallez les extensions tierces dont le chargement a échoué dans le terminal DSH, puis redémarrez l’application.',
    openTerminal: 'Ouvrir le terminal DSH',
    restart: 'Redémarrer AI Shell Desktop',
    dismiss: 'Fermer',
    updateAvailableTitle: 'Mise à jour d’AI Shell Desktop disponible',
    updateAvailableMessage: version => `AI Shell Desktop ${version} est disponible.`,
    downloadUpdate: 'Télécharger cette mise à jour maintenant ?',
    installStableAlongsideBeta: 'Installer l’édition stable aux côtés d’AI Shell Desktop Beta ? L’application Beta restera installée.',
    download: 'Télécharger',
    later: 'Plus tard',
    updateCheckFailedTitle: 'Impossible de vérifier les mises à jour',
    updateCheckFailedMessage: 'Impossible de récupérer les informations de mise à jour.',
    tryAgainLater: 'Veuillez réessayer plus tard.',
    upToDateTitle: 'AI Shell Desktop est à jour',
    upToDateMessage: 'Vous utilisez la version la plus récente.',
    installedVersion: version => `Version installée : ${version}`,
    installerUnavailable: 'Cette version ne peut pas télécharger de programmes d’installation depuis l’application.',
    updateDownloadedTitle: 'Mise à jour d’AI Shell Desktop téléchargée',
    updateReady: version => `AI Shell Desktop ${version} est prêt à être installé.`,
    macInstallInstructions: 'L’image disque est ouverte. Remplacez AI Shell Desktop dans Applications, puis rouvrez-le.',
    windowsInstallQuestion: 'Redémarrer AI Shell Desktop et exécuter le programme d’installation maintenant ?',
    restartAndInstall: 'Redémarrer et installer',
    saveInstallerTitle: 'Enregistrer le programme d’installation de la mise à jour',
    saveAndDownload: 'Enregistrer et télécharger',
    diskImage: 'Image disque',
    windowsInstaller: 'Programme d’installation Windows',
    removeInstallerTitle: 'Supprimer le programme d’installation de la mise à jour',
    updateInstalled: version => `AI Shell Desktop ${version} a été installé.`,
    removeInstallerQuestion: path => `Supprimer le programme d’installation téléchargé pour libérer de l’espace disque ?\n\n${path}`,
    deleteInstaller: 'Supprimer le programme d’installation',
    keepInstaller: 'Conserver le programme d’installation',
    terminalErrorTitle: 'Impossible d’ouvrir le terminal DSH',
    terminalErrorMessage: 'Impossible de démarrer le terminal. Veuillez réessayer.',
    diagnosticsErrorTitle: 'Impossible d’exporter les diagnostics',
    diagnosticsErrorMessage: 'Impossible de créer l’archive de diagnostic. Veuillez réessayer.',
    skippedPluginTitle: 'Extension d’interface non chargée',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} et ${additionalCount} ${additionalCount === 1 ? 'autre extension d’interface' : 'autres extensions d’interface'} ne sont pas installées dans ce Profile.`
      : `${name} n’est pas installée dans ce Profile.`,
    unsupportedStorageTitle: 'Stockage potentiellement non pris en charge',
    unsupportedStorageBody: label => `${label} se trouve sur un volume qui peut empêcher les commandes en bac à sable ou l’installation d’extensions de fonctionner.`,
    profileCompatibilityTitle: 'Avertissement de compatibilité du Profile',
    profileCompatibilityMessage: profileName =>
      `La version Desktop utilisée pour la dernière fois par le Profile actuel « ${profileName} » diffère de la version actuelle :`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Dernière version Desktop/DSH : ${previousDesktopVersion}/${previousDshVersion}\nVersion actuelle Desktop/DSH : ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Dernière version Desktop/DSH : Inconnue/Inconnue\nVersion actuelle Desktop/DSH : ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'Les différences de version de DSH peuvent entraîner les problèmes suivants :\n1. Le chargement des informations des sessions passées peut échouer ;\n2. Certaines extensions du Profile actuel peuvent être incompatibles et provoquer des erreurs ou des plantages.\nIl est recommandé de passer à un Profile compatible ou de créer un nouveau Profile.',
    switchProfile: 'Changer de Profile',
    useProfileAnyway: 'Utiliser quand même',
    quit: 'Quitter',
    unknownVersion: 'Inconnue',
  },
  de: {
    ok: 'OK',
    pluginRecoveryTitle: 'Laden der Plugins fehlgeschlagen',
    pluginRecoveryMessage: 'Einige Plugins konnten nicht geladen werden.',
    unknownPlugin: 'Unbekanntes Client-Plugin',
    missingPluginError: 'Der Plugin-Loader hat keine Fehlermeldung bereitgestellt.',
    failedPlugins: 'Plugins, die nicht geladen werden konnten:',
    pluginRecoveryInstructions: 'Fehlgeschlagene Drittanbieter-Plugins im DSH-Terminal aktualisieren oder deinstallieren und die App anschließend neu starten.',
    openTerminal: 'DSH-Terminal öffnen',
    restart: 'AI Shell Desktop neu starten',
    dismiss: 'Schließen',
    updateAvailableTitle: 'AI Shell Desktop-Update verfügbar',
    updateAvailableMessage: version => `AI Shell Desktop ${version} ist verfügbar.`,
    downloadUpdate: 'Dieses Update jetzt herunterladen?',
    installStableAlongsideBeta: 'Stabile Edition neben AI Shell Desktop Beta installieren? Die Beta-App bleibt installiert.',
    download: 'Herunterladen',
    later: 'Später',
    updateCheckFailedTitle: 'Updateprüfung nicht möglich',
    updateCheckFailedMessage: 'Die Update-Informationen konnten nicht abgerufen werden.',
    tryAgainLater: 'Bitte später erneut versuchen.',
    upToDateTitle: 'AI Shell Desktop ist auf dem neuesten Stand',
    upToDateMessage: 'Die neueste Version wird bereits verwendet.',
    installedVersion: version => `Installierte Version: ${version}`,
    installerUnavailable: 'Diese Version kann keine Installationsprogramme aus der App heraus herunterladen.',
    updateDownloadedTitle: 'AI Shell Desktop-Update heruntergeladen',
    updateReady: version => `AI Shell Desktop ${version} kann jetzt installiert werden.`,
    macInstallInstructions: 'Das Disk-Image wurde geöffnet. AI Shell Desktop in „Programme“ ersetzen und anschließend erneut öffnen.',
    windowsInstallQuestion: 'AI Shell Desktop neu starten und das Installationsprogramm jetzt ausführen?',
    restartAndInstall: 'Neu starten und installieren',
    saveInstallerTitle: 'Update-Installationsprogramm speichern',
    saveAndDownload: 'Speichern und herunterladen',
    diskImage: 'Disk-Image',
    windowsInstaller: 'Windows-Installationsprogramm',
    removeInstallerTitle: 'Update-Installationsprogramm entfernen',
    updateInstalled: version => `AI Shell Desktop ${version} wurde installiert.`,
    removeInstallerQuestion: path => `Heruntergeladenes Installationsprogramm löschen, um Speicherplatz freizugeben?\n\n${path}`,
    deleteInstaller: 'Installationsprogramm löschen',
    keepInstaller: 'Installationsprogramm behalten',
    terminalErrorTitle: 'DSH-Terminal kann nicht geöffnet werden',
    terminalErrorMessage: 'Das Terminal konnte nicht gestartet werden. Bitte erneut versuchen.',
    diagnosticsErrorTitle: 'Diagnoseinformationen können nicht exportiert werden',
    diagnosticsErrorMessage: 'Das Diagnosearchiv konnte nicht erstellt werden. Bitte erneut versuchen.',
    skippedPluginTitle: 'UI-Plugin nicht geladen',
    skippedPluginBody: (name, additionalCount) => additionalCount > 0
      ? `${name} und ${additionalCount} ${additionalCount === 1 ? 'weiteres UI-Plugin' : 'weitere UI-Plugins'} sind nicht in diesem Profile installiert.`
      : `${name} ist nicht in diesem Profile installiert.`,
    unsupportedStorageTitle: 'Speicher wird möglicherweise nicht unterstützt',
    unsupportedStorageBody: label => `${label} befindet sich auf einem Volume, das die Ausführung von Sandbox-Befehlen oder die Plugin-Installation verhindern kann.`,
    profileCompatibilityTitle: 'Warnung zur Profile-Kompatibilität',
    profileCompatibilityMessage: profileName =>
      `Die zuletzt vom aktuellen Profile „${profileName}“ verwendete Desktop-Version unterscheidet sich von der aktuellen Version:`,
    profileCompatibilityDetail: (previousDesktopVersion, previousDshVersion, _currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Letzte Desktop-/DSH-Version: ${previousDesktopVersion}/${previousDshVersion}\nAktuelle Desktop-/DSH-Version: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityUnknownDetail: (_currentProductName, currentDesktopVersion, currentDshVersion) =>
      `Letzte Desktop-/DSH-Version: Unbekannt/Unbekannt\nAktuelle Desktop-/DSH-Version: ${currentDesktopVersion}/${currentDshVersion}`,
    profileCompatibilityWarning: 'DSH-Versionsunterschiede können Folgendes verursachen:\n1. Informationen aus früheren Sitzungen können nicht geladen werden;\n2. Einige Plugins im aktuellen Profile sind möglicherweise inkompatibel und können Fehler oder Abstürze verursachen.\nEs wird empfohlen, zu einem kompatiblen Profile zu wechseln oder ein neues Profile zu erstellen.',
    switchProfile: 'Profile wechseln',
    useProfileAnyway: 'Trotzdem verwenden',
    quit: 'Beenden',
    unknownVersion: 'Unbekannt',
  },
}

export function desktopNativeCopy(locale: DesktopLocale): DesktopNativeCopy {
  return COPY[locale]
}

/** Path labels for the Windows volume warning, keyed by the diagnostic's stable label. */
const VOLUME_CONCERN_LABELS: Readonly<Record<DesktopLocale, (label: string | undefined) => string>> = {
  en: label => label ?? 'A configured path',
  zh: label => label === 'application install' ? '应用安装目录'
    : label === 'desktop user data' ? '桌面用户数据'
      : label === 'DSH home' ? 'DSH 主目录'
        : '某个配置路径',
  'zh-Hant': label => label === 'application install' ? '應用程式安裝目錄'
    : label === 'desktop user data' ? '桌面使用者資料'
      : label === 'DSH home' ? 'DSH 主目錄'
        : '某個設定路徑',
  ja: label => label === 'application install' ? 'アプリのインストール先'
    : label === 'desktop user data' ? 'デスクトップのユーザーデータ'
      : label === 'DSH home' ? 'DSH ホーム'
        : '設定されたパス',
  ko: label => label === 'application install' ? '앱 설치 위치'
    : label === 'desktop user data' ? '데스크톱 사용자 데이터'
      : label === 'DSH home' ? 'DSH 홈'
        : '설정된 경로',
  es: label => label === 'application install' ? 'la instalación de la aplicación'
    : label === 'desktop user data' ? 'los datos de usuario del escritorio'
      : label === 'DSH home' ? 'el directorio principal de DSH'
        : 'una ruta configurada',
  fr: label => label === 'application install' ? 'l’installation de l’application'
    : label === 'desktop user data' ? 'les données utilisateur du bureau'
      : label === 'DSH home' ? 'le répertoire personnel DSH'
        : 'un chemin configuré',
  de: label => label === 'application install' ? 'die Anwendungsinstallation'
    : label === 'desktop user data' ? 'die Desktop-Benutzerdaten'
      : label === 'DSH home' ? 'das DSH-Home'
        : 'ein konfigurierter Pfad',
}

/**
 * Resolve the user-facing path label for a Windows volume warning.
 * @param locale - active desktop locale.
 * @param label - stable diagnostic label from the volume inspection.
 * @returns the localized path description.
 */
export function desktopVolumeConcernLabel(locale: DesktopLocale, label: string | undefined): string {
  return VOLUME_CONCERN_LABELS[locale](label)
}
