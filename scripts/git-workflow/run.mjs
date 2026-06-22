import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function envPathValue(env) {
  return env.PATH ?? env.Path ?? env.path ?? "";
}

function executableCandidates(command, env) {
  if (process.platform !== "win32" || path.extname(command)) {
    return [command];
  }

  const extensions = (env.PATHEXT || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((extension) => extension.trim())
    .filter(Boolean);

  return [...extensions.map((extension) => `${command}${extension}`), command];
}

export function resolveCommand(command, env = process.env) {
  const searchDirs =
    command.includes("/") || command.includes("\\")
      ? [""]
      : envPathValue(env).split(path.delimiter);

  for (const candidate of executableCandidates(command, env)) {
    for (const searchDir of searchDirs) {
      const resolved = searchDir ? path.join(searchDir, candidate) : candidate;

      if (existsSync(resolved)) {
        return resolved;
      }
    }
  }

  return command;
}

function requiresWindowsShell(command) {
  return (
    process.platform === "win32" &&
    [".bat", ".cmd"].includes(path.extname(command).toLowerCase())
  );
}

// 返回跨平台 pnpm 调用方式。
export function pnpmCommand(args, env = process.env) {
  const pnpmCli = env.npm_execpath;

  if (pnpmCli) {
    return {
      command: process.execPath,
      args: [pnpmCli, ...args],
      shell: false,
    };
  }

  const command = resolveCommand("pnpm", env);

  return {
    command,
    args,
    shell: requiresWindowsShell(command),
  };
}

// 执行 pnpm 脚本。dryRun 用于 main:ship 演练。
export function runPnpm(args, options = {}) {
  const env = options.env ? { ...process.env, ...options.env } : process.env;
  const command = pnpmCommand(args, env);

  if (options.dryRun) {
    console.log(`[dry-run] pnpm ${args.join(" ")}`);
    return "";
  }

  return execFileSync(command.command, command.args, {
    cwd: process.cwd(),
    encoding: options.encoding,
    stdio: options.stdio ?? "inherit",
    env,
    shell: command.shell,
  });
}

// 执行 git 命令。默认捕获 stdout，便于脚本判断。
export function git(args, options = {}) {
  if (options.dryRun) {
    console.log(`[dry-run] git ${args.join(" ")}`);
    return "";
  }

  const output = execFileSync("git", args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: options.encoding ?? "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });

  if (typeof output !== "string") {
    return "";
  }

  return output.trim();
}

export function currentBranch() {
  return git(["branch", "--show-current"]);
}

export function readTextIfExists(filePath) {
  if (!existsSync(filePath)) {
    return "";
  }

  return readFileSync(filePath, "utf8");
}

export function isProtectedBranch(branch, config) {
  return (
    config.protectedBranches.includes(branch) ||
    config.protectedBranchPrefixes.some((prefix) => branch.startsWith(prefix))
  );
}

export function assertCleanWorkingTree() {
  const status = git(["status", "--porcelain"]);

  if (status) {
    throw new Error(
      "Working tree is not clean. Commit or stash changes before shipping main.",
    );
  }
}

export function assertBranchExists(branch) {
  git(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
    stdio: "ignore",
  });
}

export function assertBranchMerged(branch, target = "HEAD") {
  const mergedBranches = git([
    "branch",
    "--merged",
    target,
    "--format",
    "%(refname:short)",
  ])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!mergedBranches.includes(branch)) {
    throw new Error(
      `Branch "${branch}" is not merged into ${target}. Refusing to delete it.`,
    );
  }
}

export function assertRemoteIsNotAhead(upstreamRef) {
  const [behindText] = git([
    "rev-list",
    "--left-right",
    "--count",
    `${upstreamRef}...HEAD`,
  ]).split(/\s+/);
  const behind = Number(behindText);

  if (behind > 0) {
    throw new Error(
      `Current branch is behind or diverged from ${upstreamRef}. Pull/rebase first.`,
    );
  }
}

export function parseValueArg(args, name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

export function hasFlag(args, name) {
  return args.includes(name);
}

export function stagedFiles() {
  return git(["diff", "--cached", "--name-only"])
    .split("\n")
    .map((line) => line.trim().replaceAll("\\", "/"))
    .filter(Boolean);
}

export function assertWorktreePathInsideRoot(worktreePath, config) {
  const resolvedRoot = path.resolve(process.cwd(), config.worktreeRoot);
  const resolvedPath = path.resolve(process.cwd(), worktreePath);

  if (
    resolvedPath !== resolvedRoot &&
    !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(
      `Refusing to remove worktree outside ${config.worktreeRoot}: ${worktreePath}`,
    );
  }
}

// 读取目标项目 package.json 的 scripts。
export function readPackageScripts(cwd = process.cwd()) {
  const pkgPath = path.join(cwd, "package.json");

  if (!existsSync(pkgPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")).scripts ?? {};
  } catch {
    return {};
  }
}

export function hasPnpmScript(name, cwd = process.cwd()) {
  return Object.prototype.hasOwnProperty.call(readPackageScripts(cwd), name);
}

// 判断目标项目是否安装了某个本地二进制（lint-staged、commitlint 等）。
export function hasLocalBin(bin, cwd = process.cwd()) {
  const binDir = path.join(cwd, "node_modules", ".bin");

  return ["", ".cmd", ".ps1", ".CMD", ".exe"].some((ext) =>
    existsSync(path.join(binDir, `${bin}${ext}`)),
  );
}

// 命令/二进制缺失时跳过并提示，而不是让 hook 硬失败。
// 目标项目可能没有 BDD、skills index、lint-staged 或 commitlint，这是 MANIFEST 复用注意里允许的情况。
export function runPnpmOptional(args, options = {}) {
  const [first, second] = args;

  if (first === "exec") {
    if (!hasLocalBin(second, options.cwd)) {
      console.warn(
        `[git-workflow-hooks] 跳过 pnpm ${args.join(" ")}：未找到本地二进制 "${second}"（目标项目未安装，按 MANIFEST 复用注意处理）。`,
      );
      return "";
    }

    return runPnpm(args, options);
  }

  if (!hasPnpmScript(first, options.cwd)) {
    console.warn(
      `[git-workflow-hooks] 跳过 pnpm ${args.join(" ")}：package.json 未定义 "${first}" script（目标项目未配置该步骤）。`,
    );
    return "";
  }

  return runPnpm(args, options);
}
