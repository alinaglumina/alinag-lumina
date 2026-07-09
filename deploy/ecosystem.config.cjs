// PM2 process manager config for a VPS (non-Docker) deployment.
// Build first: `npm run build`. Start: `pm2 start deploy/ecosystem.config.cjs`.
module.exports = {
  apps: [
    {
      name: "lumina-api",
      cwd: "./apps/api",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: { NODE_ENV: "production", API_PORT: 4000 },
      max_memory_restart: "512M",
    },
    {
      name: "lumina-web",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
      max_memory_restart: "512M",
    },
  ],
};
