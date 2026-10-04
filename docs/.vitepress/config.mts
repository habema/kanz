import { defineConfig } from 'vitepress';

// The GitHub Pages workflow sets DOCS_BASE to /<repo>/.
export default defineConfig({
  // The workspace pins a newer esbuild than VitePress expects; it cannot lower
  // to VitePress's default browser targets, and the docs need no old browsers.
  // The dev server pre-bundles dependencies with its own target.
  vite: {
    build: { target: 'es2022' },
    optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  },
  title: 'Kanz',
  titleTemplate: ':title · Kanz',
  description: 'A self-hosted, Arabic live quiz game show: one laptop on the projector, the host on a phone.',
  base: process.env.DOCS_BASE ?? '/',
  cleanUrls: true,
  // The guides link to the app on localhost:8000.
  ignoreDeadLinks: 'localhostLinks',
  lastUpdated: false,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Schedule', link: '/guide/schedule' },
      { text: 'Development', link: '/guide/development' },
    ],
    sidebar: [
      {
        text: 'Hosting a game',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Onboarding', link: '/guide/onboarding' },
          { text: 'Running a game', link: '/guide/running-a-game' },
        ],
      },
      {
        text: 'Setting up',
        items: [
          { text: 'Game rules', link: '/guide/rules' },
          { text: 'Round schedule', link: '/guide/schedule' },
          { text: 'Importing questions', link: '/guide/questions-import' },
          { text: 'Media and sounds', link: '/guide/media-and-sounds' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Security', link: '/guide/security' },
          { text: 'Development', link: '/guide/development' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    socialLinks: [{ icon: 'github', link: 'https://github.com/habema/kanz' }],
  },
});
