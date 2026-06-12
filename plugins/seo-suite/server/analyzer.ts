export interface SeoAnalysisInput {
  title: string;
  description: string;
  focusKeyword: string;
  slug: string;
  bodyHtml: string;
  canonical?: string;
  robots?: string;
}

export interface SeoCheck {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  points: number;
  maxPoints: number;
  message: string;
}

const stripHtml = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const includes = (value: string, keyword: string) => Boolean(keyword) && value.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());

export function analyzeSeo(input: SeoAnalysisInput) {
  const text = stripHtml(input.bodyHtml || '');
  const words = text ? text.split(/\s+/).length : 0;
  const keyword = input.focusKeyword.trim();
  const checks: SeoCheck[] = [];
  const add = (id: string, label: string, ok: boolean, points: number, message: string, warning = false) => checks.push({ id, label, status: ok ? 'pass' : warning ? 'warning' : 'fail', points: ok ? points : warning ? Math.floor(points / 2) : 0, maxPoints: points, message });

  add('title-length', 'SEO title length', input.title.length >= 30 && input.title.length <= 60, 12, `${input.title.length}/60 characters`, input.title.length > 0);
  add('description-length', 'Meta description length', input.description.length >= 110 && input.description.length <= 160, 12, `${input.description.length}/160 characters`, input.description.length > 0);
  add('focus-keyword', 'Focus keyword configured', Boolean(keyword), 8, keyword || 'Add a primary focus keyword');
  add('keyword-title', 'Keyword in SEO title', includes(input.title, keyword), 12, 'Use the focus keyword naturally in the title');
  add('keyword-description', 'Keyword in description', includes(input.description, keyword), 10, 'Use the focus keyword in the meta description');
  add('keyword-slug', 'Keyword in URL slug', includes(input.slug.replace(/-/g, ' '), keyword), 8, 'Keep the URL short and relevant');
  add('keyword-intro', 'Keyword near introduction', includes(text.slice(0, 500), keyword), 8, 'Mention the topic early in the content');
  add('content-length', 'Content depth', words >= 600, 10, `${words} words`, words >= 300);
  add('headings', 'Heading structure', /<h[2-4][^>]*>/i.test(input.bodyHtml), 6, 'Use descriptive H2-H4 headings');
  add('links', 'Internal or external links', /<a\s[^>]*href=/i.test(input.bodyHtml), 5, 'Add useful contextual links');
  add('images', 'Images present', /<img\s/i.test(input.bodyHtml), 4, 'Add a relevant image', true);
  add('image-alt', 'Image alt text', !/<img\s(?![^>]*\balt=)[^>]*>/i.test(input.bodyHtml), 3, 'Every image should have alt text');
  add('indexability', 'Page is indexable', !(input.robots || '').includes('noindex'), 2, input.robots || 'index,follow', true);

  const score = Math.min(100, checks.reduce((sum, check) => sum + check.points, 0));
  return { score, grade: score >= 80 ? 'good' : score >= 50 ? 'needs-work' : 'poor', wordCount: words, checks };
}
