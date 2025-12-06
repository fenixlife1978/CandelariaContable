'use client';

import Dashboard from '@/components/dashboard';
import { Header } from '@/components/header';
import { useUser, initiateAnonymousSignIn, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { CompanyProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const companyProfileRef = useMemoFirebase(() => doc(firestore, 'companyProfile', 'main'), [firestore]);
  const { data: companyProfile, isLoading: isProfileLoading } = useDoc<CompanyProfile>(companyProfileRef);

  useEffect(() => {
    if (!user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);


  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl mb-4">Por favor, inicia sesión para continuar</h1>
        <Button onClick={() => initiateAnonymousSignIn(auth)}>Iniciar Sesión Anónimamente</Button>
      </div>
    )
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
