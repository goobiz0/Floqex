// Keep ENGINE_TOTAL_SHARDS in lockstep with `instances`. The worker shards
// running bots by NODE_APP_INSTANCE (which PM2 sets per cluster instance), so
// each bot is owned by exactly one instance — that is what makes running more
// than one engine safe: no bot is ever ticked, or traded, twice.
const INSTANCES = 2;

module.exports = {
  apps: [
    {
      name: "floqex-engine",
      // Point straight at the bundled worker (build:worker -> dist/engine.js) so
      // PM2 can fork it in cluster mode and assign each instance a NODE_APP_INSTANCE.
      script: "dist/engine.js",
      exec_mode: "cluster",
      instances: INSTANCES,
      autorestart: true,
      watch: false,
      // Restart before the process bloats enough to get OOM-killed mid-position.
      max_memory_restart: "768M",
      // Graceful shutdown: on restart/stop, PM2 sends SIGINT and waits this long
      // for the engine to drain its in-flight tick (and close WS streams) before
      // SIGKILL. The worker handles SIGINT/SIGTERM to stop scheduling new ticks.
      kill_timeout: 8000,
      // Crash-loop protection: dying within 10s of boot counts as a failed start;
      // give up after 10 rapid failures instead of thrashing the box.
      min_uptime: "10s",
      max_restarts: 10,
      exp_backoff_restart_delay: 100, // slow the restart rate on continuous crashes
      env: {
        NODE_ENV: "production",
        // Number of shards the bot universe is partitioned across. MUST equal
        // `instances`; if you scale the cluster, update this too.
        ENGINE_TOTAL_SHARDS: String(INSTANCES),
      },
      error_file: "logs/engine-error.log",
      out_file: "logs/engine-out.log",
      time: true, // Adds timestamps to the PM2 logs
    },
  ],
};
