'use client';

import { useState, useMemo } from 'react';
import { format, getYear } from 'date-fns';
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

const transactionCategories = [
  "Fiscalía",
  "Capital Recuperado",
  "Intereses Ganados",
  "Préstamos Socios",
  "Prestamos Candelaria",
  "Capital Inicial",
  "Gastos Extraordinarios",
  "Egresos Extraordinarios",
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
      label: format(new Date(2000, i, 1), 'LLL', { locale: es }),
    }));
  }, []);

  const reportData = useMemo(() => {
    const data: Record<string, Record<number, Decimal>> = {};
    const monthlyTotals: Record<number, Decimal> = {};

    // Initialize data structure
    transactionCategories.forEach((category) => {
      data[category] = {};
      months.forEach((month) => {
        data[category][month.value] = new Decimal(0);
      });
    });
    months.forEach(m => monthlyTotals[m.value] = new Decimal(0));

    // Process closed months
    monthlyClosures
      .filter((c) => c.year === selectedYear && c.status === 'closed')
      .forEach((closure) => {
        Object.entries(closure.categoryTotals).forEach(([category, totals]) => {
          if (data[category]) {
            const netBalance = new Decimal(totals.income).minus(totals.expense);
            data[category][closure.month] = netBalance;
            monthlyTotals[closure.month] = monthlyTotals[closure.month].plus(netBalance);
          }
        });
      });

    // Process open months
    const openMonths = months.filter(
      (m) => !monthlyClosures.some((c) => c.year === selectedYear && c.month === m.value && c.status === 'closed')
    );

    openMonths.forEach((month) => {
      allTransactions
        .filter((t) => getYear(t.date) === selectedYear && t.date.getMonth() === month.value)
        .forEach((transaction) => {
          if (data[transaction.category]) {
            const amount = new Decimal(transaction.amount);
            const netChange = transaction.type === 'income' ? amount : amount.negated();
            data[transaction.category][month.value] = data[transaction.category][month.value].plus(netChange);
            monthlyTotals[month.value] = monthlyTotals[month.value].plus(netChange);
          }
        });
    });
    
    // Calculate totals
    const categoryTotals = Object.fromEntries(
        transactionCategories.map(category => [
            category,
            Object.values(data[category]).reduce((sum, val) => sum.plus(val), new Decimal(0))
        ])
    );
    const grandTotal = Object.values(categoryTotals).reduce((sum, val) => sum.plus(val), new Decimal(0));

    return { data, monthlyTotals, categoryTotals, grandTotal };
  }, [selectedYear, allTransactions, monthlyClosures, months]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Reporte Consolidado Anual</CardTitle>
        <CardDescription>
          Vea un resumen de los balances netos por categoría para cada mes del año seleccionado.
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
                <TableHead className="font-bold sticky left-0 bg-background z-10">Categoría</TableHead>
                {months.map((month) => (
                  <TableHead key={month.value} className="text-right whitespace-nowrap">
                    {month.label}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold whitespace-nowrap">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionCategories.map((category) => (
                <TableRow key={category}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10">{category}</TableCell>
                  {months.map((month) => {
                    const value = reportData.data[category][month.value].toNumber();
                    return (
                      <TableCell key={month.value} className={cn("text-right whitespace-nowrap tabular-nums", value < 0 ? 'text-red-600' : 'text-foreground')}>
                        {formatCurrency(value)}
                      </TableCell>
                    );
                  })}
                  <TableCell className={cn("text-right font-bold whitespace-nowrap tabular-nums", reportData.categoryTotals[category].toNumber() < 0 ? 'text-red-600' : 'text-foreground')}>
                     {formatCurrency(reportData.categoryTotals[category].toNumber())}
                  </TableCell>
                </TableRow>
              ))}
               <TableRow className="bg-muted hover:bg-muted font-bold">
                 <TableCell className="sticky left-0 bg-muted z-10">Total Mensual</TableCell>
                 {months.map((month) => {
                    const total = reportData.monthlyTotals[month.value].toNumber();
                    return (
                        <TableCell key={month.value} className={cn("text-right whitespace-nowrap tabular-nums", total < 0 ? 'text-red-600' : 'text-foreground')}>
                           {formatCurrency(total)}
                        </TableCell>
                    );
                })}
                <TableCell className={cn("text-right whitespace-nowrap tabular-nums", reportData.grandTotal.toNumber() < 0 ? 'text-red-600' : 'text-foreground')}>
                    {formatCurrency(reportData.grandTotal.toNumber())}
                </TableCell>
               </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
