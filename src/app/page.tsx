'use client';

import Dashboard from '@/components/dashboard';
import { Header } from '@/components/header';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useEffect } from 'react';
import { CompanyProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Only create the document reference if the user is authenticated
  const companyProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'companyProfile', 'main') : null),
    [firestore, user]
  );
  const { data: companyProfile, isLoading: isProfileLoading } = useDoc<CompanyProfile>(companyProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, isUserLoading, router]);

  // The loading condition now checks for isUserLoading first, and then isProfileLoading only if there's a user.
  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // If there's no user after loading, the useEffect will redirect, but we can return null or a loader to prevent rendering the main content.
  if (!user) {
    return (
       <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Redirigiendo...</div>
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
