/**
 * Dynamic SEO metadata update utility for Single Page Applications (SPA).
 * This updates document titles, meta descriptions, canonical URLs, and Open Graph/Twitter tags.
 */
export function updateMetadata(title: string, description: string, path = '') {
  // Update document title
  document.title = title;

  // Ensure path starts with a slash if not empty
  const formattedPath = path && !path.startsWith('/') ? `/${path}` : path;
  const canonicalUrl = `https://booth.stoodioph.com${formattedPath}`;

  // 1. Update meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  // 2. Update canonical URL link tag
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // 3. Update Open Graph / Facebook tags
  updateMetaTag('property', 'og:title', title);
  updateMetaTag('property', 'og:description', description);
  updateMetaTag('property', 'og:url', canonicalUrl);

  // 4. Update Twitter tags
  updateMetaTag('property', 'twitter:title', title);
  updateMetaTag('property', 'twitter:description', description);
  updateMetaTag('property', 'twitter:url', canonicalUrl);
}

/**
 * Helper to update or create a meta tag dynamically.
 */
function updateMetaTag(attributeName: 'name' | 'property', attributeValue: string, contentValue: string) {
  let metaTag = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attributeName, attributeValue);
    document.head.appendChild(metaTag);
  }
  metaTag.setAttribute('content', contentValue);
}
