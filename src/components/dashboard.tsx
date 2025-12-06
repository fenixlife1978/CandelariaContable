'use client';

import { useState, useMemo } from 'react';
import type { Transaction } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { TransactionForm } from './transaction-form';
import { TransactionsTable } from './transactions-table';
import { AiSummaryModal } from './ai-summary-modal';
import type { Income, Expense } from '@/lib/types';

const initialTransactions: Transaction[] = [
  { id: '1', type: 'income', amount: 2000, description: 'Loan payment from John D.', date: new Date('2024-05-15') },
  { id: '2', type: 'income', amount: 1500, description: 'Loan payment from Jane S.', date: new Date('2024-05-20') },
  { id: '3', type: 'expense', amount: 300, description: 'Office supplies', date: new Date('2024-05-18') },
  { id: '4', type: 'expense', amount: 50, description: 'Bank fees', date: new Date('2024-05-22') },
  { id: '5', type: 'income', amount: 500, description: 'Interest income', date: new Date('2024-05-25') },
];

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions.sort((a,b) => b.date.getTime() - a.date.getTime()));

  const { totalIncome, totalExpenses, capital } = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const capital = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, capital };
  }, [transactions]);
  
  const incomes: Income[] = useMemo(() => transactions
    .filter(t => t.type === 'income')
    .map(t => ({ date: t.date.toISOString().split('T')[0], amount: t.amount, description: t.description })), [transactions]);

  const expenses: Expense[] = useMemo(() => transactions
    .filter(t => t.type === 'expense')
    .map(t => ({ date: t.date.toISOString().split('T')[0], amount: t.amount, description: t.description })), [transactions]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...transaction, id: crypto.randomUUID() }].sort((a,b) => b.date.getTime() - a.date.getTime()));
  };
  
  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h2>
        <AiSummaryModal incomes={incomes} expenses={expenses} capital={capital} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">from {incomes.length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">from {expenses.length} transactions</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital</CardTitle>
            <Scale className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(capital)}</div>
            <p className="text-xs text-primary-foreground/70">Net cash flow</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <TransactionForm onSubmit={addTransaction} />
        </div>
        <div className="lg:col-span-2">
          <TransactionsTable transactions={transactions} onDelete={deleteTransaction} formatCurrency={formatCurrency}/>
        </div>
      </div>
    </div>
  );
}
