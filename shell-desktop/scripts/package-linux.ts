/** Build unsigned Linux AppImage, Debian, and tar.gz artifacts on a native Linux host. */

import { spawnSync } from 'node:child_process'
import { readFileSync, renameSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { electronBuilderEnvironment } from './electron-builder-environment.ts'
import {
  linuxArtifactNames,
  readLinuxDesktopIdentity,
  type LinuxArchitecture,
} from './linux-artifact-names.ts'
import { prepareFsExtForElectron } from './prepare-fs-ext.ts'

const LINUX_SIGNING_KEYS = [
  'CSC_IDENTITY_AUTO_DISCOVERY',
  'CSC_KEY_PASSWORD',
  'CSC_LINK',
  'CSC_NAME',
] as const
const LINUX_COMPRESSION_LEVELS = new Set(['store', 'normal', 'maximum'])

/** Compression override accepted by unsigned CI packaging. */
export type LinuxCompression = 'store' | 'normal' | 'maximum'

/** Injectable native Linux packaging boundary used by focused tests. */
export interface LinuxPackageOptions {
  /** Environment inherited by the packaging command. */
  readonly env: NodeJS.ProcessEnv
  /** Platform executing the package build. */
  readonly platform: NodeJS.Platform
  /** Target architecture of the produced artifacts. */
  readonly arch: LinuxArchitecture
  /** Node version executing the package build. */
  readonly nodeVersion: string
  /** Package version embedded in every artifact name. */
  readonly version: string
  /** Yarn workspace name used for the package preflight. */
  readonly workspaceName: string
  /** Release artifact prefix derived from the product name. */
  readonly productPrefix: string
  /** Linux executable name declared by the Electron Builder configuration. */
  readonly executableName: string
  /** Repository root containing the Yarn workspace. */
  readonly workspaceRoot: string
  /** Desktop package root containing electron-builder configuration. */
  readonly desktopRoot: string
  /** Absolute electron-builder CLI module. */
  readonly builderCli: string
  /** Prepare the target-architecture native runtime dependency before packaging. */
  readonly prepareRuntime: () => void
  /** Absolute packaged-artifact verification script. */
  readonly verifier: string
  /** Node executable used to run package-local scripts. */
  readonly nodeExecutable: string
  /** Execute one packaging command. */
  readonly run: (
    command: string,
    args: readonly string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
  ) => void
  /** Rename the tar.gz archive Electron Builder emits to its stable release name. */
  readonly rename: (from: string, to: string) => void
  /** Report non-secret packaging progress. */
  readonly log: (message: string) => void
}

/**
 * Read an optional Electron Builder compression override for unsigned CI
 * artifacts. Uncompressed artifacts are never published, so CI may select
 * `store`; release builds leave the variable unset and keep the default.
 * @param environment - Environment of the packaging process.
 * @returns The override, or `undefined` to keep the package configuration.
 */
export function linuxCompressionOverride(
  environment: NodeJS.ProcessEnv,
): LinuxCompression | undefined {
  const value = environment.DSH_LINUX_PACKAGE_COMPRESSION
  if (value === undefined || value === '') return undefined
  if (!LINUX_COMPRESSION_LEVELS.has(value)) {
    throw new Error(
      `DSH_LINUX_PACKAGE_COMPRESSION must be store, normal, or maximum; received ${JSON.stringify(value)}`,
    )
  }
  return value as LinuxCompression
}

/**
 * Normalize a Node architecture into a supported Linux target architecture.
 * @param arch - Architecture reported by Node or requested by the operator.
 * @returns The normalized `x64` or `arm64` architecture.
 */
export function normalizeLinuxArchitecture(arch: string): LinuxArchitecture {
  const normalized = arch === 'x86_64' ? 'x64' : arch
  if (normalized !== 'x64' && normalized !== 'arm64') {
    throw new Error(`Linux artifacts support x64 or arm64; received ${arch}`)
  }
  return normalized
}

/**
 * Remove all certificate discovery and secret variables from an unsigned build.
 * @param environment - Environment that may contain Linux signing configuration.
 * @returns A copy suitable for checks and unsigned packaging.
 */
export function withoutLinuxSigningSecrets(
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const sanitized = { ...environment }
  const signingKeys = new Set<string>(LINUX_SIGNING_KEYS)
  for (const key of Object.keys(sanitized)) {
    if (signingKeys.has(key.toUpperCase())) delete sanitized[key]
  }
  return sanitized
}

function run(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
  }
}

function readVersion(desktopRoot: string): string {
  const manifest = JSON.parse(readFileSync(join(desktopRoot, 'package.json'), 'utf8')) as {
    version?: unknown
  }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`desktop package at ${desktopRoot} has no valid version`)
  }
  return manifest.version
}

/**
 * Create the native packaging options for a verifier entry point.
 * @param verifier - Package-local verification script for the selected target.
 * @param arch - Target architecture; defaults to the host architecture.
 * @returns Options bound to this desktop package.
 */
export function createLinuxPackageOptions(
  verifier = './verify-linux-artifacts.ts',
  arch: string = process.arch,
): LinuxPackageOptions {
  const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const workspaceRoot = resolve(desktopRoot, '..')
  const require = createRequire(import.meta.url)
  const targetArch = normalizeLinuxArchitecture(arch)
  const identity = readLinuxDesktopIdentity(desktopRoot)
  return {
    env: process.env,
    platform: process.platform,
    arch: targetArch,
    nodeVersion: process.versions.node,
    version: readVersion(desktopRoot),
    workspaceName: identity.workspaceName,
    productPrefix: identity.productPrefix,
    executableName: identity.executableName,
    workspaceRoot,
    desktopRoot,
    builderCli: require.resolve('electron-builder/cli.js'),
    prepareRuntime: () => {
      prepareFsExtForElectron({ platform: 'linux', arch: targetArch, desktopRoot })
    },
    verifier: fileURLToPath(new URL(verifier, import.meta.url)),
    nodeExecutable: process.execPath,
    run,
    rename: renameSync,
    log: message => console.log(message),
  }
}

function assertLinuxPackageHost(options: LinuxPackageOptions): void {
  if (options.platform !== 'linux') {
    throw new Error('Linux artifacts must be built on a native Linux host')
  }
  normalizeLinuxArchitecture(options.arch)
  const versionMatch = /^(\d+)\.(\d+)\./u.exec(options.nodeVersion)
  const major = Number(versionMatch?.[1])
  const minor = Number(versionMatch?.[2])
  if (!((major === 22 && minor >= 19) || major === 24)) {
    throw new Error(
      `Linux artifacts require Node 22.19+ or Node 24.x with bundled Corepack; received ${options.nodeVersion}`,
    )
  }
}

/**
 * Rename the Electron Builder tar.gz archive to the stable release name.
 * @param options - Artifact root, version, architecture, rename, and logger.
 * @returns The renamed archive path.
 */
export function renameLinuxPortableArchive(options: {
  readonly desktopRoot: string
  readonly version: string
  readonly arch: LinuxArchitecture
  readonly productPrefix: string
  readonly executableName: string
  readonly rename: (from: string, to: string) => void
  readonly log?: (message: string) => void
}): string {
  const names = linuxArtifactNames(options.version, options.arch, {
    productPrefix: options.productPrefix,
    executableName: options.executableName,
  })
  const distDir = join(options.desktopRoot, 'dist')
  const from = join(distDir, names.builderTarGz)
  const to = join(distDir, names.tarGz)
  options.rename(from, to)
  options.log?.(`Renamed the Linux tar archive to ${names.tarGz}.`)
  return to
}

/** Run the gates and package the unsigned Linux artifacts for one architecture. */
export function packageLinuxArtifacts(
  options: LinuxPackageOptions = createLinuxPackageOptions(),
): void {
  assertLinuxPackageHost(options)
  const compression = linuxCompressionOverride(options.env)

  const cleanEnvironment = withoutLinuxSigningSecrets(options.env)
  options.log(
    `Building unsigned Linux ${options.arch} AppImage, Debian package, and tar.gz archive; `
    + 'signing is a separate release step.',
  )
  if (compression !== undefined) {
    options.log(`Packaging the Linux artifacts with ${compression} compression.`)
  }
  if (options.env.DSH_PACKAGE_CHECK_ALREADY_RAN !== '1') {
    options.run(
      'corepack',
      ['yarn', 'workspace', options.workspaceName, 'check:linux-package'],
      options.workspaceRoot,
      cleanEnvironment,
    )
  } else {
    options.log('Skipping the Linux package preflight; the package gate already passed.')
  }
  options.prepareRuntime()
  options.run(
    options.nodeExecutable,
    [
      options.builderCli,
      '--linux',
      'AppImage',
      'deb',
      'tar.gz',
      `--${options.arch}`,
      '--publish',
      'never',
      '--config.npmRebuild=false',
      '--config.electronFuses.onlyLoadAppFromAsar=false',
      ...(compression === undefined ? [] : [`--config.compression=${compression}`]),
      ...(compression === 'store' ? ['--config.deb.compression=gz'] : []),
    ],
    options.desktopRoot,
    electronBuilderEnvironment({
      ...cleanEnvironment,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    }),
  )
  renameLinuxPortableArchive({
    desktopRoot: options.desktopRoot,
    version: options.version,
    arch: options.arch,
    productPrefix: options.productPrefix,
    executableName: options.executableName,
    rename: options.rename,
    log: options.log,
  })
  options.run(
    options.nodeExecutable,
    [options.verifier, `--arch=${options.arch}`],
    options.desktopRoot,
    cleanEnvironment,
  )
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    packageLinuxArtifacts(createLinuxPackageOptions(
      './verify-linux-artifacts.ts',
      process.argv[2] ?? process.arch,
    ))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
