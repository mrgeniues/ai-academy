module.exports = {
  apps: [
    {
      name: "learnhub",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/var/www/learnhub",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};
