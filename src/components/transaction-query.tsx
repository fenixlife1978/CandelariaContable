'use client';

import { useState, useMemo } from 'react';
import { format, getMonth, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionsTable } from './transactions-table';
import type { Transaction } from '@/lib/types';
import { Search } from 'lucide-react';

type TransactionQueryProps = {
  allTransactions: Transaction[];
  onDelete: (id: string, type: 'income' | 'expense') => void;
  onUpdate: (transaction: Transaction) => void;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
};

export function TransactionQuery({ allTransactions, onDelete, onUpdate, formatCurrency, isLoading }: TransactionQueryProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(today));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(today));

  const years = useMemo(() => {
    if (!allTransactions.length) return [getYear(today)];
    const transactionYears = allTransactions.map(t => getYear(t.date));
    const uniqueYears = [...new Set(transactionYears)];
    return uniqueYears.sort((a, b) => b - a);
  }, [allTransactions]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i, 1), 'LLLL', { locale: es }),
  }));

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(transaction =>
      getMonth(transaction.date) === selectedMonth &&
      getYear(transaction.date) === selectedYear
    );
  }, [allTransactions, selectedMonth, selectedYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Search className="h-6 w-6" />
            Consulta de Transacciones
        </CardTitle>
        <CardDescription>
          Filtra y busca transacciones por período.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select
              value={String(selectedMonth)}
              onValueChange={value => setSelectedMonth(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select
              value={String(selectedYear)}
              onValueChange={value => setSelectedYear(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
            <TransactionsTable 
                transactions={filteredTransactions} 
                onDelete={onDelete} 
                onUpdate={onUpdate}
                formatCurrency={formatCurrency}
                isLoading={isLoading}
                isEmbedded={true}
            />
        </div>
      </CardContent>
    </Card>
  );
}
