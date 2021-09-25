#!/usr/bin/env -S PATH="${PATH}:/usr/local/bin" deno run --unstable --allow-read --allow-run --allow-env

// Metadata allows your plugin to show up in the app, and website.
//
//  <xbar.title>lenv</xbar.title>
//  <xbar.version>v1.0</xbar.version>
//  <xbar.author>Udit Desai</xbar.author>
//  <xbar.author.github> desaiuditd </xbar.author.github>
//  <xbar.desc>Utilities for lenv.</xbar.desc>
//  <xbar.dependencies>Deno</xbar.dependencies>
//  <xbar.abouturl>https://github.com/desaiuditd/xbar-lenv</xbar.abouturl>

import { exists } from "https://deno.land/std@0.108.0/fs/mod.ts";
import { dirname, resolve } from "https://deno.land/std@0.108.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.108.0/encoding/yaml.ts";

import { sentenceCase } from "https://deno.land/x/gutenberg@0.1.5/case/sentence_case/mod.ts";

import bitbar, { separator } from "https://esm.sh/bitbar@1.3.2";

const LENV_COMMAND = "lenv";
const LENV_CONFIG_FILE = "config.yaml";
const GO_TO_REPO_ACTIONS = {
  "workspace": ["cd", "~/workspace/REPO_NAME"],
  "gopath": ["cd", "$GOPATH/src/bitbucket.org/ffxblue/REPO_NAME"],
};
const LENV_ACTIONS = {
  "make": {
    "init": ["make", "init"],
    "start": ["make", "start"],
    "stop": ["make", "stop"],
    "down": ["make", "down"],
    "update": ["make", "update"],
    "restart": ["make", "restart"],
  },
  "docker": {
    "init": ["docker-compose", "pull"],
    "start": ["docker-compose", "up", "--detach", "--no-build"],
    "stop": ["docker-compose", "down"],
    "down": ["docker-compose", "down", "-v"],
    "update": ["docker-compose", "pull"],
    "restart": ["docker-compose", "restart"],
  },
};

interface Repo {
  // deno-lint-ignore camelcase
  repo_path: "workspace" | "gopath";
  // deno-lint-ignore camelcase
  orchestrated_via: "docker" | "make" | "none";
}

interface LenvConfig {
  repos: Record<string, Repo>;
  groups: Record<string, string[]>;
}

try {
  const p = Deno.run({ cmd: ["which", LENV_COMMAND], stdout: "piped" });
  await p.status();
  const lenvLink = new TextDecoder().decode(await p.output()).trim();

  const commandExist = await exists(lenvLink);
  if (!commandExist) {
    console.log("lenv command doesn't exist.");
    Deno.exit();
  }

  const lenvPath = await Deno.readLink(lenvLink);
  const LENV_DIR = dirname(dirname(resolve(dirname(lenvLink), lenvPath)));

  const lenvConfig = parse(
    await Deno.readTextFile(
      resolve(LENV_DIR, LENV_CONFIG_FILE),
    ),
  ) as LenvConfig;

  const groups = Object.keys(lenvConfig.groups);
  const repos = Object.entries(lenvConfig.repos);

  const xBarItems = [
    { text: "lenv", dropdown: false },
    separator,
    {
      text: "Groups",
      submenu: groups.map((g) => ({
        text: g,
        submenu: [
          {
            text: "Init",
            shell: "lenv",
            param1: "init",
            param2: "--group",
            param3: g,
            terminal: true,
          },
          {
            text: "Start",
            shell: "lenv",
            param1: "start",
            param2: "--group",
            param3: g,
            terminal: true,
          },
          {
            text: "Stop",
            shell: "lenv",
            param1: "stop",
            param2: "--group",
            param3: g,
            terminal: true,
          },
          {
            text: "Down",
            shell: "lenv",
            param1: "down",
            param2: "--group",
            param3: g,
            terminal: true,
          },
          {
            text: "Update",
            shell: "lenv",
            param1: "update",
            param2: "--group",
            param3: g,
            terminal: true,
          },
          {
            text: "Restart",
            shell: "lenv",
            param1: "restart",
            param2: "--group",
            param3: g,
            terminal: true,
          },
        ],
      })),
    },
    {
      text: "Repos",
      submenu: repos.map(
        ([repoName, { repo_path, orchestrated_via }]) => {
          if (!["workspace", "gopath"].includes(repo_path)) {
            console.log(
              `repo_path "${repo_path}" not supported for: ${repoName}`,
            );
            Deno.exit();
          }

          if (!["docker", "make", "none"].includes(orchestrated_via)) {
            console.log(
              `orchestrated_via "${orchestrated_via}" not supported for: ${repoName}`,
            );
            Deno.exit();
          }

          let actions = [] as unknown[];
          if (orchestrated_via !== "none") {
            const cwd = GO_TO_REPO_ACTIONS[repo_path].map((cmd) =>
              cmd.replace("REPO_NAME", repoName)
            );

            actions = [
              separator,
              ...Object.entries(LENV_ACTIONS[orchestrated_via])
                .map(([action, cmds]) => {
                  const params = Object.fromEntries(
                    [
                      cwd[1],
                      "&&",
                      ...cmds,
                    ].map((cmd, i) => ([
                      `param${i + 1}`,
                      cmd,
                    ])),
                  );

                  return {
                    text: sentenceCase(action),
                    shell: cwd[0],
                    ...params,
                    terminal: true,
                  };
                }),
            ];
          }

          return {
            text: repoName,
            submenu: [
              {
                text: `Path Type: ${repo_path}`,
                disabled: true,
              },
              {
                text: `Orchestrated Via: ${orchestrated_via}`,
                disabled: true,
              },
              ...actions,
            ],
          };
        },
      ),
    },
  ];

  bitbar(xBarItems);
} catch (e) {
  console.log("Plugin Error:", e);
}
