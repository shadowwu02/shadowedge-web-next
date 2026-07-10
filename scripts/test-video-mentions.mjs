import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = mkdtempSync(path.join(tmpdir(), "shadowedge-video-mentions-"));
const outDir = path.join(tempDir, "out");
const tsconfigPath = path.join(tempDir, "tsconfig.json");

writeFileSync(
  tsconfigPath,
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "esnext"],
        skipLibCheck: true,
        strict: true,
        noEmit: false,
        esModuleInterop: true,
        module: "commonjs",
        moduleResolution: "node",
        jsx: "react-jsx",
        types: ["node"],
        typeRoots: [path.join(rootDir, "node_modules", "@types")],
        baseUrl: rootDir,
        paths: {
          "@/*": ["./src/*"],
        },
        outDir,
        rootDir,
      },
      include: [
        path.join(rootDir, "src/lib/video-mentions.ts"),
        path.join(rootDir, "src/lib/video-mentions.test.ts"),
      ],
    },
    null,
    2,
  ),
);

try {
  const tscBin = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");
  const compile = spawnSync(process.execPath, [tscBin, "-p", tsconfigPath], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (compile.status !== 0) {
    process.stdout.write(compile.stdout || "");
    process.stderr.write(compile.stderr || "");
    process.exit(compile.status || 1);
  }

  const compiledSrc = path.join(outDir, "src");
  const aliasRoot = path.join(outDir, "node_modules", "@");
  mkdirSync(aliasRoot, { recursive: true });
  cpSync(compiledSrc, aliasRoot, { recursive: true });

  const packageJsonPath = path.join(outDir, "package.json");
  writeFileSync(packageJsonPath, JSON.stringify({ type: "commonjs" }));

  const testFile = path.join(outDir, "src", "lib", "video-mentions.test.js");
  const run = spawnSync(process.execPath, [testFile], {
    cwd: outDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  process.stdout.write(run.stdout || "");
  process.stderr.write(run.stderr || "");
  process.exit(run.status || 0);
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
