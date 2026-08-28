module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start",
      url: ["http://127.0.0.1:8747/", "http://127.0.0.1:8747/form"],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:performance": ["warn", { minScore: 0.75 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lhci-reports",
    },
  },
};
