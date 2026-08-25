/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "@react-pdf/renderer", "nodemailer"],
  },
};
module.exports = nextConfig;
