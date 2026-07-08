import { BottomNav } from '@/components/ui/BottomNav';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <div className="flex h-full flex-col bg-background text-primary">
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
