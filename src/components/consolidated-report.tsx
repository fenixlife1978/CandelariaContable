'use client';

import { useState, useMemo, useRef } from 'react';
import { format, getYear, getMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Decimal from 'decimal.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';

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
import type { Transaction, MonthlyClosure, CompanyProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { FileDown, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ConsolidatedReportProps = {
  allTransactions: Transaction[];
  monthlyClosures: MonthlyClosure[];
  formatCurrency: (amount: number) => string;
  companyProfile: CompanyProfile | null;
};

const CATEGORY_COLUMNS: string[] = [
  "Fiscalía",
  "Capital Recuperado",
  "Intereses Ganados",
  "Prestamos Candelaria",
  "Préstamos Socios",
  "Compra de Divisas",
  "Gastos de Divisas",
  "Egresos Extraordinarios",
  "Otros Egresos",
];

export function ConsolidatedReport({
  allTransactions,
  monthlyClosures,
  formatCurrency,
  companyProfile,
}: ConsolidatedReportProps) {
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    const calculateBalance = (month: number, year: number): Decimal => {
      const previousMonthDate = subMonths(new Date(year, month), 1);
      const prevYear = getYear(previousMonthDate);
      const prevMonth = getMonth(previousMonthDate);

      const closure = monthlyClosures.find(c => c.year === prevYear && c.month === prevMonth && c.status === 'closed');
      if (closure) {
        return new Decimal(closure.finalBalance);
      }

      // Base case for recursion, to prevent infinite loops before any transactions exist.
      const firstTransactionYear = Math.min(...allTransactions.map(t => getYear(t.date)), new Date().getFullYear());
      if (year < firstTransactionYear || (year === firstTransactionYear && month === 0)) {
         return new Decimal(0);
      }
      
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
          if (CATEGORY_COLUMNS.includes(category)) {
            const income = new Decimal(totals.income);
            const expense = new Decimal(totals.expense);
            categoryTotals[category] = income.minus(expense);
          }
        });
      } else {
        const transactionsForMonth = allTransactions.filter(t => 
            getYear(t.date) === selectedYear && getMonth(t.date) === monthIndex
        );

        transactionsForMonth.forEach(t => {
            if (CATEGORY_COLUMNS.includes(t.category)) {
                const amount = new Decimal(t.amount);
                const netChange = t.type === 'income' ? amount : amount.negated();
                categoryTotals[t.category] = (categoryTotals[t.category] || new Decimal(0)).plus(netChange);
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

  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      
      const ratio = imgWidth / imgHeight;
      let finalImgWidth = pdfWidth - 40; // Margen
      let finalImgHeight = finalImgWidth / ratio;

      if (finalImgHeight > pdfHeight - 40) {
          finalImgHeight = pdfHeight - 40;
          finalImgWidth = finalImgHeight * ratio;
      }
      
      const x = (pdfWidth - finalImgWidth) / 2;
      const y = (pdfHeight - finalImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
      pdf.save(`reporte-consolidado-${selectedYear}.pdf`);
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      toast({
        variant: 'destructive',
        title: 'Error al generar PDF',
        description: 'Hubo un problema al exportar el reporte.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Reporte Consolidado Anual</CardTitle>
        <CardDescription>
          Resumen financiero mensual por categorías para el año seleccionado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 max-w-xs">
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
          <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <FileDown className="mr-2 h-4 w-4" />
              {isGeneratingPdf ? 'Generando...' : 'Exportar a PDF'}
            </Button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <div ref={reportRef} className="p-4 sm:p-8 bg-white text-black min-w-max">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden border">
                  {companyProfile?.logo ? (
                    <Image src={companyProfile.logo} alt="Logo" width={48} height={48} className="object-cover" />
                  ) : (
                    <Banknote className="h-7 w-7 text-primary-foreground" />
                  )}
                </div>
                <h1 className="text-xl font-bold font-headline">
                  {companyProfile?.name || 'Contabilidad LoanStar'}
                </h1>
              </div>
            </div>

            <h3 className="text-xl font-semibold font-headline mb-6 text-center">
              Reporte Consolidado del Año {selectedYear}
            </h3>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold sticky left-0 bg-white z-10 whitespace-nowrap">Mes</TableHead>
                  <TableHead className="text-right font-bold whitespace-nowrap">Saldo Inicial</TableHead>
                  {CATEGORY_COLUMNS.map(col => <TableHead key={col} className="text-right whitespace-nowrap">{col}</TableHead>)}
                  <TableHead className="text-right font-bold whitespace-nowrap">Saldo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium sticky left-0 bg-white z-10 capitalize whitespace-nowrap">{row.month}</TableCell>
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
        </div>
      </CardContent>
    </Card>
  );
}
