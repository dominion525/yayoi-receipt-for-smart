// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import vitest from 'eslint-plugin-vitest'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  // 除外設定（最初に配置）
  {
    ignores: ['dist/**', 'node_modules/**', '*.min.js', '.serena/**']
  },

  // 基本設定
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScriptファイル用の基本設定
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.config.ts', 'worker.ts']
        },
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        // Alpine.js globals
        Alpine: 'readonly',
        // Build-time globals (vite.config.tsで定義)
        __BUILD_REVISION__: 'readonly',
        __BUILD_TIME__: 'readonly'
      }
    },
    rules: {
      // 既存のコード品質に合わせた設定
      '@typescript-eslint/no-explicit-any': 'warn', // 段階的に改善
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],

      // TypeScript用のno-undefは不要
      'no-undef': 'off'
    }
  },

  // テストファイル用設定
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    plugins: {
      vitest
    },
    rules: {
      ...vitest.configs.recommended.rules,
      // テストファイルでは緩い設定
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off'
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals
      }
    }
  },

  // publicディレクトリの静的JSファイル用設定（ブラウザ環境）
  {
    files: ['public/**/*.js'],
    ignores: ['public/sw.js', 'public/service-worker.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly'
      }
    }
  },

  // Service Workerファイル用設定
  {
    files: ['**/sw.js', '**/service-worker.js', 'public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        addEventListener: 'readonly',
        importScripts: 'readonly'
      }
    }
  },

  // 設定ファイル用の設定（Node.js環境）
  {
    files: ['*.config.js', '*.config.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly'
      }
    }
  },

  // 型定義ファイル用設定
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off'
    }
  },

  // Prettier と衝突する ESLint ルールを無効化（最後に配置）
  prettierConfig
)
