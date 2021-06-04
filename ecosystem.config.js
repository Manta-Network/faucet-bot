module.exports = {
    apps: [
      {
        name: "calamari-faucet",
        script: "./node_modules/.bin/ts-node",
        args: "src/index.ts",
        instances: 1,
        autorestart: true,
        watch: [
          "src",
          "config.toml",
        ],
        max_memory_restart: "1G",
        error_file: "./logs/calamari-faucet-stderr.log",
        out_file: "./logs/calamari-faucet-stdout.log",
        log_file: "./logs/calamari-faucet-combined.log",
        time: true,
      }
    ],
  };
