import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase/server";
import { Property } from "@/types";

const URL = "https://your-domain.com"; // TODO: Replace with your actual domain

function generateSitemap(properties: Property[], staticPages: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     ${staticPages
      .map((page) => {
        return `
           <url>
               <loc>${`${URL}${page}`}</loc>
               <priority>${page === '/' ? '1.0' : '0.8'}</priority>
           </url>
         `;
      })
      .join("")}
     ${properties
      .map(({ id }) => {
        return `
           <url>
               <loc>${`${URL}/student/properties/${id}`}</loc>
               <priority>0.9</priority>
           </url>
         `;
      })
      .join("")}
   </urlset>
 `;
}

export async function GET() {
  if (!firestore) {
    return new Response('Firestore not initialized', { status: 500 });
  }

  const staticPages = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/privacy',
    '/terms',
    '/student/properties'
  ];

  const propertiesRef = collection(firestore, 'properties');
  const propertiesSnapshot = await getDocs(propertiesRef);
  const properties = propertiesSnapshot.docs.map((doc: any) => doc.data() as Property);

  const body = generateSitemap(properties, staticPages);

  return new Response(body, {
    status: 200,
    headers: {
      "Cache-control": "public, s-maxage=86400, stale-while-revalidate",
      "content-type": "application/xml",
    },
  });
}

