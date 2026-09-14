import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import prettier from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const sqlTokens = (sql) =>
  sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[A-Za-z0-9_$]+|[^\s]/g);

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? files(path)
        : /\.(ts|cjs|mjs)$/.test(path)
          ? [path]
          : [];
    }),
  );
  return nested.flat();
}

async function formatSource(path) {
  const source = await readFile(path, "utf8");
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  const queries = [];
  const edit = (start, end, replacement) => {
    if (source.slice(start, end) !== replacement)
      edits.push({ start, end, replacement });
  };

  function visit(node) {
    if (
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node) ||
      ts.isObjectLiteralExpression(node)
    ) {
      const members = ts.isObjectLiteralExpression(node)
        ? node.properties
        : node.members;
      for (let i = 1; i < members.length; i++) {
        const previous = members[i - 1];
        const current = members[i];
        if (
          ts.isMethodDeclaration(previous) ||
          ts.isConstructorDeclaration(previous) ||
          ts.isMethodDeclaration(current)
        ) {
          const gap = source.slice(previous.end, current.getStart(tree));
          const whitespace = /^\s*/.exec(gap)[0];
          // Preserve comments and let Prettier restore indentation.
          edit(previous.end, previous.end + whitespace.length, "\n\n");
        }
      }
    }
    if (ts.canHaveDecorators(node) && !ts.isParameter(node)) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const whitespace = /^\s*/.exec(source.slice(decorator.end))[0];
        edit(decorator.end, decorator.end + whitespace.length, "\n");
      }
    }
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      /^(select|insert|update|delete)\s/i.test(node.text)
    ) {
      queries.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);

  for (const node of queries) {
    const start = node.getStart(tree);
    const line = source.slice(source.lastIndexOf("\n", start) + 1, start);
    const indent = /^\s*/.exec(line)[0];
    const sql = node.text.trim().replace(/;$/, "");
    const formatted = (
      await prettier.format(sql, {
        parser: "postgresql",
        plugins: ["prettier-plugin-sql-cst"],
        printWidth: Math.max(50, 80 - indent.length),
        sqlParamTypes: ["$nr"],
        sqlCanonicalSyntax: false,
        sqlKeywordCase: "preserve",
        sqlLiteralCase: "preserve",
        sqlTypeCase: "preserve",
      })
    )
      .trim()
      .replace(/;$/, "");
    if (
      JSON.stringify(sqlTokens(sql)) !== JSON.stringify(sqlTokens(formatted))
    ) {
      throw new Error(`SQL formatting changed tokens in ${path}`);
    }
    const escaped = formatted
      .replaceAll("\\", "\\\\")
      .replaceAll("`", "\\`")
      .replaceAll("${", "\\${");
    const replacement = "`" + escaped.split("\n").join("\n" + indent) + "`";
    edit(start, node.end, replacement);
  }

  let result = source;
  for (const { start, end, replacement } of edits.sort(
    (a, b) => b.start - a.start,
  )) {
    result = result.slice(0, start) + replacement + result.slice(end);
  }
  const config = await prettier.resolveConfig(path);
  result = await prettier.format(result, { ...config, filepath: path });
  if (result !== source) {
    if (check) return path;
    await writeFile(path, result);
  }
}

const paths = (
  await Promise.all(
    ["src", "test"].map((directory) => files(join(root, directory))),
  )
).flat();
const changed = [];
for (const path of paths) {
  const result = await formatSource(path);
  if (result) changed.push(result);
}
if (changed.length) {
  console.error("Backend layout requires formatting:\n" + changed.join("\n"));
  process.exitCode = 1;
}
