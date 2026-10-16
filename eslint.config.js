// ESLint estándar para React + Vite (flat config).
//
// Alcance: `src/` (app, globals de navegador) y `scripts/` + configs
// (nodo y navegador, la suite SSR usa ambos). Reglas recomendadas de JS,
// react-hooks y react-refresh. Sin reglas de estilo: solo higiene real.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const baseJsx = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  parserOptions: { ecmaFeatures: { jsx: true } },
}

export default [
  { ignores: ['dist', '.verificar-dist', 'node_modules'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: { ...baseJsx, globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs['recommended-latest'].rules,
      ...reactRefresh.configs.vite.rules,
      // La omisión por rest-sibling (`const { x, ...resto }`) es el idioma de
      // las migraciones para soltar campos deprecados: no es código muerto.
      // El resto de `no-unused-vars` queda en aviso (higiene sin bloquear).
      'no-unused-vars': ['warn', { ignoreRestSiblings: true }],
      // El repo co-ubica helpers con componentes por convención (igual que la
      // plantilla Vite): aviso, no error.
      'react-refresh/only-export-components': 'warn',
      // Estas reglas nuevas de react-hooks marcan patrones intencionales y
      // antiguos del repo (sincronizar combo controlado, combinar refs de
      // caret + RHF): cambiarlos sería reescribir lógica, quedan en aviso.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    files: ['scripts/**/*.{js,jsx}', 'eslint.config.js', 'vite.config.js'],
    languageOptions: { ...baseJsx, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs['recommended-latest'].rules,
      // Igual que en `src/`: la omisión por rest-sibling es idioma de
      // migración; el resto queda en aviso (higiene sin bloquear).
      'no-unused-vars': ['warn', { ignoreRestSiblings: true }],
    },
  },
]
