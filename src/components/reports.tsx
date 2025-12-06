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
import type { Transaction, MonthlyClosure, CompanyProfile } from '@/lib/types';
import { FileDown, Pencil, Banknote } from 'lucide-react';
import { Separator } from './ui/separator';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, where, query, getDocs } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

type ReportsProps = {
  allTransactions: Transaction[];
  monthlyClosures: MonthlyClosure[];
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
  companyProfile: CompanyProfile | null;
};

export function Reports({ allTransactions, monthlyClosures, formatCurrency, isLoading, companyProfile }: ReportsProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(today));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(today));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isClosingMonth, setIsClosingMonth] = useState(false);
  const { toast } = useToast();

  const reportRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();
  const monthlyClosuresCollection = useMemoFirebase(() => collection(firestore, 'monthlyClosures'), [firestore]);

  const years = useMemo(() => {
    const transactionYears = allTransactions.map(t => getYear(t.date));
    const closureYears = monthlyClosures.map(c => c.year);
    const allYears = [...transactionYears, ...closureYears, today.getFullYear(), 2023];
    const uniqueYears = [...new Set(allYears)];
    return uniqueYears.sort((a, b) => b - a);
  }, [allTransactions, monthlyClosures, today]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i, 1), 'LLLL', { locale: es }),
  }));

  const { filteredTransactions, capitalInicial, isClosed } = useMemo(() => {
    const previousMonthDate = subMonths(new Date(selectedYear, selectedMonth), 1);
    const previousMonthYear = getYear(previousMonthDate);
    const previousMonthMonth = getMonth(previousMonthDate);
    
    const previousMonthClosure = monthlyClosures.find(c => c.year === previousMonthYear && c.month === previousMonthMonth);
    
    let capitalInicialInCents = Math.round((previousMonthClosure?.finalBalance ?? 0) * 100);

    const transactionsForSelectedMonth = allTransactions.filter(transaction =>
      getMonth(transaction.date) === selectedMonth &&
      getYear(transaction.date) === selectedYear
    );
    
    if (!previousMonthClosure) {
        const initialCapitalTransaction = transactionsForSelectedMonth.find(
          t => t.category === "Capital Inicial" && t.type === 'income'
        );

        if (initialCapitalTransaction) {
            capitalInicialInCents = Math.round(initialCapitalTransaction.amount * 100);
        } else {
            const startOfSelectedMonth = startOfMonth(new Date(selectedYear, selectedMonth));
            const transactionsBefore = allTransactions.filter(t => new Date(t.date) < startOfSelectedMonth);
            const totalInCents = transactionsBefore.reduce((acc, t) => {
                const amountInCents = Math.round(t.amount * 100);
                return acc + (t.type === 'income' ? amountInCents : -amountInCents);
            }, 0);
            capitalInicialInCents = totalInCents;
        }
    }

    const isMonthClosed = monthlyClosures.some(c => c.year === selectedYear && c.month === selectedMonth);

    const filtered = transactionsForSelectedMonth.filter(t => !(t.category === 'Capital Inicial' && t.type === 'income' && !previousMonthClosure));
    
    return { 
      filteredTransactions: filtered, 
      capitalInicial: capitalInicialInCents / 100, 
      isClosed: isMonthClosed 
    };
}, [allTransactions, selectedMonth, selectedYear, monthlyClosures]);


  const { totalIncome, totalExpenses, balance, categoryTotals, capitalFinal } = useMemo(() => {
    const incomeInCents = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
    const expensesInCents = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
    
    const categoryTotalsInCents = filteredTransactions.reduce((acc, t) => {
        if (!acc[t.category]) {
            acc[t.category] = { income: 0, expense: 0 };
        }
        const amountInCents = Math.round(t.amount * 100);
        if (t.type === 'income') {
            acc[t.category].income += amountInCents;
        } else {
            acc[t.category].expense += amountInCents;
        }
        return acc;
    }, {} as Record<string, { income: number; expense: number }>);
    
    const categoryTotals = Object.entries(categoryTotalsInCents).reduce((acc, [key, value]) => {
      acc[key] = { income: value.income / 100, expense: value.expense / 100 };
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    const currentMonthBalanceInCents = incomeInCents - expensesInCents;
    const capitalInicialInCents = Math.round(capitalInicial * 100);
    const capitalFinalInCents = capitalInicialInCents + currentMonthBalanceInCents;

    return {
      totalIncome: incomeInCents / 100,
      totalExpenses: expensesInCents / 100,
      balance: currentMonthBalanceInCents / 100,
      categoryTotals,
      capitalFinal: capitalFinalInCents / 100,
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
      toast({
        variant: 'destructive',
        title: 'Error al generar PDF',
        description: 'Hubo un problema al exportar el reporte.'
      })
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCloseMonth = async () => {
    setIsClosingMonth(true);

    const closureId = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const q = query(
      monthlyClosuresCollection,
      where('year', '==', selectedYear),
      where('month', '==', selectedMonth)
    );
    const existingClosure = await getDocs(q);

    if (!existingClosure.empty) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Este mes ya ha sido cerrado.',
      });
      setIsClosingMonth(false);
      return;
    }

    const closureData = {
      id: closureId,
      month: selectedMonth,
      year: selectedYear,
      initialBalance: capitalInicial,
      totalIncome,
      totalExpenses,
      finalBalance: capitalFinal,
      categoryTotals,
      closedAt: new Date().toISOString(),
    };

    try {
      await addDocumentNonBlocking(monthlyClosuresCollection, closureData);
      toast({
        title: 'Cierre Exitoso',
        description: `El mes de ${months[selectedMonth].label} ${selectedYear} ha sido cerrado.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al cerrar el mes',
        description: 'Hubo un problema al guardar el cierre del mes.',
      });
    } finally {
      setIsClosingMonth(false);
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
          <div className='flex gap-2'>
            <Button onClick={handleCloseMonth} disabled={isClosingMonth || isClosed} variant="secondary">
              {isClosingMonth ? 'Cerrando...' : (isClosed ? 'Mes Cerrado' : 'Cierre del Mes')}
            </Button>
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <FileDown className="mr-2 h-4 w-4" />
              {isGeneratingPdf ? 'Generando...' : 'Exportar a PDF'}
            </Button>
          </div>
        </div>

        <div className="border bg-background rounded-lg">
          <div ref={reportRef} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                    {companyProfile?.logo ? (
                      <Image src={companyProfile.logo} alt="Logo" width={48} height={48} className="object-cover" />
                    ): (
                      <Banknote className="h-7 w-7 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground font-headline">
                        {companyProfile?.name || 'Contabilidad LoanStar'}
                    </h1>
                    <p className='text-xs text-muted-foreground'>{companyProfile?.rif}</p>
                  </div>
              </div>
              <div className='text-right text-xs'>
                <p>{companyProfile?.address}</p>
                <p>{companyProfile?.phone}</p>
                <p>{companyProfile?.email}</p>
              </div>
            </div>

            <h3 className="text-xl font-bold font-headline mb-4 text-center">
                Reporte Financiero Mes {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );

    