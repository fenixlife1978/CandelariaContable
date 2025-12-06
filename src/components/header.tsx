import { Banknote } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Banknote className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground font-headline">
              LoanStar Accounting
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
