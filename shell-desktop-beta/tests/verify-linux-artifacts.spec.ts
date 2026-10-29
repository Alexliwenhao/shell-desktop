import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  verifyLinuxArtifacts,
} from '../scripts/verify-linux-artifacts.ts'
import { linuxArtifactNames } from '../scripts/linux-artifact-names.ts'

const VERSION = '2.0.10-beta.1'
const temporaryRoots: string[] = []

function elfImage(): Buffer {
  const image = Buffer.alloc(4096)
  image[0] = 0x7f
  image.write('ELF', 1, 'ascii')
  image.write('AI\x02', 8, 'binary')
  return image
}

function debArchive(): Buffer {
  const archive = Buffer.alloc(256)
  archive.write('!<arch>\n', 0, 'ascii')
  archive.write('debian-binary/       0        ', 8, 'ascii')
  return archive
}

function gzipArchive(): Buffer {
  const archive = Buffer.alloc(256)
  archive.write('\x1f\x8b\x08', 0, 'binary')
  return archive
}

interface Fixture {
  readonly root: string
  readonly appImage: string
  readonly deb: string
  readonly tarGz: string
  readonly application: string
  readonly unpacked: string
}

function fixture(arch: 'x64' | 'arm64' = 'x64', version = VERSION): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'aishell-linux-artifacts-'))
  temporaryRoots.push(root)
  const dist = join(root, 'dist')
  const unpacked = join(dist, arch === 'x64' ? 'linux-unpacked' : `linux-${arch}-unpacked`)
  mkdirSync(join(unpacked, 'resources', 'app'), { recursive: true })
  const names = linuxArtifactNames(version, arch, {
    productPrefix: 'AI-Shell-Desktop-Beta',
    executableName: 'ai-shell-desktop-beta',
  })
  const appImage = join(dist, names.appImage)
  const deb = join(dist, names.deb)
  const tarGz = join(dist, names.tarGz)
  const application = join(unpacked, names.executable)
  writeFileSync(appImage, elfImage(), { mode: 0o755 })
  chmodSync(appImage, 0o755)
  writeFileSync(deb, debArchive())
  writeFileSync(tarGz, gzipArchive())
  writeFileSync(application, elfImage().subarray(0, 512), { mode: 0o755 })
  chmodSync(application, 0o755)
  writeFileSync(join(unpacked, 'resources', 'app', 'package.json'), '{"name":"shell-desktop-beta"}\n')
  return { root, appImage, deb, tarGz, application, unpacked }
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('Linux artifact verification', () => {
  it('accepts the exact versioned x64 AppImage, Debian package, tar.gz archive, and unpacked application', () => {
    const value = fixture()

    expect(verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toEqual({
      appImagePath: value.appImage,
      debPath: value.deb,
      tarGzPath: value.tarGz,
      applicationPath: value.application,
    })
  })

  it('accepts the arm64 artifact spellings', () => {
    const value = fixture('arm64')

    expect(verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'arm64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    }).tarGzPath).toBe(value.tarGz)
  })

  it('rejects artifacts from a different version', () => {
    const value = fixture('x64', '2.0.9-beta.1')

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('AI-Shell-Desktop-Beta-2.0.10-beta.1-x86_64.AppImage')
  })

  it('rejects a tar.gz archive without the gzip magic', () => {
    const value = fixture()
    const invalid = gzipArchive()
    invalid.write('not-gz', 0, 'ascii')
    writeFileSync(value.tarGz, invalid)

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('does not have a gzip header')
  })

  it('rejects a missing tar.gz archive', () => {
    const value = fixture()
    rmSync(value.tarGz)

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('tar.gz')
  })

  it('rejects an AppImage without the AppImage magic', () => {
    const value = fixture()
    const invalid = elfImage()
    invalid.fill(0, 8, 11)
    writeFileSync(value.appImage, invalid)

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('does not have an AppImage magic')
  })

  it.skipIf(process.platform === 'win32')('rejects an AppImage that lost its executable bit', () => {
    const value = fixture()
    chmodSync(value.appImage, 0o644)

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('is not executable')
  })

  it('rejects an unpacked application without an ELF header', () => {
    const value = fixture()
    const invalid = elfImage().subarray(0, 512)
    invalid.fill(0, 0, 4)
    writeFileSync(value.application, invalid)

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('does not have an ELF header')
  })

  it('rejects a Debian package without an ar archive header', () => {
    const value = fixture()
    const invalid = debArchive()
    invalid.write('not-ar!!', 0, 'ascii')
    writeFileSync(value.deb, invalid)

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('does not have an ar archive header')
  })

  it('rejects a Debian package whose first member is not debian-binary', () => {
    const value = fixture()
    const invalid = debArchive()
    invalid.write('control.tar.xz/     0        ', 8, 'ascii')
    writeFileSync(value.deb, invalid)

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('does not lead with a debian-binary member')
  })

  it('rejects an unpacked application without resources/app/package.json', () => {
    const value = fixture()
    rmSync(join(value.unpacked, 'resources', 'app', 'package.json'))

    expect(() => verifyLinuxArtifacts({
      desktopRoot: value.root,
      version: VERSION,
      arch: 'x64',
      productPrefix: 'AI-Shell-Desktop-Beta',
      executableName: 'ai-shell-desktop-beta',
    })).toThrow('resources/app/package.json')
  })
})
