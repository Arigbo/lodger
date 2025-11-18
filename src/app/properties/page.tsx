
'use client';

import { notFound } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page is deprecated. Redirecting to the student properties search.
export default function DeprecatedPropertiesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/student/properties');
  }, [router]);

  return notFound();
}
