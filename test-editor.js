const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const artifactsDir = 'C:\\Users\\gaze\\.gemini\\antigravity\\brain\\c8c84ac6-7ee2-499d-a93a-025ce4ed3b06';
  
  try {
    // 1. Go to Home / Admin
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    console.log('Opened page, URL:', page.url());
    
    // Check if we need to login
    if (page.url().includes('login')) {
      console.log('Needs login. Taking screenshot...');
      await page.screenshot({ path: path.join(artifactsDir, 'login.png') });
      // fill login form (assuming default admin/admin or similar if needed)
      await page.fill('input[type="text"], input[type="email"], input[placeholder*="user"]', 'admin');
      await page.fill('input[type="password"]', 'adminpassword123');
      await page.click('button:has-text("Login"), button:has-text("Sign in")');
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      console.log('Logged in. URL:', page.url());
    }

    // Go to posts/editor view
    console.log('Navigating to editor...');
    await page.goto('http://127.0.0.1:5173/posts/new', { waitUntil: 'networkidle' });
    console.log('URL:', page.url());
    
    await page.screenshot({ path: path.join(artifactsDir, 'editor-loaded.png') });

    // Wait for Editor wrapper
    await page.waitForSelector('.tiptap-editor-wrapper', { timeout: 10000 });
    console.log('Editor loaded');

    // Make sure we are on the Insert tab in the ribbon
    const insertTab = await page.$('button.editor-tab-btn:has-text("Insert")');
    if (insertTab) {
      await insertTab.click();
      console.log('Clicked Insert Tab on Ribbon');
      await page.waitForTimeout(500);
    }

    // 2. Click Insert Image icon
    // Using title="Insert Image"
    await page.click('button[title="Insert Image"]');
    console.log('Clicked Insert Image');
    
    await page.screenshot({ path: path.join(artifactsDir, 'insert-image-modal.png') });

    // 3. Click Media Library
    const mediaLibBtn = await page.$('button:has-text("Media Library")');
    if (mediaLibBtn) {
        await mediaLibBtn.click();
        console.log('Clicked Media Library Tab');
    } else {
        console.log('Media Library Tab NOT found');
    }

    // 4. Wait for items and click the first asset
    try {
      await page.waitForSelector('.media-card', { timeout: 5000 });
    } catch (e) {
      console.log('No media found. Uploading test file...');
      const fs = require('fs');
      fs.writeFileSync('test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
      const uploadBtn = await page.$('input[type="file"]');
      if (uploadBtn) {
        await uploadBtn.setInputFiles('test.png');
        await page.waitForSelector('.media-card', { timeout: 5000 });
      } else {
        console.log('Upload button not found!');
      }
    }
    
    const firstMedia = await page.$('.media-card');
    if (firstMedia) {
      await firstMedia.click();
      console.log('Selected first media asset');
    } else {
      console.log('Still no media asset found.');
    }

    // 5. Click Insert
    await page.click('button:has-text("Insert")');
    console.log('Clicked Insert button');
    
    // Wait a bit for the modal to close and TipTap to process
    await page.waitForTimeout(500);

    // 6. Type text immediately after insertion
    await page.keyboard.type('Hello World');
    console.log('Typed "Hello World"');
    await page.waitForTimeout(500);

    // Check if modal closed
    const insertBtnVisible = await page.isVisible('button:has-text("Insert")');
    console.log('Modal closed?', !insertBtnVisible);

    // B. Get editor content
    const editorJSON = await page.evaluate(() => window.editor ? window.editor.getJSON() : null);
    const editorHTML = await page.evaluate(() => window.editor ? window.editor.getHTML() : null);
    console.log('Editor JSON:', JSON.stringify(editorJSON, null, 2));
    console.log('Editor HTML:', editorHTML);
    
    // Screenshot editor content
    await page.screenshot({ path: path.join(artifactsDir, 'after-insert.png') });

    // C. Search DOM for media-node
    const mediaNodesInfo = await page.evaluate(() => {
      const mediaNodes = Array.from(document.querySelectorAll('media-node, .media-node-view, react-node-view'));
      const imgs = Array.from(document.querySelectorAll('media-node img, .media-node-view img, react-node-view img'));
      
      const nodeInfo = mediaNodes.map(node => ({
        tagName: node.tagName,
        className: node.className,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      }));
      
      const imgInfo = imgs.map(img => ({
        src: img.src,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height,
      }));

      return { nodes: nodeInfo, images: imgInfo };
    });
    
    console.log('Found media-nodes/views:', mediaNodesInfo.nodes.length);
    console.log('Found images:', mediaNodesInfo.images.length);
    console.log(JSON.stringify(mediaNodesInfo, null, 2));

    // Save article test
    const finalHtml = await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror');
      return pm ? pm.innerHTML : null;
    });
    console.log('ProseMirror HTML before save:', finalHtml);
    
    await page.click('button:has-text("Save Draft")');
    console.log('Clicked Save Draft');
    await page.waitForTimeout(2000);
    
    console.log('URL after save:', page.url());
    
    // Go back to posts list and edit the first post
    await page.goto('http://127.0.0.1:5173/posts', { waitUntil: 'networkidle' });
    await page.waitForSelector('button.t-action-btn:has-text("Edit")', { timeout: 10000 });
    const editBtns = await page.$$('button.t-action-btn:has-text("Edit")');
    if (editBtns.length > 0) {
      await editBtns[0].click();
      console.log('Clicked Edit on the first post');
      await page.waitForTimeout(2000);
      
      const reloadedNodesInfo = await page.evaluate(() => {
        const mediaNodes = Array.from(document.querySelectorAll('media-node, .media-node-view, react-node-view'));
        const imgs = Array.from(document.querySelectorAll('media-node img, .media-node-view img, react-node-view img'));
        return { nodes: mediaNodes.length, images: imgs.length };
      });
      console.log('After reload -> Found media-nodes/views:', reloadedNodesInfo.nodes, '| images:', reloadedNodesInfo.images);
    } else {
      console.log('No edit buttons found.');
    }
    
  } catch (err) {
    console.error('Test Error:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'error.png') });
  } finally {
    await browser.close();
  }
})();
