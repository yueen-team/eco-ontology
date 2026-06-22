import process from "node:process";
import { workflowConfig } from "./config.mjs";
import { runPnpmOptional } from "./run.mjs";

const commitMessageFile = process.argv[2];

if (!commitMessageFile) {
  console.error("commit-msg hook requires the commit message file path.");
  process.exit(1);
}

// 目标项目若未安装 commitlint，runPnpmOptional 跳过并提示，而不是阻断提交。
runPnpmOptional([...workflowConfig.commitlintCommand, commitMessageFile]);
