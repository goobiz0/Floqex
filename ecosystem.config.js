module.exports = {
  apps: [
    {
      name: "floqex-engine",
      script: "npm",
      args: "run worker",
      // IMPORTANT: the trading engine MUST run as a single instance. It is a
      // stateful loop that holds and reconciles open positions; running it in
      // PM2 cluster mode (2+ instances) would make every bot tick — and submit
      // every order — twice, double-filling live positions. Scale throughput
      // inside the tick (it already fans out bots with Promise.all), not by
      // forking the process.
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      // Restart before the process bloats enough to get OOM-killed mid-position.
      max_memory_restart: "768M",
      // Graceful shutdown: on restart/stop, PM2 sends SIGINT and waits this long
      // for the engine to finish the in-flight tick and drain before SIGKILL.
      kill_timeout: 8000,
      // Crash-loop protection: if it dies within 10s of starting, count it as a
      // failed boot; give up after 10 rapid failures instead of thrashing.
      min_uptime: "10s",
      max_restarts: 10,
      exp_backoff_restart_delay: 100, // slow the restart rate on continuous crashes
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/engine-error.log",
      out_file: "logs/engine-out.log",
      time: true, // Adds timestamps to the PM2 logs
    },
  ],
};
