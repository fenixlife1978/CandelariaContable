'use client';

import { useState, useMemo, useRef } from 'react';
import { format, getMonth, getYear, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import { Button } from '@/components/ui/button';
import { TransactionsTable } from './transactions-table';
import type { Transaction } from '@/lib/types';
import { FileDown, Pencil } from 'lucide-react';
import { Separator } from './ui/separator';

type ReportsProps = {
  allTransactions: Transaction[];
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
};

export function Reports({ allTransactions, formatCurrency, isLoading }: ReportsProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const allYears = allTransactions.map(t => getYear(t.date));
    const uniqueYears = [...new Set(allYears), today.getFullYear()];
    return uniqueYears.sort((a, b) => b - a);
  }, [allTransactions, today]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i, 1), 'LLLL', { locale: es }),
  }));

  const { filteredTransactions, capitalInicial } = useMemo(() => {
    const startOfSelectedMonth = startOfMonth(new Date(selectedYear, selectedMonth));
    
    const transactionsBefore = allTransactions.filter(t => t.date < startOfSelectedMonth);
    const capitalInicial = transactionsBefore.reduce((acc, t) => {
        return acc + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    const filtered = allTransactions.filter(transaction => {
      return (
        getMonth(transaction.date) === selectedMonth &&
        getYear(transaction.date) === selectedYear
      );
    });

    return { filteredTransactions: filtered, capitalInicial };
  }, [allTransactions, selectedMonth, selectedYear]);

  const { totalIncome, totalExpenses, balance, categoryTotals, capitalFinal } = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const categoryTotals = filteredTransactions.reduce((acc, t) => {
        if (!acc[t.category]) {
            acc[t.category] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            acc[t.category].income += t.amount;
        } else {
            acc[t.category].expense += t.amount;
        }
        return acc;
    }, {} as Record<string, { income: number; expense: number }>);
    
    const currentMonthBalance = income - expenses;

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: currentMonthBalance,
      categoryTotals,
      capitalFinal: capitalInicial + currentMonthBalance,
    };
  }, [filteredTransactions, capitalInicial]);

  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, 
        useCORS: true,
        backgroundColor: null
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`reporte-${months[selectedMonth].label}-${selectedYear}.pdf`);
    } catch(error) {
      console.error("Error al generar el PDF:", error)
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Reportes Financieros</CardTitle>
        <CardDescription>
          Consulta la actividad financiera por períodos específicos.
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
          <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <FileDown className="mr-2 h-4 w-4" />
            {isGeneratingPdf ? 'Generando...' : 'Exportar a PDF'}
          </Button>
        </div>

        <div ref={reportRef} className="p-4 bg-background rounded-lg">
          <h3 className="text-xl font-bold font-headline mb-4 text-center">
            Reporte de {months[selectedMonth].label} {selectedYear}
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-center">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">Capital Inicial</p>
              <p className="text-lg font-bold">{formatCurrency(capitalInicial)}</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">Egresos del Mes</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
             <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">Capital Final</p>
              <p className="text-lg font-bold">{formatCurrency(capitalFinal)}</p>
            </div>
          </div>
          
          <Separator className="my-6" />

          <h4 className="text-lg font-bold font-headline mb-4 text-center">
            Resumen por Categoría
          </h4>
          {Object.keys(categoryTotals).length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(categoryTotals).map(([category, totals]) => (
                    <div key={category} className="p-4 bg-secondary/50 rounded-lg">
                        <p className="font-bold text-center mb-2">{category}</p>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Ingresos:</span>
                            <span className="text-sm font-medium text-green-600">{formatCurrency(totals.income)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Egresos:</span>
                            <span className="text-sm font-medium text-red-600">{formatCurrency(totals.expense)}</span>
                        </div>
                        <Separator className="my-2" />
                         <div className="flex justify-between font-bold">
                            <span>Balance:</span>
                            <span>{formatCurrency(totals.income - totals.expense)}</span>
                        </div>
                    </div>
                ))}
             </div>
          ) : (
            <p className="text-muted-foreground text-center mb-6">No hay datos de categorías para este período.</p>
          )}

          <Separator className="my-6" />

          <h4 className="text-lg font-bold font-headline mb-4 text-center">
            Detalle de Transacciones
          </h4>
          <TransactionsTable
            transactions={filteredTransactions}
            onDelete={() => {}} 
            onUpdate={() => {}}
            formatCurrency={formatCurrency}
            isLoading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
