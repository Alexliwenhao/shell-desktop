import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  MessageBoxOptions,
  MessageBoxReturnValue,
} from 'electron'
import type { DesktopLocale, DesktopPlatform } from './runtime.ts'
import {
  evaluateWindowsWorkspaceVolume,
  formatWindowsVolumeConcern,
  type WindowsVolumeQuery,
} from './windows-volume-diagnostics.ts'

export interface ElectronWorkspaceAdmissionOptions {
  readonly platform: DesktopPlatform
  readonly canPickDirectory: boolean
  readonly locale: () => DesktopLocale
  readonly showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>
  readonly showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxReturnValue>
  readonly logError: (message: string) => void
  readonly volumeQuery?: WindowsVolumeQuery
}

interface WorkspaceVolumeCopy {
  readonly pickDirectoryTitle: string
  readonly removableTitle: string
  readonly removableMessage: string
  readonly removableDetail: (path: string) => string
  readonly removableConfirmButton: string
  readonly removableCancelButton: string
  readonly unsupportedTitle: string
  readonly unsupportedMessage: (fileSystem: string | undefined) => string
  readonly unsupportedDetail: (path: string) => string
  readonly unsupportedButton: string
}

const COPY: Record<DesktopLocale, WorkspaceVolumeCopy> = {
  en: {
    pickDirectoryTitle: 'Select Workspace Directory',
    removableTitle: 'Removable Workspace',
    removableMessage: 'This workspace is on a removable NTFS/ReFS drive.',
    removableDetail: path => `Disconnecting the drive while AI Shell Desktop is running can break commands or plugin operations. Keep it connected.\n\n${path}`,
    removableConfirmButton: 'Use This Folder',
    removableCancelButton: 'Choose Another Folder',
    unsupportedTitle: 'Unsupported Workspace Storage',
    unsupportedMessage: fileSystem => `${fileSystem ?? 'This filesystem'} cannot safely host a AI Shell Desktop workspace.`,
    unsupportedDetail: path => `Choose a folder on a local NTFS or ReFS volume. exFAT, FAT32, network drives, and uninspectable volumes are not persisted as workspaces.\n\n${path}`,
    unsupportedButton: 'Choose Another Folder',
  },
  zh: {
    pickDirectoryTitle: '选择工作区目录',
    removableTitle: '外接工作区',
    removableMessage: '这个工作区位于可移除的 NTFS/ReFS 磁盘上。',
    removableDetail: path => `使用过程中拔出磁盘会导致命令或插件操作失败。请保持磁盘连接。\n\n${path}`,
    removableConfirmButton: '使用此文件夹',
    removableCancelButton: '选择其他文件夹',
    unsupportedTitle: '不支持的工作区存储',
    unsupportedMessage: fileSystem => `${fileSystem ?? '当前文件系统'} 不能安全用作 AI Shell Desktop 工作区。`,
    unsupportedDetail: path => `请选择本地 NTFS 或 ReFS 磁盘上的文件夹。exFAT、FAT32、网络盘和无法检测的磁盘不会被保存为工作区。\n\n${path}`,
    unsupportedButton: '选择其他文件夹',
  },
  'zh-Hant': {
    pickDirectoryTitle: '選擇工作區目錄',
    removableTitle: '外接工作區',
    removableMessage: '這個工作區位於卸除式 NTFS/ReFS 磁碟上。',
    removableDetail: path => `使用期間拔出磁碟會導致指令或外掛操作失敗。請保持磁碟連接。\n\n${path}`,
    removableConfirmButton: '使用此資料夾',
    removableCancelButton: '選擇其他資料夾',
    unsupportedTitle: '不支援的工作區儲存體',
    unsupportedMessage: fileSystem => `${fileSystem ?? '目前的檔案系統'} 無法安全用作 AI Shell Desktop 工作區。`,
    unsupportedDetail: path => `請選擇本機 NTFS 或 ReFS 磁碟上的資料夾。exFAT、FAT32、網路磁碟和無法偵測的磁碟不會儲存為工作區。\n\n${path}`,
    unsupportedButton: '選擇其他資料夾',
  },
  ja: {
    pickDirectoryTitle: 'ワークスペースディレクトリを選択',
    removableTitle: 'リムーバブルワークスペース',
    removableMessage: 'このワークスペースはリムーバブルドライブ（NTFS/ReFS）上にあります。',
    removableDetail: path => `AI Shell Desktopの実行中にドライブを取り外すと、コマンドやプラグインの操作が失敗する可能性があります。接続したままにしてください。\n\n${path}`,
    removableConfirmButton: 'このフォルダーを使用',
    removableCancelButton: '別のフォルダーを選択',
    unsupportedTitle: 'サポートされていないワークスペースストレージ',
    unsupportedMessage: fileSystem => `${fileSystem ?? 'このファイルシステム'}はAI Shell Desktopのワークスペースとして安全に使用できません。`,
    unsupportedDetail: path => `ローカルのNTFSまたはReFSボリューム上のフォルダーを選択してください。exFAT、FAT32、ネットワークドライブ、検出できないボリュームはワークスペースとして保存されません。\n\n${path}`,
    unsupportedButton: '別のフォルダーを選択',
  },
  ko: {
    pickDirectoryTitle: '작업 공간 디렉터리 선택',
    removableTitle: '이동식 작업 공간',
    removableMessage: '이 작업 공간은 이동식 NTFS/ReFS 드라이브에 있어요.',
    removableDetail: path => `AI Shell Desktop 실행 중에 드라이브를 분리하면 명령이나 플러그인 작업이 실패할 수 있어요. 드라이브를 연결한 상태로 유지하세요.\n\n${path}`,
    removableConfirmButton: '이 폴더 사용',
    removableCancelButton: '다른 폴더 선택',
    unsupportedTitle: '지원되지 않는 작업 공간 저장소',
    unsupportedMessage: fileSystem => `${fileSystem ?? '이 파일 시스템'}은(는) AI Shell Desktop 작업 공간으로 안전하게 사용할 수 없어요.`,
    unsupportedDetail: path => `로컬 NTFS 또는 ReFS 볼륨의 폴더를 선택하세요. exFAT, FAT32, 네트워크 드라이브, 검사할 수 없는 볼륨은 작업 공간으로 저장되지 않아요.\n\n${path}`,
    unsupportedButton: '다른 폴더 선택',
  },
  es: {
    pickDirectoryTitle: 'Seleccionar el directorio del espacio de trabajo',
    removableTitle: 'Espacio de trabajo extraíble',
    removableMessage: 'Este espacio de trabajo está en una unidad NTFS/ReFS extraíble.',
    removableDetail: path => `Desconectar la unidad mientras AI Shell Desktop está en ejecución puede hacer que fallen comandos u operaciones de complementos. Mantener la unidad conectada.\n\n${path}`,
    removableConfirmButton: 'Usar esta carpeta',
    removableCancelButton: 'Elegir otra carpeta',
    unsupportedTitle: 'Almacenamiento del espacio de trabajo no compatible',
    unsupportedMessage: fileSystem => `${fileSystem ?? 'Este sistema de archivos'} no puede alojar de forma segura un espacio de trabajo de AI Shell Desktop.`,
    unsupportedDetail: path => `Elegir una carpeta en un volumen NTFS o ReFS local. Las unidades exFAT, FAT32, de red y los volúmenes que no se pueden inspeccionar no se guardan como espacios de trabajo.\n\n${path}`,
    unsupportedButton: 'Elegir otra carpeta',
  },
  fr: {
    pickDirectoryTitle: 'Sélectionner le dossier de l’espace de travail',
    removableTitle: 'Espace de travail amovible',
    removableMessage: 'Cet espace de travail se trouve sur un disque NTFS/ReFS amovible.',
    removableDetail: path => `Déconnecter le disque pendant l’exécution d’AI Shell Desktop peut faire échouer des commandes ou des opérations d’extensions. Laissez-le connecté.\n\n${path}`,
    removableConfirmButton: 'Utiliser ce dossier',
    removableCancelButton: 'Choisir un autre dossier',
    unsupportedTitle: 'Stockage d’espace de travail non pris en charge',
    unsupportedMessage: fileSystem => `${fileSystem ?? 'Ce système de fichiers'} ne peut pas héberger en toute sécurité un espace de travail AI Shell Desktop.`,
    unsupportedDetail: path => `Choisissez un dossier sur un volume NTFS ou ReFS local. Les disques exFAT, FAT32, réseau et les volumes non inspectables ne sont pas enregistrés comme espaces de travail.\n\n${path}`,
    unsupportedButton: 'Choisir un autre dossier',
  },
  de: {
    pickDirectoryTitle: 'Arbeitsbereichsordner auswählen',
    removableTitle: 'Wechselbarer Arbeitsbereich',
    removableMessage: 'Dieser Arbeitsbereich befindet sich auf einem wechselbaren NTFS/ReFS-Datenträger.',
    removableDetail: path => `Wird der Datenträger während der Ausführung von AI Shell Desktop entfernt, können Befehle oder Plugin-Vorgänge fehlschlagen. Angeschlossen lassen.\n\n${path}`,
    removableConfirmButton: 'Diesen Ordner verwenden',
    removableCancelButton: 'Anderen Ordner auswählen',
    unsupportedTitle: 'Nicht unterstützter Arbeitsbereichsspeicher',
    unsupportedMessage: fileSystem => `${fileSystem ?? 'Dieses Dateisystem'} kann nicht sicher als AI Shell Desktop-Arbeitsbereich dienen.`,
    unsupportedDetail: path => `Einen Ordner auf einem lokalen NTFS- oder ReFS-Datenträger auswählen. exFAT, FAT32, Netzlaufwerke und nicht überprüfbare Datenträger werden nicht als Arbeitsbereiche gespeichert.\n\n${path}`,
    unsupportedButton: 'Anderen Ordner auswählen',
  },
}

/** Own native workspace selection and every Desktop policy decision before persistence. */
export class ElectronWorkspaceAdmission {
  private pickTask: Promise<string | null> | undefined

  constructor(private readonly options: ElectronWorkspaceAdmissionOptions) {}

  /** Select one directory through the native platform adapter, coalescing concurrent requests. */
  async pickDirectory(): Promise<string | null> {
    if (!this.options.canPickDirectory) {
      throw new Error(`shell-desktop: native workspace picker is unavailable on ${this.options.platform}`)
    }
    if (this.pickTask !== undefined) return await this.pickTask
    const task = this.showDirectoryPicker()
    this.pickTask = task
    try {
      return await task
    } finally {
      if (this.pickTask === task) this.pickTask = undefined
    }
  }

  /** Apply Desktop-owned storage policy before a selected workspace is persisted. */
  async validateDirectory(path: string): Promise<boolean> {
    const decision = evaluateWindowsWorkspaceVolume(this.options.platform, path, this.options.volumeQuery)
    if (decision.action === 'allow') return true

    this.options.logError(`shell-desktop: unsafe workspace volume: ${formatWindowsVolumeConcern(decision.concern)}`)
    const copy = COPY[this.options.locale()]
    if (decision.action === 'confirm') {
      const result = await this.options.showMessageBox({
        type: 'warning',
        title: copy.removableTitle,
        message: copy.removableMessage,
        detail: copy.removableDetail(path),
        buttons: [copy.removableConfirmButton, copy.removableCancelButton],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
      })
      const accepted = result.response === 0
      this.options.logError(`shell-desktop: workspace volume decision=${accepted ? 'confirmed' : 'cancelled'} path=${path}`)
      return accepted
    }

    await this.options.showMessageBox({
      type: 'error',
      title: copy.unsupportedTitle,
      message: copy.unsupportedMessage(decision.concern.fileSystem),
      detail: copy.unsupportedDetail(path),
      buttons: [copy.unsupportedButton],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    })
    this.options.logError(`shell-desktop: workspace volume decision=blocked path=${path}`)
    return false
  }

  private async showDirectoryPicker(): Promise<string | null> {
    const result = await this.options.showOpenDialog({
      title: COPY[this.options.locale()].pickDirectoryTitle,
      properties: ['openDirectory', 'dontAddToRecent'],
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  }
}
