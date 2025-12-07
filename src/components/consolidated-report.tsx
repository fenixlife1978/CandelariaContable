'use client';

import { useState, useMemo } from 'react';
import { format, getYear, getMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Decimal from 'decimal.js';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Transaction, MonthlyClosure } from '@/lib/types';
import { cn } from '@/lib/utils';

type ConsolidatedReportProps = {
  allTransactions: Transaction[];
  monthlyClosures: MonthlyClosure[];
  formatCurrency: (amount: number) => string;
};

const CATEGORY_COLUMNS: (keyof typeof reportData.categoryTotals)[] = [
  "Fiscalía",
  "Capital Recuperado",
  "Intereses Ganados",
  "Préstamos Candelaria",
  "Préstamos Socios",
  "Divisas",
];

export function ConsolidatedReport({
  allTransactions,
  monthlyClosures,
  formatCurrency,
}: ConsolidatedReportProps) {
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));

  const years = useMemo(() => {
    const transactionYears = allTransactions.map((t) => getYear(t.date));
    const closureYears = monthlyClosures.map((c) => c.year);
    const allYears = [...transactionYears, ...closureYears, getYear(new Date())];
    return [...new Set(allYears)].sort((a, b) => b - a);
  }, [allTransactions, monthlyClosures]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(selectedYear, i, 1), 'LLLL', { locale: es }),
    }));
  }, [selectedYear]);

  const getPreviousMonthFinalBalance = useMemo(() => {
    // Memoize the function itself for recursive calls
    const calculateBalance = (month: number, year: number): Decimal => {
      const previousMonthDate = subMonths(new Date(year, month), 1);
      const prevYear = getYear(previousMonthDate);
      const prevMonth = getMonth(previousMonthDate);

      // 1. Check for an existing closure for the previous month
      const closure = monthlyClosures.find(c => c.year === prevYear && c.month === prevMonth && c.status === 'closed');
      if (closure) {
        return new Decimal(closure.finalBalance);
      }

      // Base case: if we go back before any data exists.
      const firstTransactionYear = Math.min(...allTransactions.map(t => getYear(t.date)), new Date().getFullYear());
      if (year < firstTransactionYear || (year === firstTransactionYear && month === 0)) {
         return new Decimal(0);
      }
      
      // 2. If no closure, calculate the balance recursively
      const initialBalanceForPrevMonth = calculateBalance(prevMonth, prevYear);
      
      const transactionsForPrevMonth = allTransactions.filter(t => 
        getYear(t.date) === prevYear && getMonth(t.date) === prevMonth
      );
      
      const sortedTransactions = [...transactionsForPrevMonth].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));

      const finalBalanceForPrevMonth = sortedTransactions.reduce((balance, t) => {
          const amount = new Decimal(t.amount);
          return t.type === 'income' ? balance.plus(amount) : balance.minus(amount);
      }, initialBalanceForPrevMonth);

      return finalBalanceForPrevMonth;
    };
    return calculateBalance;
  }, [monthlyClosures, allTransactions]);


  const reportData = useMemo(() => {
    return months.map(month => {
      const monthIndex = month.value;
      const closure = monthlyClosures.find(c => c.year === selectedYear && c.month === monthIndex && c.status === 'closed');
      
      const initialBalance = getPreviousMonthFinalBalance(monthIndex, selectedYear);

      let finalBalance: Decimal;
      const categoryTotals: Record<string, Decimal> = {};
      CATEGORY_COLUMNS.forEach(cat => categoryTotals[cat] = new Decimal(0));

      if (closure) {
        finalBalance = new Decimal(closure.finalBalance);
        Object.entries(closure.categoryTotals).forEach(([category, totals]) => {
          if (CATEGORY_COLUMNS.includes(category as any)) {
            categoryTotals[category] = new Decimal(totals.income).minus(totals.expense);
          }
        });
      } else {
        const transactionsForMonth = allTransactions.filter(t => 
            getYear(t.date) === selectedYear && getMonth(t.date) === monthIndex
        );

        transactionsForMonth.forEach(t => {
            if (CATEGORY_COLUMNS.includes(t.category as any)) {
                const amount = new Decimal(t.amount);
                const netChange = t.type === 'income' ? amount : amount.negated();
                categoryTotals[t.category] = categoryTotals[t.category].plus(netChange);
            }
        });
        
        const sortedTransactions = [...transactionsForMonth].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));

        finalBalance = sortedTransactions.reduce((balance, t) => {
            const amount = new Decimal(t.amount);
            return t.type === 'income' ? balance.plus(amount) : balance.minus(amount);
        }, initialBalance);
      }

      return {
        month: month.label,
        initialBalance: initialBalance.toNumber(),
        finalBalance: finalBalance.toNumber(),
        categoryTotals: Object.fromEntries(Object.entries(categoryTotals).map(([key, value]) => [key, value.toNumber()]))
      };
    });
  }, [selectedYear, allTransactions, monthlyClosures, months, getPreviousMonthFinalBalance]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Reporte Consolidado Anual</CardTitle>
        <CardDescription>
          Resumen financiero mensual por categorías para el año seleccionado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-xs">
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold sticky left-0 bg-background z-10 whitespace-nowrap">Mes</TableHead>
                <TableHead className="text-right font-bold whitespace-nowrap">Saldo Inicial</TableHead>
                {CATEGORY_COLUMNS.map(col => <TableHead key={col} className="text-right whitespace-nowrap">{col}</TableHead>)}
                <TableHead className="text-right font-bold whitespace-nowrap">Saldo Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10 capitalize whitespace-nowrap">{row.month}</TableCell>
                  <TableCell className={cn("text-right tabular-nums whitespace-nowrap", row.initialBalance < 0 ? 'text-red-600' : 'text-foreground')}>
                      {formatCurrency(row.initialBalance)}
                  </TableCell>
                  {CATEGORY_COLUMNS.map(col => {
                    const value = row.categoryTotals[col] || 0;
                    return (
                        <TableCell key={col} className={cn("text-right tabular-nums whitespace-nowrap", value < 0 ? 'text-red-600' : 'text-foreground')}>
                            {formatCurrency(value)}
                        </TableCell>
                    );
                  })}
                  <TableCell className={cn("text-right font-bold tabular-nums whitespace-nowrap", row.finalBalance < 0 ? 'text-red-600' : 'text-foreground')}>
                      {formatCurrency(row.finalBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
