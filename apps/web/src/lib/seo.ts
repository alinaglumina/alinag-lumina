const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const organizationJsonLd = (site: string) => ({
  "@context": "https://schema.org", "@type": "Organization",
  name: "Alinag Lumina", url: site, logo: `${site}/logo.png`,
  sameAs: ["https://instagram.com/alinaglumina", "https://twitter.com/alinaglumina"],
});

export const productJsonLd = (p: any) => ({
  "@context": "https://schema.org", "@type": "Product",
  name: p.name, description: p.seo?.description ?? p.shortDescription ?? p.description,
  image: p.images ?? [], sku: p.sku, brand: { "@type": "Brand", name: p.brand?.name ?? "Alinag Lumina" },
  aggregateRating: p.ratings?.count ? { "@type": "AggregateRating", ratingValue: p.ratings.average, reviewCount: p.ratings.count } : undefined,
  offers: { "@type": "Offer", priceCurrency: "INR", price: p.price, availability: (p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${SITE}/product/${p.slug}` },
});

export const breadcrumbJsonLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
});

export const faqJsonLd = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
