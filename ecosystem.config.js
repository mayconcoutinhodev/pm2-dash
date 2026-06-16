module.exports = {
  apps: [
    {
      name: 'pm2-dashboard',
      script: 'server.js',
      env: {
        PORT: 3042,
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      windowsHide: true,
      restart_delay: 2000,
    },
  ],
};
