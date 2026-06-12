import { renderPublicRoute, resolvePublicRoute } from '../apps/api/src/public/publicWebsiteService.js';
import { db } from '../apps/api/src/database/client.js';
import { contents } from '../apps/api/src/database/schema.js';
import { setSetting } from '../apps/api/src/settings/settingsService.js';
import { saveSettings } from '../apps/api/src/themes/themeSettingsService.js';
import { initializeRegistry } from '../apps/api/src/themes/themeRegistry.js';

async function main() {
  console.log("=== STARTING THEME RENDERING AND SETTINGS AUDIT VALIDATION ===");

  // Initialize theme registry to discover default theme
  await initializeRegistry();

  // 1. Setup mock post content
  const mockPostSlug = 'test-rendering-post';
  
  // Clean up any existing
  await db.delete(contents).where(eq(contents.slug, mockPostSlug));

  console.log("Creating test post content...");
  const [inserted] = await db.insert(contents).values({
    title: 'Test Theme Settings Rendering',
    slug: mockPostSlug,
    type: 'post',
    status: 'published',
    body: '<p>This is a test post body with an image: <img data-media-uuid="1234-abcd" src="/api/media/resolve/1234-abcd">.</p>',
    excerpt: 'Test post excerpt for testing rendering.',
    publishedAt: new Date('2026-06-10T12:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const postId = (inserted as any).insertId;
  console.log(`Created test post ID: ${postId}`);

  // 2. Set theme settings to customized values
  console.log("Saving customized theme settings...");
  await saveSettings('default', {
    navigation: {
      desktopMenuStyle: 'horizontal',
      mobileMenuStyle: 'hamburger',
      megaMenuEnable: false,
    },
    footer: {
      footerText: 'CMS Custom Footer Text',
      copyrightText: '© {year} {siteName}. All rights reserved.',
      footerColumns: '3',
    },
    localization: {
      dateFormat: 'DD MMM YYYY',
      timeFormat: '24h',
      rtlSupport: false,
    },
    media: {
      imageBorderRadius: '15px',
      thumbnailRatio: '4:3',
      galleryLayout: 'grid',
    },
    homepage: {
      homepageLayout: 'default',
      heroEnable: true,
      heroTitle: 'Welcome GAZE Custom Hero',
      heroDescription: 'Custom Description',
      heroButton: 'Click Me Now',
      heroButtonUrl: '/start',
    },
    content: {
      showAuthor: false,
      showDate: true,
      showCategories: false,
      showTags: false,
      relatedContent: true,
    },
    performance: {
      lazyLoadImages: true,
      animationDisable: false,
      reduceMotion: true,
    }
  });

  try {
    // 3. Render the content page
    console.log("Rendering public content page...");
    const route = `/${mockPostSlug}`;
    const result = await renderPublicRoute(route);
    
    if (!result || !result.success) {
      throw new Error(`Failed to render public page: ${JSON.stringify(result)}`);
    }

    const html = result.html;
    console.log("Successfully rendered public page. Auditing HTML contents...");

    // Audit Mobile Menu Style
    if (!html.includes('data-mobile-menu="hamburger"')) {
      throw new Error("HTML does not include mobile menu style attribute: data-mobile-menu=\"hamburger\"");
    }
    console.log("✓ Mobile Menu style data attribute audit passed.");

    // Audit Date Formatting (dateFormat: 'DD MMM YYYY')
    // Date: 2026-06-10 -> 10 Jun 2026
    if (!html.includes('10 Jun 2026')) {
      throw new Error("HTML does not format the published date correctly according to DD MMM YYYY. Expected '10 Jun 2026'");
    }
    console.log("✓ Date formatting audit passed.");

    // Audit copyright text placeholders replacement
    const currentYear = new Date().getFullYear();
    if (!html.includes(`© ${currentYear}`)) {
      throw new Error(`Copyright text placeholders not replaced. Expected current year ${currentYear}`);
    }
    console.log("✓ Copyright placeholder replacement audit passed.");

    // Audit thumbnailRatio format replacement
    if (!html.includes('--thumbnail-ratio: 4/3')) {
      throw new Error("Thumbnail ratio : is not replaced with / in CSS variables. Expected --thumbnail-ratio: 4/3");
    }
    console.log("✓ Thumbnail ratio replacement audit passed.");

    // Audit post: page context fallback rendering
    // Our post.html has: "Published on {{ post.date }} by {{ post.author }}"
    // Since we set showAuthor to false, the meta author block will be display: none in CSS, but the HTML markup should still have it.
    if (!html.includes('Published on 10 Jun 2026') || !html.includes('by Admin')) {
      console.log("ACTUAL HTML RENDERED:\n", html);
      throw new Error("Post context fallback failed. HTML did not render post.date or post.author successfully.");
    }
    console.log("✓ Post template context fallback audit passed.");

    // Audit Image border radius CSS variable
    if (!html.includes('--image-border-radius: 15px')) {
      throw new Error("Image border radius setting not mapped to CSS variable. Expected --image-border-radius: 15px");
    }
    console.log("✓ Image border radius variable mapping audit passed.");

    // Audit Lazy load images
    if (!html.includes('loading="lazy"')) {
      throw new Error("Image elements do not have loading=\"lazy\" attribute injected based on performance settings.");
    }
    console.log("✓ Lazy load image injection audit passed.");

    // 4. Render Home page to audit Homepage Hero settings
    console.log("\nRendering homepage to audit hero settings...");
    // Force homepage slug to home
    await setSetting('public.homepage_slug', 'home', {
      group: 'public',
      type: 'string',
      isPublic: true,
    });

    const homeContent = await db.select().from(contents).where(eq(contents.slug, 'home')).limit(1);
    let tempHomeCreated = false;
    if (homeContent.length === 0) {
      console.log("Creating temporary home content...");
      await db.insert(contents).values({
        title: 'Home page',
        slug: 'home',
        type: 'page',
        status: 'published',
        body: '<p>Home body</p>',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      tempHomeCreated = true;
    }

    const homeResult = await renderPublicRoute('/');
    if (!homeResult || !homeResult.success) {
      throw new Error("Failed to render homepage");
    }

    const homeHtml = homeResult.html;
    if (!homeHtml.includes('Welcome GAZE Custom Hero')) {
      throw new Error("Homepage hero title not rendered correctly. Expected 'Welcome GAZE Custom Hero'");
    }
    if (!homeHtml.includes('data-hero-enabled="true"')) {
      throw new Error("Homepage hero enabled attribute not found. Expected data-hero-enabled=\"true\"");
    }
    console.log("✓ Homepage hero settings audit passed.");

    if (tempHomeCreated) {
      await db.delete(contents).where(eq(contents.slug, 'home'));
    }

  } finally {
    // Clean up
    console.log("Cleaning up mock post...");
    await db.delete(contents).where(eq(contents.slug, mockPostSlug));
  }

  console.log("\n=== ALL THEME RENDERING AUDITS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

import { eq } from 'drizzle-orm';
main().catch(err => {
  console.error("❌ Validation Failed:", err);
  process.exit(1);
});
