module.exports = {
  apps: [
    {
      name: "floqex-engine",
      script: "npm",
      args: "run worker",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G", // Automatically restarts if memory exceeds 1GB to prevent system freezes
      exp_backoff_restart_delay: 100, // If the script crashes continuously, it slows down the restart rate
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/engine-error.log",
      out_file: "logs/engine-out.log",
      time: true // Adds timestamps to the PM2 logs
    }
  ]
};
