const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ignoredDirectories = new Set(['node_modules', 'dist', '.git', 'storage', 'scratch']);
const violations = [];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

function normalize(value) {
  return value.replace(/\\/g, '/');
}

function resolveRelative(sourceFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  return normalize(path.resolve(path.dirname(sourceFile), specifier));
}

function add(ruleId, file, node, specifier, resolvedTarget, remediation) {
  const source = fs.readFileSync(file, 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const position = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
  violations.push({
    ruleId,
    file: normalize(path.relative(root, file)),
    line: position.line + 1,
    specifier,
    resolvedTarget,
    remediation,
  });
}

function inspectPluginFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const pluginRoot = normalize(path.join(root, 'plugins'));

  function inspectSpecifier(node, specifier) {
    const resolved = resolveRelative(file, specifier);
    const normalizedSpecifier = normalize(specifier);
    const normalizedResolved = resolved || normalizedSpecifier;

    if (normalizedSpecifier.includes('apps/api') || normalizedResolved.includes('/apps/api/')) {
      add('SDK001', file, node, specifier, normalizedResolved, 'Use a server capability from @modern-cms/plugin-sdk.');
    } else if (normalizedSpecifier.includes('apps/admin') || normalizedResolved.includes('/apps/admin/')) {
      add('SDK002', file, node, specifier, normalizedResolved, 'Use the Admin or Editor SDK from @modern-cms/plugin-sdk.');
    } else if (/(^|\/)internal(\/|$)/.test(normalizedSpecifier) || normalizedResolved.includes('/internal/')) {
      add('SDK003', file, node, specifier, normalizedResolved, 'Import a documented public package entrypoint.');
    }

    if (resolved && resolved.startsWith(`${pluginRoot}/`)) {
      const relative = resolved.slice(pluginRoot.length + 1);
      const targetPlugin = relative.split('/')[0];
      const sourcePlugin = normalize(path.relative(pluginRoot, file)).split('/')[0];
      if (targetPlugin && sourcePlugin && targetPlugin !== sourcePlugin) {
        add('SDK004', file, node, specifier, normalizedResolved, 'Communicate through SDK, capability, API, or event contracts.');
      }
    }
  }

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      inspectSpecifier(node.moduleSpecifier, node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if ((isDynamicImport || isRequire) && ts.isStringLiteral(node.arguments[0])) {
        inspectSpecifier(node.arguments[0], node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
}

function inspectAdminRegistry() {
  const registry = path.join(root, 'apps', 'admin', 'src', 'plugins', 'registry.ts');
  if (!fs.existsSync(registry)) return;
  const source = fs.readFileSync(registry, 'utf8');
  const parsed = ts.createSourceFile(registry, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.includes('plugins/')) {
      add('RUNTIME001', registry, node.moduleSpecifier, node.moduleSpecifier.text, normalize(resolveRelative(registry, node.moduleSpecifier.text) || node.moduleSpecifier.text), 'Use manifest-driven module discovery instead of concrete plugin imports.');
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
}

function addFileViolation(ruleId, file, marker, remediation) {
  const source = fs.readFileSync(file, 'utf8');
  const offset = Math.max(0, source.indexOf(marker));
  const line = source.slice(0, offset).split(/\r?\n/).length;
  violations.push({
    ruleId,
    file: normalize(path.relative(root, file)),
    line,
    specifier: marker,
    resolvedTarget: normalize(path.relative(root, file)),
    remediation,
  });
}

function inspectAdminPluginLifecycle() {
  const registry = path.join(root, 'apps', 'admin', 'src', 'plugins', 'registry.ts');
  const runtime = path.join(root, 'apps', 'admin', 'src', 'plugins', 'adminRuntimeSdk.ts');
  const contentManager = path.join(root, 'apps', 'admin', 'src', 'pages', 'ContentManager.tsx');

  if (fs.existsSync(registry)) {
    const source = fs.readFileSync(registry, 'utf8');
    if (source.includes('registerAdminPlugins(pluginRegistry)') || !source.includes("plugin.status === 'ACTIVE'")) {
      addFileViolation('LIFECYCLE001', registry, 'pluginRegistry', 'Reconcile Admin plugin registrations from the server-reported ACTIVE set.');
    }
  }

  if (fs.existsSync(runtime)) {
    const source = fs.readFileSync(runtime, 'utf8');
    if (!source.includes('AdminPluginRuntimeScope') || !source.includes('scope.dispose()')) {
      addFileViolation('LIFECYCLE002', runtime, 'createAdminRuntimeSdk', 'Track every SDK registration in a per-plugin disposable runtime scope.');
    }
  }

  if (fs.existsSync(contentManager)) {
    const source = fs.readFileSync(contentManager, 'utf8');
    if (source.includes('SEO Search Snippet') || source.includes("tab === 'seo'")) {
      addFileViolation('OWNERSHIP001', contentManager, 'SEO', 'Keep SEO domain UI in the SEO plugin through public Editor SDK contributions.');
    }
  }
}

function inspectDistributionLayer() {
  const service = path.join(root, 'apps', 'api', 'src', 'distribution', 'PackageDistributionService.ts');
  const routes = path.join(root, 'apps', 'api', 'src', 'routes', 'plugins.ts');
  const runtime = path.join(root, 'apps', 'api', 'src', 'plugins', 'pluginRuntimeLoader.ts');
  const adminRegistry = path.join(root, 'apps', 'admin', 'src', 'plugins', 'registry.ts');
  const marketplaceSdk = path.join(root, 'packages', 'marketplace-sdk', 'src', 'index.ts');
  const required = [service, routes, runtime, adminRegistry, marketplaceSdk];
  if (required.some((file) => !fs.existsSync(file))) {
    addFileViolation('DIST001', required.find((file) => fs.existsSync(file)) || path.join(root, 'package.json'), 'distribution', 'Provide the complete platform-owned Distribution Layer and Marketplace SDK.');
    return;
  }
  const serviceSource = fs.readFileSync(service, 'utf8');
  if (!serviceSource.includes('verifyPackageArchive') || !serviceSource.includes('verifySignature') || !serviceSource.includes('safeEntryName')) {
    addFileViolation('DIST002', service, 'verifyPackageArchive', 'Validate archive paths, integrity, publisher signatures, and size limits before extraction.');
  }
  if (!serviceSource.includes('.distribution-staging') || !serviceSource.includes('.distribution-backups') || !serviceSource.includes('rollbackPackageOperation')) {
    addFileViolation('DIST003', service, 'installPackageArchive', 'Use atomic staging, backups, operation logs, and explicit rollback.');
  }
  const runtimeSource = fs.readFileSync(runtime, 'utf8');
  if (!runtimeSource.includes('manifest.runtime?.entry') || !runtimeSource.includes('resetPluginRuntime')) {
    addFileViolation('DIST004', runtime, 'loadPluginRuntime', 'Support post-boot Package V2 runtime activation and hard reload without restarting the API.');
  }
  const adminSource = fs.readFileSync(adminRegistry, 'utf8');
  if (!adminSource.includes('@vite-ignore') || !adminSource.includes("runtime === 'distributed'")) {
    addFileViolation('DIST005', adminRegistry, 'pluginRegistry', 'Load active browser-ready distributed Admin bundles without rebuilding Admin.');
  }
}

for (const file of walk(path.join(root, 'plugins'))) inspectPluginFile(file);
inspectAdminRegistry();
inspectAdminPluginLifecycle();
inspectDistributionLayer();

if (violations.length > 0) {
  process.stderr.write(`${JSON.stringify({ ok: false, violations }, null, 2)}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ ok: true, violations: [] }, null, 2)}\n`);
