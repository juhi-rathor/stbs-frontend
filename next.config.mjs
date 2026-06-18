/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
    reactStrictMode: false,
    reactCompiler: true,
    output: isGithubActions ? 'export' : undefined,
    basePath: isGithubActions ? '/stbs-frontend' : '',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;