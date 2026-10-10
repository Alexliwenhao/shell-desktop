/** Native-owned remote-control discovery state and confirmation flow. */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { DesktopLocale } from './runtime.ts'

export const remoteControlOfferCopy = {
  zh: {
    label: '远程控制', title: '启用远程控制？',
    message: '从其他设备使用这台电脑上的 DeepSeek Harness。',
    detail: '启用并重启后，请从“手机连接”完成连接配置。配置完成后，你可以通过其他联网设备远程使用这台电脑上的 DeepSeek Harness。远程使用时，这台电脑需要保持开机并联网。',
    confirm: '启用并重启', cancel: '暂不开启',
    failed: '未能启用远程控制', retry: '请稍后重试，或前往“桌面设置”开启手机连接。',
  },
  en: {
    label: 'Remote control', title: 'Enable remote control?',
    message: 'Use DeepSeek Harness on this computer from another device.',
    detail: 'After enabling and restarting, open Phone connection to finish setup. You can then use DeepSeek Harness on this computer from other internet-connected devices. This computer must remain on and connected to the internet.',
    confirm: 'Enable and restart', cancel: 'Not now',
    failed: 'Could not enable remote control', retry: 'Try again later, or enable Phone connection in Desktop settings.',
  },
  'zh-Hant': {
    label: '遠端控制', title: '啟用遠端控制？',
    message: '從其他裝置使用這台電腦上的 DeepSeek Harness。',
    detail: '啟用並重新啟動後，請從「手機連線」完成連線設定。設定完成後，你可以透過其他連網裝置遠端使用這台電腦上的 DeepSeek Harness。遠端使用時，這台電腦需要保持開機並連線。',
    confirm: '啟用並重新啟動', cancel: '暫不開啟',
    failed: '未能啟用遠端控制', retry: '請稍後再試，或前往「桌面設定」開啟手機連線。',
  },
  ja: {
    label: 'リモートコントロール', title: 'リモートコントロールを有効にしますか？',
    message: '別のデバイスからこのコンピューターの DeepSeek Harness を使用します。',
    detail: '有効にして再起動したら、「スマートフォン接続」を開いてセットアップを完了してください。その後、他のインターネット接続デバイスからこのコンピューターの DeepSeek Harness を使用できます。このコンピューターは電源が入ったままインターネットに接続されている必要があります。',
    confirm: '有効にして再起動', cancel: '今はしない',
    failed: 'リモートコントロールを有効にできませんでした', retry: 'しばらくしてから再試行するか、デスクトップ設定でスマートフォン接続を有効にしてください。',
  },
  ko: {
    label: '원격 제어', title: '원격 제어를 사용하시겠습니까?',
    message: '다른 기기에서 이 컴퓨터의 DeepSeek Harness를 사용합니다.',
    detail: '사용 설정 후 다시 시작한 다음 휴대폰 연결을 열어 설정을 완료하세요. 그런 다음 인터넷에 연결된 다른 기기에서 이 컴퓨터의 DeepSeek Harness를 사용할 수 있어요. 이 컴퓨터는 켜져 있고 인터넷에 연결되어 있어야 해요.',
    confirm: '사용 설정 후 다시 시작', cancel: '나중에',
    failed: '원격 제어를 사용 설정하지 못했어요', retry: '잠시 후 다시 시도하거나 데스크톱 설정에서 휴대폰 연결을 켜세요.',
  },
  es: {
    label: 'Control remoto', title: '¿Activar el control remoto?',
    message: 'Usar DeepSeek Harness en esta computadora desde otro dispositivo.',
    detail: 'Después de activarlo y reiniciar, abre Conexión con el teléfono para completar la configuración. Luego podrás usar DeepSeek Harness en esta computadora desde otros dispositivos conectados a internet. Esta computadora debe permanecer encendida y conectada a internet.',
    confirm: 'Activar y reiniciar', cancel: 'Ahora no',
    failed: 'No se pudo activar el control remoto', retry: 'Inténtalo de nuevo más tarde o activa la conexión con el teléfono en los ajustes del escritorio.',
  },
  fr: {
    label: 'Contrôle à distance', title: 'Activer le contrôle à distance ?',
    message: 'Utiliser DeepSeek Harness sur cet ordinateur depuis un autre appareil.',
    detail: 'Après l’activation et le redémarrage, ouvrez Connexion téléphone pour terminer la configuration. Vous pourrez ensuite utiliser DeepSeek Harness sur cet ordinateur depuis d’autres appareils connectés à internet. Cet ordinateur doit rester allumé et connecté à internet.',
    confirm: 'Activer et redémarrer', cancel: 'Pas maintenant',
    failed: 'Impossible d’activer le contrôle à distance', retry: 'Réessayez plus tard ou activez la connexion téléphone dans les paramètres du bureau.',
  },
  de: {
    label: 'Fernsteuerung', title: 'Fernsteuerung aktivieren?',
    message: 'DeepSeek Harness auf diesem Computer von einem anderen Gerät aus verwenden.',
    detail: 'Öffne nach dem Aktivieren und Neustart Telefonverbindung, um die Einrichtung abzuschließen. Danach kann DeepSeek Harness auf diesem Computer von anderen internetverbundenen Geräten aus verwendet werden. Dieser Computer muss eingeschaltet und mit dem Internet verbunden bleiben.',
    confirm: 'Aktivieren und neu starten', cancel: 'Jetzt nicht',
    failed: 'Fernsteuerung konnte nicht aktiviert werden', retry: 'Später erneut versuchen oder die Telefonverbindung in den Desktop-Einstellungen aktivieren.',
  },
} as const

export interface RemoteControlOfferState { readonly enabled: boolean; readonly seen: boolean }

export class RemoteControlOffer {
  private seen = false
  private pending: Promise<void> | undefined
  constructor(private readonly options: {
    path: string
    readEnabled(): Promise<boolean>
    enable(): Promise<void>
    confirm(copy: typeof remoteControlOfferCopy[DesktopLocale]): Promise<boolean>
    reportError(cause: unknown): void
  }) {}

  async read(): Promise<RemoteControlOfferState> {
    try { this.seen ||= await readFile(this.options.path, 'utf8') === 'seen\n' }
    catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') this.options.reportError(cause) }
    return { enabled: await this.options.readEnabled(), seen: this.seen }
  }

  open(locale: DesktopLocale): Promise<void> {
    if (this.pending) return this.pending
    this.pending = this.perform(locale).finally(() => { this.pending = undefined })
    return this.pending
  }

  private async perform(locale: DesktopLocale): Promise<void> {
    this.seen = true
    try {
      await mkdir(dirname(this.options.path), { recursive: true })
      await writeFile(this.options.path, 'seen\n', { mode: 0o600 })
    } catch (cause) { this.options.reportError(cause) }
    if (await this.options.readEnabled()) return
    if (await this.options.confirm(remoteControlOfferCopy[locale])) await this.options.enable()
  }
}
