import { Banknote } from 'lucide-react';
import Image from 'next/image';
import { CompanyProfile } from '@/lib/types';

type HeaderProps = {
  companyProfile: CompanyProfile | null;
}

export function Header({ companyProfile }: HeaderProps) {
  return (
    <header className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
              {companyProfile?.logo ? (
                <Image src={companyProfile.logo} alt="Logo" width={40} height={40} className="object-cover" />
              ) : (
                <Banknote className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground font-headline">
              {companyProfile?.name || 'Contabilidad LoanStar'}
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
