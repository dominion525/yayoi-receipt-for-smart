import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getBuildInfo, getShortVersion } from '../version'

describe('version', () => {
  const originalBuildTime = (globalThis as any).__BUILD_TIME__
  const originalBuildRevision = (globalThis as any).__BUILD_REVISION__

  beforeEach(() => {
    // グローバル変数をクリア
    delete (globalThis as any).__BUILD_TIME__
    delete (globalThis as any).__BUILD_REVISION__
  })

  afterEach(() => {
    // グローバル変数を復元
    if (originalBuildTime !== undefined) {
      (globalThis as any).__BUILD_TIME__ = originalBuildTime
    } else {
      delete (globalThis as any).__BUILD_TIME__
    }

    if (originalBuildRevision !== undefined) {
      (globalThis as any).__BUILD_REVISION__ = originalBuildRevision
    } else {
      delete (globalThis as any).__BUILD_REVISION__
    }

    // import.meta.envを復元
    vi.unstubAllEnvs()
  })

  describe('getBuildInfo', () => {
    it('ビルド情報を正しく取得する', () => {
      const buildInfo = getBuildInfo()

      expect(buildInfo).toHaveProperty('version')
      expect(buildInfo).toHaveProperty('buildTime')
      expect(buildInfo).toHaveProperty('gitCommit')
      expect(buildInfo).toHaveProperty('environment')
      expect(typeof buildInfo.version).toBe('string')
      expect(typeof buildInfo.buildTime).toBe('string')
    })

    it('__BUILD_TIME__が設定されている場合、その値を使用する', () => {
      const testTime = '2025-10-30T12:00:00.000Z';
      (globalThis as any).__BUILD_TIME__ = testTime

      const buildInfo = getBuildInfo()

      expect(buildInfo.buildTime).toBe(testTime)
    })

    it('__BUILD_REVISION__が設定されている場合、その値を使用する', () => {
      const testCommit = 'abc123def';
      (globalThis as any).__BUILD_REVISION__ = testCommit

      const buildInfo = getBuildInfo()

      expect(buildInfo.gitCommit).toBe(testCommit)
    })

    it('gitCommitが"unknown"の場合、undefinedを返す（27行目カバー）', () => {
      (globalThis as any).__BUILD_REVISION__ = 'unknown'

      const buildInfo = getBuildInfo()

      expect(buildInfo.gitCommit).toBeUndefined()
    })

    it('gitCommitが空文字列の場合、undefinedを返す', () => {
      (globalThis as any).__BUILD_REVISION__ = ''

      const buildInfo = getBuildInfo()

      expect(buildInfo.gitCommit).toBeUndefined()
    })

    it('import.meta.env.PRODがfalseの場合、environmentはdevelopment', () => {
      vi.stubEnv('PROD', false)

      const buildInfo = getBuildInfo()

      expect(buildInfo.environment).toBe('development')
    })

    it('import.meta.env.PRODがtrueの場合、environmentはproduction（28行目カバー）', () => {
      vi.stubEnv('PROD', true)

      const buildInfo = getBuildInfo()

      expect(buildInfo.environment).toBe('production')
    })

    it('__BUILD_TIME__が未設定の場合、現在時刻を使用する', () => {
      const beforeTime = new Date().toISOString()
      const buildInfo = getBuildInfo()
      const afterTime = new Date().toISOString()

      // ビルド時刻が現在時刻付近であることを確認
      expect(buildInfo.buildTime).toBeDefined()
      expect(buildInfo.buildTime >= beforeTime).toBe(true)
      expect(buildInfo.buildTime <= afterTime).toBe(true)
    })

    it('__BUILD_REVISION__が未設定の場合、VITE_GIT_COMMITを使用する', () => {
      vi.stubEnv('VITE_GIT_COMMIT', 'vite-commit-123')

      const buildInfo = getBuildInfo()

      expect(buildInfo.gitCommit).toBe('vite-commit-123')
    })
  })

  describe('getShortVersion', () => {
    it('短縮バージョン文字列を返す', () => {
      const shortVersion = getShortVersion()

      expect(shortVersion).toMatch(/^v\d+\.\d+\.\d+/)
      expect(shortVersion.startsWith('v')).toBe(true)
    })

    it('package.jsonのversionと一致する', () => {
      const shortVersion = getShortVersion()
      const buildInfo = getBuildInfo()

      expect(shortVersion).toBe(`v${buildInfo.version}`)
    })
  })
})
