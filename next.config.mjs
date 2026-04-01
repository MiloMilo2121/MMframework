/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow larger request bodies for questionnaire uploads
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  // Increase API body size limit
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};

export default nextConfig;
