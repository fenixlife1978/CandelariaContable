'use client';

import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, getMonth, getYear, getDate, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Transaction } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const transactionCategories = [
  "Fiscalía",
  "Capital Recuperado",
  "Intereses Ganados",
  "Préstamos Socios",
  "Prestamos Candelaria",
  "Capital Inicial",
  "Compra de Divisas",
  "Gastos de Divisas",
  "Egresos Extraordinarios",
  "Otros Egresos",
];

const presetDescriptions = [
  "Ingreso por Fiscalía",
  "Abono o Recuperación de Capital",
  "Intereses Cobrados",
  "Prestamos del Mes / Socios",
  "Prestamos Candelaria",
  "Compra de Divisas",
  "Gastos de Divisas",
];

const formSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor que 0'),
  description: z
    .string()
    .min(2, 'La descripción debe tener al menos 2 caracteres')
    .max(100),
  category: z.string().min(1, "Debes seleccionar una categoría"),
  day: z.coerce.number().int().min(1).max(31),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2023).max(new Date().getFullYear() + 1),
}).refine(data => {
    const daysInMonth = getDaysInMonth(new Date(data.year, data.month - 1));
    return data.day <= daysInMonth;
}, {
    message: "El día no es válido para el mes seleccionado",
    path: ["day"],
});

function DaySelector({ control, year, month }: { control: any, year: number, month: number }) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
      <FormField
        control={control}
        name="day"
        render={({ field }) => (
          <FormItem>
            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Día" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
  )
}

type EditTransactionModalProps = {
  transaction: Transaction;
  onUpdate: (transaction: Transaction) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function EditTransactionModal({ transaction, onUpdate, isOpen, onClose }: EditTransactionModalProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      day: getDate(transaction.date),
      month: getMonth(transaction.date) + 1,
      year: getYear(transaction.date),
    },
  });

  const watchedYear = useWatch({ control: form.control, name: 'year' });
  const watchedMonth = useWatch({ control: form.control, name: 'month' });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const date = new Date(values.year, values.month - 1, values.day);
    onUpdate({
        ...transaction,
        type: values.type,
        amount: values.amount,
        description: values.description,
        category: values.category,
        date: date
    });
    onClose();
  };

  const handlePresetSelect = (value: string) => {
    form.setValue('description', value, { shouldValidate: true });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2023 + 2 }, (_, i) => 2023 + i).reverse();
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2000, i, 1), 'MMMM', { locale: es }) }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Transacción</DialogTitle>
                <DialogDescription>
                    Actualiza los detalles de tu transacción.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="space-y-6"
                >
                    <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Tipo</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="income" />
                                </FormControl>
                                <FormLabel className="font-normal">Ingreso</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="expense" />
                                </FormControl>
                                <FormLabel className="font-normal">Egreso</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                            <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            value={field.value ?? ''}
                            step="0.01"
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    <div className='space-y-2'>
                        <FormLabel>Concepto / Descripción</FormLabel>
                        <Select onValueChange={handlePresetSelect}>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona un concepto predeterminado" />
                            </SelectTrigger>
                            <SelectContent>
                            {presetDescriptions.map(desc => (
                                <SelectItem key={desc} value={desc}>{desc}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                <Input placeholder="o escribe una descripción personalizada" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>


                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {transactionCategories.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                        <DaySelector control={form.control} year={watchedYear} month={watchedMonth} />
                        <FormField
                        control={form.control}
                        name="month"
                        render={({ field }) => (
                            <FormItem>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {months.map((month) => (
                                    <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                            <FormItem>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Año" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormMessage>{form.formState.errors.day?.message}</FormMessage>
                    </FormItem>
                    
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Actualizar Transacción
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}
