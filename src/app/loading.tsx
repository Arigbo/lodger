import Logo from '@/components/logo';

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="animate-in fade-in slide-in-from-left-24 duration-1000">
        <Logo className="h-16 w-16" />
      </div>
    </div>
  );
}
