import { GuardForm } from '@/components/guard-form';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="container mx-auto">
        <GuardForm />
      </div>
    </main>
  );
}
