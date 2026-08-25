/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcryptjs", "@react-pdf/renderer", "nodemailer"],
};
module.exports = nextConfig;
