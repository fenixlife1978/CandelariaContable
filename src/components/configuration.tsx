'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CompanyProfile } from '@/lib/types';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Save, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional().or(z.literal('')),
  rif: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Correo electrónico no válido').optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
});

type ConfigurationProps = {
  companyProfile: CompanyProfile | null;
};

export function Configuration({ companyProfile }: ConfigurationProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const companyProfileRef = useMemoFirebase(() => doc(firestore, 'companyProfile', 'main'), [firestore]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(companyProfile?.logo || null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: companyProfile?.name || '',
      rif: companyProfile?.rif || '',
      address: companyProfile?.address || '',
      phone: companyProfile?.phone || '',
      email: companyProfile?.email || '',
      logo: companyProfile?.logo || '',
    },
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue('logo', base64String);
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    try {
      setDocumentNonBlocking(companyProfileRef, values, { merge: true });
      toast({
        title: 'Configuración Guardada',
        description: 'La información de la empresa ha sido actualizada.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la configuración.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Configuración de la Empresa</CardTitle>
        <CardDescription>
          Administra la información de tu empresa que aparecerá en los reportes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4">
                   <FormField
                    control={form.control}
                    name="logo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Logo de la Empresa</FormLabel>
                            <FormControl>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                                        {logoPreview ? (
                                            <Image src={logoPreview} alt="Vista previa del logo" width={128} height={128} className="object-cover" />
                                        ) : (
                                            <Upload className="w-12 h-12 text-muted-foreground" />
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir Logo
                                    </Button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                        <FormLabel>Nombre de la Empresa</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej. LoanStar C.A." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="rif"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>RIF</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej. J-12345678-9" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej. 0414-1234567" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej. contacto@loanstar.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej. Av. Principal, Edificio Centro, Piso 1" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
