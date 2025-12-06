'use client';

import Dashboard from '@/components/dashboard';
import { Header } from '@/components/header';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useEffect } from 'react';
import { CompanyProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const companyProfileRef = useMemoFirebase(() => doc(firestore, 'companyProfile', 'main'), [firestore]);
  const { data: companyProfile, isLoading: isProfileLoading } = useDoc<CompanyProfile>(companyProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isProfileLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header companyProfile={companyProfile} />
      <main className="flex-1">
        <Dashboard companyProfile={companyProfile} />
      </main>
    </div>
  );
}
