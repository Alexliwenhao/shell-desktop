/** Linux artifact names and desktop identity shared by packaging and verification. */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Architectures shipped for Linux. */
export type LinuxArchitecture = 'x64' | 'arm64'

/** Product identity used to derive versioned artifact names. */
export interface LinuxArtifactNameOptions {
  /** Release artifact prefix, for example `AI-Shell-Desktop-Beta`. */
  readonly productPrefix: string
  /** Linux executable name declared by the Electron Builder configuration. */
  readonly executableName: string
}

/** Every Linux artifact name for one version and architecture. */
export interface LinuxArtifactNames {
  /** AppImage name, using the `x86_64`/`arm64` spelling Electron Builder emits. */
  readonly appImage: string
  /** Debian package name, using the `amd64`/`arm64` spelling Electron Builder emits. */
  readonly deb: string
  /** Tar archive name as Electron Builder emits it before the stable rename. */
  readonly builderTarGz: string
  /** Stable tar archive name exposed in releases. */
  readonly tarGz: string
  /** Unpacked application executable name. */
  readonly executable: string
}

/** Identity read from the desktop manifest. */
export interface LinuxDesktopIdentity extends LinuxArtifactNameOptions {
  /** Yarn workspace name used for the package preflight. */
  readonly workspaceName: string
}

/**
 * Derive the versioned Linux artifact names for one architecture.
 * @param version - Package version embedded in every artifact name.
 * @param arch - Target architecture.
 * @param options - Product identity used to build every name.
 * @returns The AppImage, Debian, tar.gz, and executable names.
 */
export function linuxArtifactNames(
  version: string,
  arch: LinuxArchitecture,
  options: LinuxArtifactNameOptions,
): LinuxArtifactNames {
  return {
    appImage: `${options.productPrefix}-${version}-${arch === 'x64' ? 'x86_64' : 'arm64'}.AppImage`,
    deb: `${options.productPrefix}-${version}-${arch === 'x64' ? 'amd64' : 'arm64'}.deb`,
    builderTarGz: `${options.productPrefix}-${version}-${arch}.tar.gz`,
    tarGz: `${options.productPrefix}-${version}-linux-${arch}.tar.gz`,
    executable: options.executableName,
  }
}

/** Escape a product name into the hyphenated artifact prefix used by releases. */
function artifactPrefix(productName: string): string {
  const prefix = productName.trim().replaceAll(' ', '-')
  if (!/^[A-Za-z0-9.-]+$/u.test(prefix)) {
    throw new Error(`Desktop product name cannot form an artifact prefix: ${JSON.stringify(productName)}`)
  }
  return prefix
}

/**
 * Read the Linux packaging identity from a desktop package manifest.
 * @param desktopRoot - Desktop package root containing package.json.
 * @returns The workspace name, artifact prefix, and executable name.
 */
export function readLinuxDesktopIdentity(desktopRoot: string): LinuxDesktopIdentity {
  const manifest = JSON.parse(readFileSync(join(desktopRoot, 'package.json'), 'utf8')) as {
    name?: unknown
    build?: { productName?: unknown; linux?: { executableName?: unknown } }
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new Error(`desktop package at ${desktopRoot} has no workspace name`)
  }
  const productName = manifest.build?.productName ?? manifest.name
  if (typeof productName !== 'string' || productName.length === 0) {
    throw new Error(`desktop package at ${desktopRoot} has no product name`)
  }
  const executableName = manifest.build?.linux?.executableName ?? manifest.name
  if (typeof executableName !== 'string' || executableName.length === 0) {
    throw new Error(`desktop package at ${desktopRoot} has no Linux executable name`)
  }
  return {
    workspaceName: manifest.name,
    productPrefix: artifactPrefix(productName),
    executableName,
  }
}
