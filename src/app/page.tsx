'use client';

import Dashboard from '@/components/dashboard';
import { Header } from '@/components/header';
import { useUser, initiateAnonymousSignIn, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    if (!user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);


  if (isUserLoading) {
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
      <Header />
      <main className="flex-1">
        <Dashboard />
      </main>
    </div>
  );
}
