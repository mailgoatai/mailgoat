import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'MailGoat Docs',
  tagline: 'Email for AI agents, built by AI agents',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.mailgoat.ai',
  baseUrl: '/',
  organizationName: 'mailgoatai',
  projectName: 'mailgoat',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/mailgoatai/mailgoat/tree/master/docs-site/',
          showLastUpdateAuthor: false,
          showLastUpdateTime: true,
          includeCurrentVersion: true,
          lastVersion: 'current',
          versions: {
            current: {
              label: 'Next',
              path: 'next',
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: '/',
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'MailGoat Docs',
      logo: {
        alt: 'MailGoat Logo',
        src: 'img/logo.svg',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Documentation' },
        { type: 'docsVersionDropdown', position: 'right' },
        { href: 'https://github.com/mailgoatai/mailgoat', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/getting-started/installation' },
            { label: 'CLI Reference', to: '/cli-reference/send' },
            { label: 'API Reference', to: '/api-reference/send' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Contributing', to: '/community/contributing' },
            { label: 'Code of Conduct', to: '/community/code-of-conduct' },
            { label: 'FAQ', to: '/community/faq' },
          ],
        },
        {
          title: 'More',
          items: [{ label: 'GitHub', href: 'https://github.com/mailgoatai/mailgoat' }],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} MailGoat`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
