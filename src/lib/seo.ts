import type { Metadata } from 'next';
import type { Property } from '@/types';
import { absoluteUrl, siteConfig } from '@/config/site';

/** Trims text to a meta-description friendly length on a word boundary. */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function propertyPath(id: string) {
  return `/properties/${id}`;
}

function propertyLocation(property: Property) {
  return [property.location?.city, property.location?.state, property.location?.country]
    .filter(Boolean)
    .join(', ');
}

export function propertyMetadata(property: Property): Metadata {
  const location = propertyLocation(property);
  const title = `${property.title}${location ? ` — ${property.type || 'Home'} in ${location}` : ''}`;
  const school = property.location?.school ? ` near ${property.location.school}` : '';
  const description = truncate(
    property.description ||
      `${property.bedrooms}-bed ${property.type?.toLowerCase() || 'home'} for students${school}${location ? ` in ${location}` : ''}.`,
  );
  const url = propertyPath(property.id);
  const images = (property.images || []).slice(0, 4).map((src) => ({ url: src, alt: property.title }));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title, description, images },
    twitter: { card: images.length ? 'summary_large_image' : 'summary', title, description, images: images.map((i) => i.url) },
    robots: property.status === 'available' ? undefined : { index: false, follow: true },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl('/favicon.svg'),
    email: siteConfig.supportEmail,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/properties')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function propertyJsonLd(property: Property) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    name: property.title,
    description: property.description,
    url: absoluteUrl(propertyPath(property.id)),
    image: property.images,
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    floorSize: property.area ? { '@type': 'QuantitativeValue', value: property.area, unitCode: 'FTK' } : undefined,
    amenityFeature: (property.amenities || []).map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.location?.address,
      addressLocality: property.location?.city,
      addressRegion: property.location?.state,
      postalCode: property.location?.zip,
      addressCountry: property.location?.country,
    },
    geo:
      property.location?.lat && property.location?.lng
        ? { '@type': 'GeoCoordinates', latitude: Number(property.location.lat), longitude: Number(property.location.lng) }
        : undefined,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: property.currency || 'USD',
      availability: property.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: property.price,
        priceCurrency: property.currency || 'USD',
        unitText: 'MONTH',
      },
    },
  };
}
