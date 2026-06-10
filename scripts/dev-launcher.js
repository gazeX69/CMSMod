const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const isWindows = process.platform === 'win32';
const nodeBin = isWindows ? 'node.exe' : 'node';
const noBrowser = process.argv.includes('--no-browser') || process.env.MODERNCMS_NO_BROWSER === '1';
let pnpmCommand = 'pnpm';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const children = new Map();
let isShuttingDown = false;

function color(value, code) {
  return process.stdout.isTTY ? `${code}${value}${colors.reset}` : value;
}

function line(status, message, detail) {
  const labelColors = {
    OK: colors.green,
    ERROR: colors.red,
    STARTING: colors.cyan,
    READY: colors.green,
    INFO: colors.gray,
  };
  const label = color(`[${status}]`, labelColors[status] || colors.reset);
  console.log(`${label} ${message}${detail ? color(` ${detail}`, colors.gray) : ''}`);
}

function fail(message, detail) {
  line('ERROR', message, detail);
  process.exitCode = 1;
}

function resolveCommand(command) {
  const lookup = isWindows
    ? spawnSync('where.exe', [command], { cwd: rootDir, encoding: 'utf8' })
    : spawnSync('command', ['-v', command], { cwd: rootDir, encoding: 'utf8', shell: true });

  if (lookup.status !== 0 || !lookup.stdout) {
    return null;
  }

  const firstMatch = lookup.stdout.split(/\r?\n/).find(Boolean);
  return firstMatch || null;
}

function commandExists(command, args = ['--version']) {
  const resolved = resolveCommand(command) || command;
  const runner = isWindows ? 'cmd.exe' : command;
  const runnerArgs = isWindows ? ['/d', '/s', '/c', command, ...args] : args;
  const result = spawnSync(runner, runnerArgs, {
    cwd: rootDir,
    shell: false,
    stdio: 'ignore',
  });
  if (result.status === 0) {
    return resolved;
  }

  const resolvedRunner = isWindows ? 'cmd.exe' : resolved;
  const resolvedRunnerArgs = isWindows ? ['/d', '/s', '/c', resolved, ...args] : args;
  const resolvedResult = spawnSync(resolvedRunner, resolvedRunnerArgs, {
    cwd: rootDir,
    shell: false,
    stdio: 'ignore',
  });
  return resolvedResult.status === 0 ? resolved : null;
}

function parseEnvFile(filePath) {
  const values = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const sourceLine of raw.split(/\r?\n/)) {
    const trimmed = sourceLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsAt = trimmed.indexOf('=');
    if (equalsAt === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(700);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.setTimeout(1000, () => {
        request.destroy();
        retry();
      });

      request.on('error', retry);
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(check, 500);
    };

    check();
  });
}

function prefixOutput(name, stream) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const outputLine of lines) {
      if (outputLine.trim()) {
        console.log(`${color(`[${name}]`, colors.gray)} ${outputLine}`);
      }
    }
  });
}

function spawnService(name, args) {
  line('STARTING', name);
  const command = isWindows ? 'cmd.exe' : pnpmCommand;
  const commandArgs = isWindows ? ['/d', '/s', '/c', pnpmCommand, ...args] : args;
  const child = spawn(command, commandArgs, {
    cwd: rootDir,
    env: { ...process.env },
    shell: false,
    windowsHide: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  children.set(name, child);
  prefixOutput(name, child.stdout);
  prefixOutput(name, child.stderr);

  child.on('exit', (code, signal) => {
    children.delete(name);
    if (!isShuttingDown && process.exitCode === 0 && code !== 0 && signal !== 'SIGTERM') {
      fail(`${name} stopped unexpectedly.`, `code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      shutdown(1);
    }
  });

  child.on('error', (error) => {
    fail(`${name} failed to start.`, error.message);
    shutdown(1);
  });

  return child;
}

function openBrowser(url) {
  if (noBrowser) {
    line('INFO', 'Browser auto-open skipped.', url);
    return;
  }

  const opener = process.platform === 'darwin'
    ? { command: 'open', args: [url] }
    : isWindows
      ? { command: 'cmd', args: ['/c', 'start', '', url] }
      : { command: 'xdg-open', args: [url] };

  const result = spawn(opener.command, opener.args, {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  result.unref();
  line('OK', 'Browser opened', url);
}

function shutdown(exitCode = 0) {
  isShuttingDown = true;
  process.exitCode = exitCode;
  for (const child of children.values()) {
    if (!child.killed) {
      child.kill();
    }
  }

  setTimeout(() => process.exit(exitCode), 250).unref();
}

async function main() {
  process.exitCode = 0;
  console.log(color('\nModernCMS Development Launcher\n', colors.cyan));

  if (!commandExists(nodeBin)) {
    fail('Node.js not found. Install Node.js before starting ModernCMS.');
    return;
  }
  line('OK', 'Node detected');

  const detectedPnpm = commandExists('pnpm');
  if (!detectedPnpm) {
    fail('PNPM not found. Install pnpm before starting ModernCMS.');
    return;
  }
  pnpmCommand = detectedPnpm;
  line('OK', 'PNPM detected');

  if (!fs.existsSync(envPath)) {
    fail('.env missing.', 'Create it from .env.example before starting services.');
    return;
  }
  line('OK', 'Environment loaded');

  const envValues = parseEnvFile(envPath);
  const hasDatabaseUrl = Boolean(envValues.DATABASE_URL);
  const hasDatabaseParts = Boolean(envValues.DB_HOST && envValues.DB_PORT && envValues.DB_USER !== undefined && envValues.DB_NAME);
  if (!hasDatabaseUrl && !hasDatabaseParts) {
    fail('Database config missing.', 'Set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_NAME in .env.');
    return;
  }
  line('OK', 'Database config found');

  const apiHost = envValues.HOST || '127.0.0.1';
  const apiPort = normalizePort(envValues.PORT, 4000);
  const adminHost = 'localhost';
  const adminPort = 5173;
  const apiHealthUrl = `http://${apiHost}:${apiPort}/health`;
  const adminUrl = `http://${adminHost}:${adminPort}`;

  const apiAlreadyRunning = await isPortOpen(apiHost, apiPort);
  if (apiAlreadyRunning) {
    line('OK', 'API already running', `http://${apiHost}:${apiPort}`);
  } else {
    spawnService('API', ['--filter', '@modern-cms/api', 'dev']);
  }

  const adminAlreadyRunning = await isPortOpen('127.0.0.1', adminPort) || await isPortOpen('localhost', adminPort);
  if (adminAlreadyRunning) {
    line('OK', 'ADMIN already running', adminUrl);
  } else {
    spawnService('ADMIN', ['--filter', '@modern-cms/admin', 'dev']);
  }

  try {
    await waitForHttp(apiHealthUrl, 30000);
    line('OK', 'API ready', apiHealthUrl);
    await waitForHttp(adminUrl, 30000);
    line('OK', 'ADMIN ready', adminUrl);
  } catch (error) {
    fail('Startup check failed.', error.message);
    shutdown(1);
    return;
  }

  openBrowser(adminUrl);
  line('READY', 'ModernCMS running');
  console.log(color('\nPress Ctrl+C to stop services.\n', colors.yellow));
}

process.on('SIGINT', () => {
  line('INFO', 'Stopping ModernCMS development services...');
  shutdown(0);
});

process.on('SIGTERM', () => {
  shutdown(0);
});

main().catch((error) => {
  fail('Launcher failed.', error.message);
  shutdown(1);
});
