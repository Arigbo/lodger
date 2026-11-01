import { Suspense } from "react";
import { PageSkeleton } from "@/components/dashboard";
import { Inbox } from "@/components/messages/inbox";

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <Inbox role="landlord" />
    </Suspense>
  );
}
