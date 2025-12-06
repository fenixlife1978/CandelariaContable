'use client';

import { useMemo } from 'react';
import type { Transaction } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { TransactionForm } from './transaction-form';
import { TransactionsTable } from './transactions-table';
import { AiSummaryModal } from './ai-summary-modal';
import type { Income, Expense } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { Reports } from './reports';

export default function Dashboard() {
  const firestore = useFirestore();

  const incomesCollection = useMemoFirebase(() => collection(firestore, 'incomes'), [firestore]);
  const expensesCollection = useMemoFirebase(() => collection(firestore, 'expenses'), [firestore]);
  
  const { data: incomesData, isLoading: incomesLoading } = useCollection<Income>(incomesCollection);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Expense>(expensesCollection);

  const transactions: Transaction[] = useMemo(() => {
    const combined: Transaction[] = [];
    if (incomesData) {
      combined.push(...incomesData.map(i => ({...i, type: 'income', date: new Date(i.date) } as Transaction)));
    }
    if (expensesData) {
      combined.push(...expensesData.map(e => ({...e, type: 'expense', date: new Date(e.date) } as Transaction)));
    }
    return combined.sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [incomesData, expensesData]);


  const { totalIncome, totalExpenses, capital } = useMemo(() => {
    const totalIncome = incomesData?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalExpenses = expensesData?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const capital = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, capital };
  }, [incomesData, expensesData]);
  
  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
    const data = {
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date.toISOString(),
    };
    if (transaction.type === 'income') {
      addDocumentNonBlocking(incomesCollection, data);
    } else {
      addDocumentNonBlocking(expensesCollection, data);
    }
  };
  
  const deleteTransaction = (id: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      deleteDocumentNonBlocking(doc(firestore, 'incomes', id));
    } else {
      deleteDocumentNonBlocking(doc(firestore, 'expenses', id));
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const incomesForSummary: Income[] = useMemo(() => incomesData?.map(i => ({ date: i.date, amount: i.amount, description: i.description, id: i.id })) || [], [incomesData]);
  const expensesForSummary: Expense[] = useMemo(() => expensesData?.map(e => ({ date: e.date, amount: e.amount, description: e.description, id: e.id })) || [], [expensesData]);

  const isLoading = incomesLoading || expensesLoading;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Panel de Control</h2>
        <AiSummaryModal incomes={incomesForSummary} expenses={expensesForSummary} capital={capital} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">de {incomesData?.length || 0} transacciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">de {expensesData?.length || 0} transacciones</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital</CardTitle>
            <Scale className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(capital)}</div>
            <p className="text-xs text-primary-foreground/70">Flujo de caja neto</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <TransactionForm onSubmit={addTransaction} />
            </div>
            <div className="lg:col-span-2">
              <TransactionsTable transactions={transactions} onDelete={deleteTransaction} formatCurrency={formatCurrency} isLoading={isLoading} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <Reports 
            allTransactions={transactions} 
            formatCurrency={formatCurrency} 
            isLoading={isLoading} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
