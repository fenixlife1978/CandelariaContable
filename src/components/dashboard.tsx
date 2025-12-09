'use client';

import { useMemo, useEffect } from 'react';
import type { Transaction, CompanyProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Scale, Settings, Search, DollarSign, BookCopy } from 'lucide-react';
import { TransactionForm } from './transaction-form';
import { TransactionsTable } from './transactions-table';
import { AiSummaryModal } from './ai-summary-modal';
import type { Income, Expense, MonthlyClosure } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { Reports } from './reports';
import { Configuration } from './configuration';
import Decimal from 'decimal.js';
import { getAuth } from 'firebase/auth';
import { TransactionQuery } from './transaction-query';
import { ConsolidatedReport } from './consolidated-report';

type DashboardProps = {
  companyProfile: CompanyProfile | null;
}

export default function Dashboard({ companyProfile }: DashboardProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      // Forzar refresco del token para obtener los claims nuevos
      user.getIdToken(true).then((token) => {
        console.log("Nuevo token con claims:", token);
      });

      user.getIdTokenResult(true).then((idTokenResult) => {
        console.log("Claims:", idTokenResult.claims);
        if (idTokenResult.claims.admin) {
          console.log("✅ Usuario es admin");
        } else {
          console.log("❌ Usuario NO es admin");
        }
      });
    }
  }, [user]);

  const incomesCollection = useMemoFirebase(() => collection(firestore, 'incomes'), [firestore]);
  const expensesCollection = useMemoFirebase(() => collection(firestore, 'expenses'), [firestore]);
  const monthlyClosuresCollection = useMemoFirebase(() => collection(firestore, 'monthlyClosures'), [firestore]);
  
  const { data: incomesData, isLoading: incomesLoading } = useCollection<Income>(incomesCollection);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Expense>(expensesCollection);
  const { data: monthlyClosuresData, isLoading: monthlyClosuresLoading } = useCollection<MonthlyClosure>(monthlyClosuresCollection);

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


  const { totalIncome, totalExpenses, capital, divisasFlow } = useMemo(() => {
    const totalIncomeValue = (incomesData || []).reduce(
        (sum, t) => sum.plus(new Decimal(t.amount)),
        new Decimal(0)
    );

    const totalExpensesValue = (expensesData || []).reduce(
        (sum, t) => sum.plus(new Decimal(t.amount)),
        new Decimal(0)
    );
    
    const calculateCategoryBalance = (categoryName: string) => {
      return transactions
        .filter(t => t.category === categoryName)
        .reduce((sum, t) => {
          const amount = new Decimal(t.amount);
          return t.type === 'income' ? sum.plus(amount) : sum.minus(amount);
        }, new Decimal(0));
    };

    const compraDivisasBalance = calculateCategoryBalance('Compra de Divisas');
    const gastosDivisasBalance = calculateCategoryBalance('Gastos de Divisas');

    const divisasFlowValue = compraDivisasBalance.plus(gastosDivisasBalance);

    const capitalValue = totalIncomeValue.minus(totalExpensesValue);

    return {
      totalIncome: totalIncomeValue.toNumber(),
      totalExpenses: totalExpensesValue.toNumber(),
      capital: capitalValue.toNumber(),
      divisasFlow: divisasFlowValue.toNumber(),
    };
}, [incomesData, expensesData, transactions]);
  
  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
    const data = {
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date.toISOString(),
    };
    if (transaction.type === 'income') {
      addDocumentNonBlocking(incomesCollection, data);
    } else {
      addDocumentNonBlocking(expensesCollection, data);
    }
  };

  const updateTransaction = (transaction: Transaction) => {
    const { id, type, ...dataToUpdate } = transaction;
    const data = {
        ...dataToUpdate,
        date: transaction.date.toISOString()
    };
    if (type === 'income') {
        updateDocumentNonBlocking(doc(firestore, 'incomes', id), data);
    } else {
        updateDocumentNonBlocking(doc(firestore, 'expenses', id), data);
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  const incomesForSummary: Income[] = useMemo(() => incomesData?.map(i => ({ ...i, id: i.id })) || [], [incomesData]);
  const expensesForSummary: Expense[] = useMemo(() => expensesData?.map(e => ({ ...e, id: e.id })) || [], [expensesData]);

  const isLoading = incomesLoading || expensesLoading || monthlyClosuresLoading;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Panel de Control</h2>
        <AiSummaryModal incomes={incomesForSummary} expenses={expensesForSummary} capital={capital} companyProfile={companyProfile} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Egresos Totales</CardTitle>
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
        <Card className="bg-accent text-accent-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flujo de Divisas</CardTitle>
                <DollarSign className="h-4 w-4 text-accent-foreground/70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(divisasFlow)}</div>
                <p className="text-xs text-accent-foreground/70">Balance de la categoría Divisas</p>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="overflow-x-auto whitespace-nowrap h-auto justify-start">
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="query">
            <Search className="mr-2 h-4 w-4" />
            Consultas
          </TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="consolidated-report">
            <BookCopy className="mr-2 h-4 w-4" />
            Reporte Consolidado
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <TransactionForm onSubmit={addTransaction} />
            </div>
            <div className="lg:col-span-2">
              <TransactionsTable transactions={transactions} onDelete={deleteTransaction} onUpdate={updateTransaction} formatCurrency={formatCurrency} isLoading={isLoading} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="query" className="mt-6">
          <TransactionQuery
            allTransactions={transactions}
            onDelete={deleteTransaction}
            onUpdate={updateTransaction}
            formatCurrency={formatCurrency}
            isLoading={isLoading}
            companyProfile={companyProfile}
          />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <Reports 
            allTransactions={transactions} 
            monthlyClosures={monthlyClosuresData || []}
            formatCurrency={formatCurrency} 
            isLoading={isLoading} 
            companyProfile={companyProfile}
          />
        </TabsContent>
        <TabsContent value="consolidated-report" className="mt-6">
          <ConsolidatedReport
            allTransactions={transactions}
            monthlyClosures={monthlyClosuresData || []}
            formatCurrency={formatCurrency}
            companyProfile={companyProfile}
          />
        </TabsContent>
        <TabsContent value="configuration" className="mt-6">
          <Configuration companyProfile={companyProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
