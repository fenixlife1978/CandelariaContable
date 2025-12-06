'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useAuth,
  initiateEmailSignIn,
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Banknote } from 'lucide-react';
import { CompanyProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

const formSchema = z.object({
  email: z.string().email({
    message: 'Por favor, introduce una dirección de correo válida.',
  }),
  password: z.string().min(6, {
    message: 'La contraseña debe tener al menos 6 caracteres.',
  }),
});

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'companyProfile', 'main') : null),
    [firestore]
  );
  const { data: companyProfile, isLoading: isProfileLoading } =
    useDoc<CompanyProfile>(companyProfileRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await initiateEmailSignIn(auth, values.email, values.password);

      // 🔥 Refrescar token y verificar claims inmediatamente después del login
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idTokenResult = await currentUser.getIdTokenResult(true); // fuerza refresco
        console.log('Claims:', idTokenResult.claims);

        if (idTokenResult.claims.admin) {
          console.log('✅ Usuario es admin');
          // El useEffect manejará la redirección
        } else {
          console.log('❌ Usuario NO es admin');
          toast({
            variant: 'destructive',
            title: 'Acceso restringido',
            description:
              'Tu cuenta no tiene permisos de administrador. Contacta al administrador del sistema.',
          });
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error: any) {
      let errorMessage = 'Ocurrió un error inesperado.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        errorMessage = 'Correo electrónico o contraseña incorrectos.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description: errorMessage,
      });
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || user || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden">
          {companyProfile?.logo ? (
            <Image
              src={companyProfile.logo}
              alt="Logo de la empresa"
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <Banknote className="h-7 w-7 text-primary-foreground" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground font-headline text-center">
          Contabilidad Asoc. Coop. Trans. La Candelaria
        </h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">
            Inicio de Sesión de Administrador
          </CardTitle>
          <CardDescription>
            Introduce tus credenciales para acceder al panel de control.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="admin@ejemplo.com"
                        {...field}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
