"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { ArrowLeft, Check, CheckCheck, Clock, Flag, MessageSquare, Search, SendHorizontal } from "lucide-react";
import { addDoc, collection, doc, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { EmptyState, PageSkeleton } from "@/components/dashboard";
import { ReportUserDialog } from "@/components/shared/report-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useAsyncResult } from "@/hooks/use-async-result";
import { useToast } from "@/hooks/use-toast";
import { toMillis } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { fetchDocsByIds } from "@/lib/firestore-batch";
import { sendNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { Message, Property, UserProfile } from "@/types";

type Role = "student" | "landlord";

const SYSTEM_ID = "SYSTEM_MODERATION";
const SYSTEM_USER = {
  id: SYSTEM_ID,
  name: "Lodger Moderation",
  email: "moderation@lodger.com",
  role: "admin",
  profileImageUrl: "/favicon.svg",
} as UserProfile;

type Conversation = {
  id: string;
  person: UserProfile;
  last: Message | null;
  unread: number;
};

function Person({ person, className }: { person: UserProfile; className?: string }) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      <AvatarImage src={person.profileImageUrl} alt="" className="object-cover" />
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">{person.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM");
}

/**
 * Two-pane messaging inbox shared by students and landlords. The open
 * conversation lives in the URL (?conversationId= or ?contact=) so any page
 * can deep-link into a thread.
 */
export function Inbox({ role }: { role: Role }) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const selectedId = searchParams.get("conversationId") ?? searchParams.get("contact");

  // All messages I'm part of, live.
  const messagesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, "messages"), where("participantIds", "array-contains", user.uid)) : null),
    [user, firestore],
  );
  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);

  // People you can always message: your landlord (students) or your tenants (landlords).
  const relationsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, "properties"), where(role === "student" ? "currentTenantId" : "landlordId", "==", user.uid))
        : null,
    [user, firestore, role],
  );
  const { data: relatedProperties } = useCollection<Property>(relationsQuery);

  const otherIds = useMemo(() => {
    const ids = new Set<string>();
    messages?.forEach((m) => m.participantIds.forEach((id) => id !== user?.uid && ids.add(id)));
    relatedProperties?.forEach((p) => {
      const id = role === "student" ? p.landlordId : p.currentTenantId;
      if (id) ids.add(id);
    });
    if (selectedId) ids.add(selectedId);
    ids.delete(SYSTEM_ID);
    return [...ids].sort().join(",");
  }, [messages, relatedProperties, selectedId, user?.uid, role]);

  const { data: people, isLoading: peopleLoading } = useAsyncResult(
    otherIds || null,
    (key) => fetchDocsByIds<UserProfile>(firestore, "users", key.split(",")),
    { keepPrevious: true },
  );

  const conversations = useMemo<Conversation[]>(() => {
    if (!user) return [];
    const map = new Map<string, Conversation>();
    const personFor = (id: string) => (id === SYSTEM_ID ? SYSTEM_USER : people?.get(id));

    for (const message of messages ?? []) {
      const otherId = message.participantIds.find((id) => id !== user.uid);
      const person = otherId && personFor(otherId);
      if (!otherId || !person) continue;
      const convo = map.get(otherId) ?? { id: otherId, person, last: null, unread: 0 };
      if (!convo.last || toMillis(message.timestamp) >= toMillis(convo.last.timestamp)) convo.last = message;
      if (!message.read && message.senderId !== user.uid) convo.unread += 1;
      map.set(otherId, convo);
    }
    for (const id of otherIds.split(",").filter(Boolean)) {
      const person = personFor(id);
      if (person && !map.has(id)) map.set(id, { id, person, last: null, unread: 0 });
    }
    return [...map.values()].sort((a, b) => toMillis(b.last?.timestamp) - toMillis(a.last?.timestamp));
  }, [messages, people, otherIds, user]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const thread = useMemo(
    () =>
      selectedId
        ? (messages ?? [])
            .filter((m) => m.participantIds.includes(selectedId))
            .sort((a, b) => (toMillis(a.timestamp) || Infinity) - (toMillis(b.timestamp) || Infinity))
        : [],
    [messages, selectedId],
  );

  // Mark incoming messages as read while the thread is open.
  useEffect(() => {
    if (!user || !selectedId) return;
    const unread = thread.filter((m) => !m.read && m.senderId === selectedId);
    if (!unread.length) return;
    const batch = writeBatch(firestore);
    unread.forEach((m) => batch.update(doc(firestore, "messages", m.id), { read: true }));
    batch.commit().catch((error) => console.error("Could not mark messages as read:", error));
  }, [thread, selectedId, user, firestore]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, selectedId]);

  const open = (id: string | null) => router.replace(id ? `${pathname}?conversationId=${id}` : pathname, { scroll: false });

  const send = async () => {
    const text = draft.trim();
    if (!text || !user || !selected || selected.id === SYSTEM_ID) return;
    setDraft("");
    try {
      await addDoc(collection(firestore, "messages"), {
        text,
        senderId: user.uid,
        recipientId: selected.id,
        participantIds: [user.uid, selected.id].sort(),
        timestamp: serverTimestamp(),
        read: false,
      });
      const otherRole = role === "student" ? "landlord" : "student";
      void sendNotification({
        toUserId: selected.id,
        type: "NEW_MESSAGE",
        firestore,
        senderName: profile?.name || user.displayName || "Someone",
        customMessage: text.length > 120 ? `${text.slice(0, 117)}…` : text,
        link: `/${otherRole}/messages?conversationId=${user.uid}`,
      });
    } catch (error) {
      setDraft(text);
      toast({ variant: "destructive", title: "Message not sent", description: getErrorMessage(error, "Please try again.") });
    }
  };

  if (messagesLoading || (peopleLoading && !people)) return <PageSkeleton variant="list" />;

  const term = search.trim().toLowerCase();
  const visible = conversations.filter((c) => !term || c.person.name?.toLowerCase().includes(term));
  const lastMineId = [...thread].reverse().find((m) => m.senderId === user?.uid)?.id;

  return (
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-[420px] overflow-hidden rounded-2xl border bg-card shadow-sm md:h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-9rem)]">
      {/* Conversation list */}
      <aside className={cn("flex w-full flex-col border-r md:w-80 lg:w-96", selected && "hidden md:flex")} aria-label="Conversations">
        <div className="space-y-3 border-b p-4">
          <h1 className="font-headline text-xl font-bold">Messages</h1>
          <div className="relative">
            <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              aria-label="Search conversations"
              className="h-9 rounded-xl bg-muted/50 pl-9"
            />
          </div>
        </div>
        {visible.length === 0 ? (
          <EmptyState
            className="m-4 border-none bg-transparent"
            icon={MessageSquare}
            title={conversations.length ? "No matches" : "No conversations yet"}
            description={
              conversations.length
                ? undefined
                : role === "student"
                  ? "Use “Message host” on any listing to ask a landlord a question."
                  : "Message students from their rental request, or tenants from the Tenants page."
            }
          />
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {visible.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  aria-current={c.id === selectedId ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                    c.id === selectedId && "bg-primary/5",
                  )}
                >
                  <Person person={c.person} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.person.name}</span>
                      {c.last?.timestamp && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatDistanceToNowStrict(c.last.timestamp.toDate(), { addSuffix: false })}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-xs", c.unread ? "text-foreground" : "text-muted-foreground")}>
                        {c.last ? `${c.last.senderId === user?.uid ? "You: " : ""}${c.last.text}` : "Start a conversation"}
                      </span>
                      {c.unread > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Thread */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !selected && "hidden md:flex")} aria-label="Conversation">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState className="border-none bg-transparent" icon={MessageSquare} title="Select a conversation" description="Choose someone from the list to read and reply." />
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <Button variant="ghost" size="icon" className="-ml-2 md:hidden" onClick={() => open(null)} aria-label="Back to conversations">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Person person={selected.person} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{selected.person.name}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {selected.id === SYSTEM_ID ? "Automated notices" : selected.person.role}
                </p>
              </div>
              {role === "landlord" && selected.person.role === "student" && (
                <Button asChild variant="ghost" size="sm" className="hidden rounded-lg sm:inline-flex">
                  <Link href={`/landlord/tenants/${selected.id}`}>View profile</Link>
                </Button>
              )}
              {selected.id !== SYSTEM_ID && (
                <Button variant="ghost" size="icon" onClick={() => setReportOpen(true)} aria-label={`Report ${selected.person.name}`}>
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </header>

            <div className="flex-1 space-y-1 overflow-y-auto bg-muted/30 px-4 py-5" aria-live="polite">
              {thread.length === 0 && (
                <p className="mx-auto mt-10 max-w-xs text-center text-sm text-muted-foreground">
                  Say hello to {selected.person.name?.split(" ")[0]}. Messages are private between the two of you.
                </p>
              )}
              {thread.map((m, i) => {
                const mine = m.senderId === user?.uid;
                const date = m.timestamp?.toDate();
                const prevDate = thread[i - 1]?.timestamp?.toDate();
                const newDay = date && (!prevDate || prevDate.toDateString() !== date.toDateString());
                const grouped = i > 0 && thread[i - 1].senderId === m.senderId && !newDay;
                return (
                  <div key={m.id}>
                    {newDay && (
                      <p className="my-4 text-center text-xs font-medium text-muted-foreground">{dayLabel(date)}</p>
                    )}
                    <div className={cn("flex", mine ? "justify-end" : "justify-start", !grouped && "mt-3")}>
                      <div
                        className={cn(
                          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                          mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card",
                        )}
                      >
                        {m.text}
                        <span className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {date ? format(date, "HH:mm") : "Sending"}
                          {mine &&
                            (!m.timestamp ? (
                              <Clock aria-label="Sending" className="h-3 w-3" />
                            ) : m.read ? (
                              <CheckCheck aria-label="Seen" className="h-3 w-3" />
                            ) : (
                              <Check aria-label="Sent" className="h-3 w-3" />
                            ))}
                        </span>
                      </div>
                    </div>
                    {mine && m.id === lastMineId && m.read && <p className="mt-1 text-right text-[11px] text-muted-foreground">Seen</p>}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {selected.id === SYSTEM_ID ? (
              <p className="border-t px-4 py-3 text-center text-xs text-muted-foreground">You can't reply to automated notices.</p>
            ) : (
              <form
                className="flex items-end gap-2 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label htmlFor="message-draft" className="sr-only">
                  Message {selected.person.name}
                </label>
                <Textarea
                  id="message-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  placeholder="Write a message…"
                  className="max-h-40 min-h-10 flex-1 resize-none rounded-xl"
                />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={!draft.trim()} aria-label="Send message">
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </form>
            )}

            <ReportUserDialog
              isOpen={reportOpen}
              onClose={() => setReportOpen(false)}
              reportedUserId={selected.id}
              reportedUserName={selected.person.name}
            />
          </>
        )}
      </section>
    </div>
  );
}
