/** Verify the unsigned Linux AppImage, Debian, tar.gz, and unpacked application artifacts. */

import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { linuxArtifactNames, readLinuxDesktopIdentity, type LinuxArchitecture } from './linux-artifact-names.ts'

const ELF_HEADER_BYTES = 4
const APPIMAGE_MAGIC_OFFSET = 8
const APPIMAGE_MAGIC_BYTES = 3
const DEB_MEMBER_HEADER_BYTES = 60
const GZIP_MAGIC_BYTES = 3

/** Paths returned after Linux artifact verification succeeds. */
export interface LinuxArtifacts {
  /** AppImage distribution path. */
  readonly appImagePath: string
  /** Debian package path. */
  readonly debPath: string
  /** Stable tar.gz archive path. */
  readonly tarGzPath: string
  /** Unpacked application executable path. */
  readonly applicationPath: string
}

/** Injectable Linux artifact verification boundary. */
export interface LinuxArtifactVerificationOptions {
  /** Desktop package root containing package.json and dist. */
  readonly desktopRoot: string
  /** Product version embedded in the expected artifact names. */
  readonly version: string
  /** Target architecture embedded in the expected artifact names. */
  readonly arch: LinuxArchitecture
  /** Release artifact prefix. */
  readonly productPrefix: string
  /** Linux executable name declared by the Electron Builder configuration. */
  readonly executableName: string
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

function assertRegularFile(path: string, label: string, minimumBytes = 1): void {
  let size: number
  try {
    const stat = statSync(path)
    if (!stat.isFile()) throw new Error('not a file')
    size = stat.size
  } catch {
    throw new Error(`${label} is not a non-empty regular file: ${path}`)
  }
  if (size < minimumBytes) {
    throw new Error(`${label} is not a non-empty regular file: ${path}`)
  }
}

function readLeadingBytes(path: string, length: number, offset = 0): Buffer {
  const descriptor = openSync(path, 'r')
  const buffer = Buffer.alloc(length)
  try {
    readSync(descriptor, buffer, 0, length, offset)
  } finally {
    closeSync(descriptor)
  }
  return buffer
}

/**
 * Verify that a generated file is a non-empty regular ELF executable.
 * @param path - Artifact path to probe.
 * @param label - Human-readable role used in failure messages.
 */
export function assertElfExecutable(path: string, label: string): void {
  assertRegularFile(path, label, ELF_HEADER_BYTES + APPIMAGE_MAGIC_OFFSET)
  if (process.platform !== 'win32' && (statSync(path).mode & 0o111) === 0) {
    throw new Error(`${label} is not executable: ${path}`)
  }
  const header = readLeadingBytes(path, ELF_HEADER_BYTES)
  if (header[0] !== 0x7f || header.subarray(1, ELF_HEADER_BYTES).toString('ascii') !== 'ELF') {
    throw new Error(`${label} does not have an ELF header: ${path}`)
  }
}

/**
 * Verify that a generated file is an AppImage: an ELF executable carrying the
 * AppImage type magic at offset 8.
 * @param path - Artifact path to probe.
 * @param label - Human-readable role used in failure messages.
 */
export function assertAppImage(path: string, label: string): void {
  assertElfExecutable(path, label)
  const magic = readLeadingBytes(path, APPIMAGE_MAGIC_BYTES, APPIMAGE_MAGIC_OFFSET)
  if (!magic.equals(Buffer.from([0x41, 0x49, 0x02]))) {
    throw new Error(`${label} does not have an AppImage magic: ${path}`)
  }
}

/**
 * Verify that a generated file is a Debian binary package: an ar archive whose
 * first member is the mandatory debian-binary version marker.
 * @param path - Artifact path to probe.
 * @param label - Human-readable role used in failure messages.
 */
export function assertDebArchive(path: string, label: string): void {
  const arHeader = `!<arch>\n`.length
  assertRegularFile(path, label, arHeader + DEB_MEMBER_HEADER_BYTES)
  const header = readLeadingBytes(path, arHeader + DEB_MEMBER_HEADER_BYTES)
  if (header.subarray(0, arHeader).toString('ascii') !== `!<arch>\n`) {
    throw new Error(`${label} does not have an ar archive header: ${path}`)
  }
  // The ar member name field is space-padded; debian-binary must come first.
  const memberName = header.subarray(arHeader, arHeader + 16).toString('ascii')
  if (!memberName.startsWith('debian-binary')) {
    throw new Error(`${label} does not lead with a debian-binary member: ${path}`)
  }
}

/**
 * Verify that a generated file is a gzip-compressed tar archive.
 * @param path - Artifact path to probe.
 * @param label - Human-readable role used in failure messages.
 */
export function assertTarGzArchive(path: string, label: string): void {
  assertRegularFile(path, label, GZIP_MAGIC_BYTES)
  const magic = readLeadingBytes(path, GZIP_MAGIC_BYTES)
  if (!magic.equals(Buffer.from([0x1f, 0x8b, 0x08]))) {
    throw new Error(`${label} does not have a gzip header: ${path}`)
  }
}

function defaultOptions(): LinuxArtifactVerificationOptions {
  const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const archArgument = process.argv.find(argument => argument.startsWith('--arch='))
  const arch = archArgument?.slice('--arch='.length) ?? process.arch
  if (arch !== 'x64' && arch !== 'arm64') {
    throw new Error(`Linux artifact verification supports x64 or arm64; received ${arch}`)
  }
  const identity = readLinuxDesktopIdentity(desktopRoot)
  return {
    desktopRoot,
    version: readVersion(desktopRoot),
    arch,
    productPrefix: identity.productPrefix,
    executableName: identity.executableName,
  }
}

/**
 * Verify the exact AppImage, Debian package, tar.gz archive, and unpacked
 * application executable for one architecture.
 * @param options - Artifact root, expected version, and target architecture.
 * @returns The verified artifact paths.
 */
export function verifyLinuxArtifacts(
  options: LinuxArtifactVerificationOptions = defaultOptions(),
): LinuxArtifacts {
  const distDir = join(options.desktopRoot, 'dist')
  const names = linuxArtifactNames(options.version, options.arch, {
    productPrefix: options.productPrefix,
    executableName: options.executableName,
  })
  const appImagePath = join(distDir, names.appImage)
  const debPath = join(distDir, names.deb)
  const tarGzPath = join(distDir, names.tarGz)
  const unpackedDirectory = options.arch === 'x64' ? 'linux-unpacked' : `linux-${options.arch}-unpacked`
  const applicationPath = join(distDir, unpackedDirectory, names.executable)

  assertAppImage(appImagePath, 'Linux AppImage')
  assertDebArchive(debPath, 'Linux Debian package')
  assertTarGzArchive(tarGzPath, 'Linux tar.gz archive')
  assertElfExecutable(applicationPath, 'unpacked Linux application')

  const packagedManifest = join(distDir, unpackedDirectory, 'resources', 'app', 'package.json')
  if (!existsSync(packagedManifest)) {
    throw new Error(
      `unpacked Linux application is missing resources/app/package.json: ${packagedManifest}`,
    )
  }
  return { appImagePath, debPath, tarGzPath, applicationPath }
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    const verified = verifyLinuxArtifacts()
    console.log(
      `Linux artifact verification passed: ${verified.appImagePath}, ${verified.debPath}, ${verified.tarGzPath}`,
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
