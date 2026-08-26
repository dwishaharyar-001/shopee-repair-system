module.exports = {
  apps: [
    {
      name: 'arisa-repair-api',
      script: 'server/src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 100,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
