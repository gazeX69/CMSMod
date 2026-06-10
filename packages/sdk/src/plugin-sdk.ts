export class PluginSDK {
  registerHook(name: string, callback: Function) {
    console.log(`Registered hook: ${name}`);
  }
}
