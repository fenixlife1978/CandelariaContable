'use client';

import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Wand2, Sparkles, FileDown, Banknote } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateSummary } from '@/app/actions';
import type { Income, Expense, CompanyProfile } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type AiSummaryModalProps = {
  incomes: Income[];
  expenses: Expense[];
  capital: number;
  companyProfile: CompanyProfile | null;
};

export function AiSummaryModal({ incomes, expenses, capital, companyProfile }: AiSummaryModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);


  const onGenerate = async () => {
    setLoading(true);
    setSummary(null);
    setSuggestions(null);

    const result = await handleGenerateSummary({
      income: incomes,
      expenses: expenses,
      capital: capital,
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error al generar el resumen',
        description: result.error,
      });
    } else if (result.data) {
      setSummary(result.data.summary);
      setSuggestions(result.data.suggestions);
    }
    setLoading(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        setSummary(null);
        setSuggestions(null);
    }
  }

  const handleGeneratePdf = async () => {
    if (!summaryRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`resumen-ia.pdf`);
    } catch(error) {
      console.error("Error al generar el PDF:", error)
      toast({
        variant: 'destructive',
        title: 'Error al generar PDF',
        description: 'Hubo un problema al exportar el resumen.'
      })
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Wand2 className="mr-2 h-4 w-4" />
          Generar Resumen con IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Resumen Mensual de Préstamos
          </DialogTitle>
          <DialogDescription>
            Información impulsada por IA sobre tus actividades financieras mensuales.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-4 pr-4 space-y-4">
          <div ref={summaryRef} className="p-4 bg-white text-black rounded-md">
            {!summary && !loading && (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg min-h-[250px] bg-background text-foreground">
                  <Wand2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold font-headline">¿Listo para obtener información?</h3>
                  <p className="text-sm text-muted-foreground mb-4">Haz clic en el botón de abajo para generar tu resumen.</p>
                  <Button onClick={onGenerate} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generar con IA
                  </Button>
              </div>
            )}

            {loading && (
              <div className="space-y-4 min-h-[250px]">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="pt-4 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            )}
            
            {summary && !loading && (
               <div className="space-y-4 animate-in fade-in-50 min-h-[250px]">
                  <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden border">
                          {companyProfile?.logo ? (
                            <Image src={companyProfile.logo} alt="Logo" width={48} height={48} className="object-cover" />
                          ): (
                            <Banknote className="h-7 w-7 text-primary-foreground" />
                          )}
                        </div>
                        <h1 className="text-xl font-bold font-headline">
                            {companyProfile?.name || 'Contabilidad LoanStar'}
                        </h1>
                      </div>
                  </div>
                  <h3 className="text-lg font-semibold font-headline mb-4 text-center">
                    Resumen Generado por IA
                  </h3>
                  <Alert className="bg-gray-50 border-gray-200 text-foreground">
                      <AlertTitle className="font-bold font-headline text-gray-800">Resumen</AlertTitle>
                      <AlertDescription className="text-gray-700">
                          {summary}
                      </AlertDescription>
                  </Alert>
                  {suggestions && suggestions.length > 0 && (
                  <Alert variant="default" className="border-accent bg-accent/10">
                      <AlertTitle className="font-bold font-headline flex items-center gap-2 text-accent-foreground">
                          <Sparkles className="h-4 w-4" />
                          Sugerencias
                      </AlertTitle>
                      <AlertDescription>
                          <ul className="list-disc pl-5 space-y-1 text-accent-foreground/90">
                              {suggestions.map((suggestion, index) => (
                                  <li key={index}>{suggestion}</li>
                              ))}
                          </ul>
                      </AlertDescription>
                  </Alert>
                  )}
               </div>
            )}
          </div>
        </div>
        <DialogFooter>
          {summary && !loading && (
            <>
              <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} variant="secondary">
                  <FileDown className="mr-2 h-4 w-4" />
                  {isGeneratingPdf ? 'Exportando...' : 'Exportar PDF'}
              </Button>
              <Button onClick={onGenerate} className="bg-accent text-accent-foreground hover:bg-accent/90">Regenerar</Button>
            </>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
