import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

/** Split so this file does not itself contain the markers it forbids. */
const forbidden = [
  ["rhuan", "-lab"].join(""),
  ["192", ".168."].join(""),
  ["LR", "2024"].join(""),
  ["facts", "-private"].join(""),
  ["PVE", "03"].join(""),
  "BEGIN OPENSSH PRIVATE KEY",
  "BEGIN RSA PRIVATE KEY",
  ["PROXMOX_VE_API", "_TOKEN"].join(""),
];

const textExt = /\.(md|yml|yaml|json|hcl|py|html|css|ts|js|service|txt)$/;

test("tracked text does not carry private inventory markers", () => {
  const listed = [
    execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }),
    execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }),
  ].join("\0");
  const files = listed.split("\0").filter(Boolean);
  assert.equal(files.some((file) => file.startsWith("graphify-out/")), false);
  assert.equal(files.includes("STATE.md"), false);
  for (const devFile of [
    "prompt-enus.md",
    "prompt-ptbr.md",
    "AGENTS.md",
    "GEMINI.md",
    ".mcp.json",
    "opencode.json",
    "instructions/public-release.md",
  ]) {
    assert.equal(files.includes(devFile), false, devFile);
  }
  const hits = [];
  for (const file of files) {
    if (file === "tests/public-surface.test.js") continue;
    if (!textExt.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const needle of forbidden) {
      if (text.includes(needle)) hits.push(`${file} contains a private marker`);
    }
  }
  assert.deepEqual(hits, []);
});

test("gitignore keeps local dumps, loop notes, agent context, and env files out", () => {
  const ignore = readFileSync(".gitignore", "utf8");
  assert.match(ignore, /^\/graphify-out\/$/m);
  assert.match(ignore, /^\/STATE\.md$/m);
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\/AGENTS\.md$/m);
  assert.match(ignore, /^\/prompt-\*\.md$/m);
  assert.doesNotMatch(ignore, /^\/docs\/$/m);
});

test("Python requirements are explicit and the README credits Open-Meteo for personal use", () => {
  const requirements = readFileSync("requirements.txt", "utf8");
  assert.match(requirements, /standard library/);
  assert.doesNotMatch(requirements, /^\s*[A-Za-z0-9_.-]+==/m);
  const readme = readFileSync("README.md", "utf8");
  assert.match(readme, /https:\/\/open-meteo\.com\//);
  assert.match(readme, /https:\/\/open-meteo\.com\/en\/terms/);
  assert.match(readme, /personal, non-commercial use/);
  assert.match(readme, /requirements\.txt/);
  assert.match(readme, /package\.json/);
  for (const image of ["hero.jpg", "ui-desktop.png", "ui-map.png", "ui-loaded.png"]) {
    assert.match(readme, new RegExp(`docs/images/${image.replace(".", "\\.")}`));
    assert.equal(existsSync(`docs/images/${image}`), true, image);
  }
  assert.equal(existsSync("docs/images/ui-narrow.png"), false);
  assert.doesNotMatch(readme, /Maca[eé]/i);
  assert.doesNotMatch(readFileSync("index.html", "utf8"), /macae|Macaé/);
});

test("the project is released under the MIT license", () => {
  const license = readFileSync("LICENSE", "utf8");
  assert.match(license, /^MIT License/);
  assert.match(license, /Permission is hereby granted, free of charge/);
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.license, "MIT");
  assert.equal(Object.hasOwn(pkg, "private"), false);
});
