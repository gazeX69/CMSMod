import { pathToFileURL } from 'url';
import path from 'path';

async function test() {
  const backendEntry = 'c:/Users/gaze/Documents/cobacoba/CMSC/plugins/comments/dist/routes.js';
  try {
    const pluginModule = await import(pathToFileURL(backendEntry).href);
    const registerFn = pluginModule.default || pluginModule.routes;
    console.log('Import successful! registerFn type:', typeof registerFn);
  } catch (error) {
    console.error('Import failed:', error);
  }
}

test();
