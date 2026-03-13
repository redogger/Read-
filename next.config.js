/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'systeminformation'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        playwright: 'commonjs playwright',
        'playwright-extra': 'commonjs playwright-extra',
        'puppeteer-extra-plugin-stealth': 'commonjs puppeteer-extra-plugin-stealth',
      });
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.twimg.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
    ],
  },
};

module.exports = nextConfig;
