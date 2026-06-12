import assert from 'node:assert/strict';
import { PluginEventBus } from './plugins/pluginEventBus.js';
import { capabilityRegistry } from './plugins/CapabilityRegistry.js';
import { publicDocumentContributors, publicRequestInterceptors, publicRouteRegistry, unregisterPublicExtensions } from './public/PublicExtensionRegistries.js';
import { isPluginCompatible } from './plugins/pluginCompatibility.js';

async function main() {
  assert.equal(isPluginCompatible('^0.1.0'), true);
  assert.equal(isPluginCompatible('^0.2.0'), false);
  assert.equal(isPluginCompatible('1.0.0'), false);
  const bus = new PluginEventBus();
  let healthyCalls = 0;
  bus.on('broken-plugin', 'content.updated', async () => { throw new Error('expected failure'); });
  bus.on('healthy-plugin', 'content.updated', async () => { healthyCalls += 1; });
  const report = await bus.emit('content.updated', { contentUuid: 'fixture' }, 'test', 2);
  assert.equal(healthyCalls, 1);
  assert.equal(report.failures, 1);
  bus.unregisterOwner('broken-plugin');
  assert.equal(bus.diagnostics().length, 1);

  const mediaRegistration = capabilityRegistry.register('fixture-provider', 'fixture.capability', { value: 42 }, { version: '1.0.0' });
  const capability = capabilityRegistry.resolve<{ value: number }>('fixture.capability', '1');
  assert.equal(capability.ok, true);
  if (capability.ok) assert.equal(capability.value.value, 42);
  assert.throws(() => capabilityRegistry.register('other-provider', 'fixture.capability', {}, { mode: 'exclusive' }));
  mediaRegistration.dispose();
  assert.equal(capabilityRegistry.resolve('fixture.capability').ok, false);

  const route = publicRouteRegistry.register('route-fixture', { id: 'text', path: '/platform-fixture.txt', handler: async () => ({ status: 200, body: 'ok' }) });
  assert.ok(publicRouteRegistry.resolve('GET', '/platform-fixture.txt'));
  assert.throws(() => publicRouteRegistry.register('other-fixture', { id: 'conflict', path: '/platform-fixture.txt', handler: async () => ({ status: 200, body: 'no' }) }));

  publicRequestInterceptors.register('interceptor-fixture', { id: 'rewrite', phase: 'beforeResolve', intercept: async () => ({ action: 'rewrite', path: '/rewritten' }) });
  const decision = await publicRequestInterceptors.run('beforeResolve', { method: 'GET', path: '/old', query: {}, headers: {} });
  assert.equal(decision.action, 'rewrite');

  publicDocumentContributors.register('document-fixture', { id: 'meta', contribute: async () => ({ meta: [{ key: 'fixture', name: 'fixture', content: 'ok' }] }) });
  publicDocumentContributors.register('failure-fixture', { id: 'failure', contribute: async () => { throw new Error('expected'); } });
  const contributions = await publicDocumentContributors.collect({ request: { method: 'GET', path: '/', query: {}, headers: {} }, route: null, site: {}, content: null, theme: null });
  assert.equal(contributions.length, 1);

  route.dispose();
  unregisterPublicExtensions('route-fixture');
  unregisterPublicExtensions('interceptor-fixture');
  unregisterPublicExtensions('document-fixture');
  unregisterPublicExtensions('failure-fixture');
  process.stdout.write('Platform contract tests passed\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
