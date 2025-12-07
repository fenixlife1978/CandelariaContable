'use client';

import { useState, useMemo, useRef } from 'react';
import { format, getMonth, getYear } from 'date-fns';
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
import { Button } from './ui/button';
import { TransactionsTable } from './transactions-table';
import type { Transaction, CompanyProfile } from '@/lib/types';
import { Search, FileDown, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

type TransactionQueryProps = {
  allTransactions: Transaction[];
  onDelete: (id: string, type: 'income' | 'expense') => void;
  onUpdate: (transaction: Transaction) => void;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
  companyProfile: CompanyProfile | null;
};

export function TransactionQuery({ allTransactions, onDelete, onUpdate, formatCurrency, isLoading, companyProfile }: TransactionQueryProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(today));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(today));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const queryReportRef = useRef<HTMLDivElement>(null);

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

  const handleGeneratePdf = async () => {
    if (!queryReportRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
      const canvas = await html2canvas(queryReportRef.current, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const width = pdfWidth;
      const height = width / ratio;

      pdf.addImage(imgData, 'PNG', 0, 0, width, height > pdfHeight ? pdfHeight : height);
      pdf.save(`consulta-${months[selectedMonth].label}-${selectedYear}.pdf`);
    } catch(error) {
      console.error("Error al generar el PDF:", error)
      toast({
        variant: 'destructive',
        title: 'Error al generar PDF',
        description: 'Hubo un problema al exportar la consulta.'
      })
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
          <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <FileDown className="mr-2 h-4 w-4" />
            {isGeneratingPdf ? 'Generando...' : 'Exportar a PDF'}
          </Button>
        </div>

        <div className="overflow-hidden">
          <div ref={queryReportRef} className="bg-white text-black p-4">
            <div className="flex items-start justify-between mb-4">
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
            <h3 className="text-lg font-semibold font-headline mb-4 text-center">
              Consulta de Transacciones - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </h3>
            <TransactionsTable 
                transactions={filteredTransactions} 
                onDelete={onDelete} 
                onUpdate={onUpdate}
                formatCurrency={formatCurrency}
                isLoading={isLoading}
                isEmbedded={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
