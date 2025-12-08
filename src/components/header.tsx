import { Banknote, LogOut } from 'lucide-react';
import Image from 'next/image';
import { CompanyProfile } from '@/lib/types';
import { Button } from './ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

type HeaderProps = {
  companyProfile: CompanyProfile | null;
}

export function Header({ companyProfile }: HeaderProps) {
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

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
            <h1 className="text-lg sm:text-2xl font-bold text-foreground font-headline truncate">
              {companyProfile?.name || 'Contabilidad LoanStar'}
            </h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut} size="sm" className="whitespace-nowrap">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </header>
  );
}
