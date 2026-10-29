import { describe, expect, it, vi } from 'vitest'
import { linuxArtifactNames } from '../scripts/linux-artifact-names.ts'
import {
  linuxCompressionOverride,
  normalizeLinuxArchitecture,
  packageLinuxArtifacts,
  withoutLinuxSigningSecrets,
  type LinuxPackageOptions,
} from '../scripts/package-linux.ts'

interface CommandCall {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly env: NodeJS.ProcessEnv
}

interface RenameCall {
  readonly from: string
  readonly to: string
}

function options(
  calls: CommandCall[] = [],
  logs: string[] = [],
  renames: RenameCall[] = [],
  overrides: Partial<LinuxPackageOptions> = {},
): LinuxPackageOptions {
  return {
    env: {
      PATH: '/usr/bin',
      SAFE_VALUE: 'kept',
      CSC_LINK: '/private/certificate.p12',
      csc_key_password: 'private-password',
    },
    platform: 'linux',
    arch: 'x64',
    nodeVersion: '22.23.2',
    version: '2.0.10',
    workspaceName: 'shell-desktop',
    productPrefix: 'AI-Shell-Desktop',
    executableName: 'ai-shell-desktop',
    workspaceRoot: '/repo',
    desktopRoot: '/repo/shell-desktop',
    builderCli: '/repo/node_modules/electron-builder/cli.js',
    prepareRuntime: () => undefined,
    verifier: '/repo/shell-desktop/scripts/verify-linux-artifacts.ts',
    nodeExecutable: '/usr/bin/node',
    run: (command, args, cwd, env) => {
      calls.push({ command, args: [...args], cwd, env: { ...env } })
    },
    rename: (from, to) => {
      renames.push({ from, to })
    },
    log: message => logs.push(message),
    ...overrides,
  }
}

describe('Linux artifact names', () => {
  it('uses the Debian, AppImage, and tar.gz architecture spellings', () => {
    expect(linuxArtifactNames('2.0.10', 'x64', {
      productPrefix: 'AI-Shell-Desktop',
      executableName: 'ai-shell-desktop',
    })).toEqual({
      appImage: 'AI-Shell-Desktop-2.0.10-x86_64.AppImage',
      deb: 'AI-Shell-Desktop-2.0.10-amd64.deb',
      builderTarGz: 'AI-Shell-Desktop-2.0.10-x64.tar.gz',
      tarGz: 'AI-Shell-Desktop-2.0.10-linux-x64.tar.gz',
      executable: 'ai-shell-desktop',
    })
  })

  it('keeps arm64 spellings identical across targets', () => {
    expect(linuxArtifactNames('2.0.10', 'arm64', {
      productPrefix: 'AI-Shell-Desktop',
      executableName: 'ai-shell-desktop',
    })).toEqual({
      appImage: 'AI-Shell-Desktop-2.0.10-arm64.AppImage',
      deb: 'AI-Shell-Desktop-2.0.10-arm64.deb',
      builderTarGz: 'AI-Shell-Desktop-2.0.10-arm64.tar.gz',
      tarGz: 'AI-Shell-Desktop-2.0.10-linux-arm64.tar.gz',
      executable: 'ai-shell-desktop',
    })
  })
})

describe('Linux packaging orchestration', () => {
  it('checks without credentials, builds unsigned x64 artifacts, renames the archive, then verifies', () => {
    const calls: CommandCall[] = []
    const logs: string[] = []
    const renames: RenameCall[] = []
    const prepareRuntime = vi.fn()

    packageLinuxArtifacts(options(calls, logs, renames, { prepareRuntime }))

    expect(prepareRuntime).toHaveBeenCalledOnce()
    expect(calls).toHaveLength(3)
    expect(calls[0]).toEqual({
      command: 'corepack',
      args: ['yarn', 'workspace', 'shell-desktop', 'check:linux-package'],
      cwd: '/repo',
      env: { PATH: '/usr/bin', SAFE_VALUE: 'kept' },
    })
    expect(calls[1]).toEqual({
      command: '/usr/bin/node',
      args: [
        '/repo/node_modules/electron-builder/cli.js',
        '--linux',
        'AppImage',
        'deb',
        'tar.gz',
        '--x64',
        '--publish',
        'never',
        '--config.npmRebuild=false',
        '--config.electronFuses.onlyLoadAppFromAsar=false',
      ],
      cwd: '/repo/shell-desktop',
      env: {
        PATH: '/usr/bin',
        SAFE_VALUE: 'kept',
        CSC_IDENTITY_AUTO_DISCOVERY: 'false',
        DSH_ELECTRON_BUILDER_TRAVERSAL_ONLY: '1',
      },
    })
    expect(calls[2]).toEqual({
      command: '/usr/bin/node',
      args: [
        '/repo/shell-desktop/scripts/verify-linux-artifacts.ts',
        '--arch=x64',
      ],
      cwd: '/repo/shell-desktop',
      env: { PATH: '/usr/bin', SAFE_VALUE: 'kept' },
    })
    expect(renames).toHaveLength(1)
    expect(renames[0]?.from.endsWith('AI-Shell-Desktop-2.0.10-x64.tar.gz')).toBe(true)
    expect(renames[0]?.to.endsWith('AI-Shell-Desktop-2.0.10-linux-x64.tar.gz')).toBe(true)
    expect(logs).toEqual([
      'Building unsigned Linux x64 AppImage, Debian package, and tar.gz archive; signing is a separate release step.',
      'Renamed the Linux tar archive to AI-Shell-Desktop-2.0.10-linux-x64.tar.gz.',
    ])
  })

  it('packages and verifies the arm64 architecture explicitly', () => {
    const calls: CommandCall[] = []
    const logs: string[] = []
    const renames: RenameCall[] = []

    packageLinuxArtifacts(options(calls, logs, renames, { arch: 'arm64' }))

    expect(calls[1]?.args).toContain('--arm64')
    expect(calls[1]?.args).not.toContain('--x64')
    expect(calls[2]?.args).toEqual([
      '/repo/shell-desktop/scripts/verify-linux-artifacts.ts',
      '--arch=arm64',
    ])
    expect(renames[0]?.to.endsWith('AI-Shell-Desktop-2.0.10-linux-arm64.tar.gz')).toBe(true)
    expect(logs).toEqual([
      'Building unsigned Linux arm64 AppImage, Debian package, and tar.gz archive; signing is a separate release step.',
      'Renamed the Linux tar archive to AI-Shell-Desktop-2.0.10-linux-arm64.tar.gz.',
    ])
  })

  it('skips the preflight when the package gate already ran', () => {
    const calls: CommandCall[] = []
    const logs: string[] = []

    packageLinuxArtifacts(options(calls, logs, [], {
      env: { DSH_PACKAGE_CHECK_ALREADY_RAN: '1' },
    }))

    expect(calls).toHaveLength(2)
    expect(calls[0]?.args).not.toContain('check:linux-package')
    expect(logs).toContain('Skipping the Linux package preflight; the package gate already passed.')
  })

  it('overrides electron-builder and Debian compression only when requested', () => {
    const calls: CommandCall[] = []
    const logs: string[] = []

    packageLinuxArtifacts(options(calls, logs, [], {
      env: {
        DSH_PACKAGE_CHECK_ALREADY_RAN: '1',
        DSH_LINUX_PACKAGE_COMPRESSION: 'store',
      },
    }))

    expect(calls[0]?.args).toContain('--config.compression=store')
    expect(calls[0]?.args).toContain('--config.deb.compression=gz')
    expect(logs).toContain('Packaging the Linux artifacts with store compression.')
  })

  it('rejects an unknown compression override before running commands', () => {
    const calls: CommandCall[] = []

    expect(() => packageLinuxArtifacts(options(calls, [], [], {
      env: { DSH_LINUX_PACKAGE_COMPRESSION: 'fast' },
    }))).toThrow('DSH_LINUX_PACKAGE_COMPRESSION must be store, normal, or maximum')
    expect(calls).toHaveLength(0)
    expect(linuxCompressionOverride({ DSH_LINUX_PACKAGE_COMPRESSION: '' })).toBeUndefined()
    expect(linuxCompressionOverride({})).toBeUndefined()
  })

  it('rejects non-Linux hosts, unsupported architectures, and old Node versions', () => {
    expect(() => packageLinuxArtifacts(options([], [], [], { platform: 'win32' })))
      .toThrow('must be built on a native Linux host')
    expect(() => normalizeLinuxArchitecture('ia32'))
      .toThrow('Linux artifacts support x64 or arm64')
    expect(() => packageLinuxArtifacts(options([], [], [], { nodeVersion: '20.1.0' })))
      .toThrow('Node 22.19+ or Node 24.x')
  })

  it('strips signing secrets case-insensitively', () => {
    expect(withoutLinuxSigningSecrets({
      csc_identity_auto_discovery: 'true',
      CSC_NAME: 'me',
      UNRELATED: 'keep',
    })).toEqual({ UNRELATED: 'keep' })
  })
})
