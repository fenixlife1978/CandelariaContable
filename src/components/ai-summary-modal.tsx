'use client';

import { useState } from 'react';
import { Wand2, Sparkles } from 'lucide-react';
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
import type { Income, Expense } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type AiSummaryModalProps = {
  incomes: Income[];
  expenses: Expense[];
  capital: number;
};

export function AiSummaryModal({ incomes, expenses, capital }: AiSummaryModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const { toast } = useToast();

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
        title: 'Error generating summary',
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Wand2 className="mr-2 h-4 w-4" />
          Generate AI Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Monthly Loan Summary
          </DialogTitle>
          <DialogDescription>
            AI-powered insights into your monthly financial activities.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 min-h-[250px] flex flex-col justify-center">
          {!summary && !loading && (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Wand2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold font-headline">Ready to get insights?</h3>
                <p className="text-sm text-muted-foreground mb-4">Click the button below to generate your summary.</p>
                <Button onClick={onGenerate} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate with AI
                </Button>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
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
             <div className="space-y-4 animate-in fade-in-50">
                <Alert>
                    <AlertTitle className="font-bold font-headline">Summary</AlertTitle>
                    <AlertDescription>
                        {summary}
                    </AlertDescription>
                </Alert>
                {suggestions && suggestions.length > 0 && (
                <Alert variant="default" className="border-accent">
                    <AlertTitle className="font-bold font-headline flex items-center gap-2 text-accent-foreground">
                        <Sparkles className="h-4 w-4" />
                        Suggestions
                    </AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 space-y-1">
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
        <DialogFooter>
          {summary && !loading && <Button onClick={onGenerate} className="bg-accent text-accent-foreground hover:bg-accent/90">Regenerate</Button>}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
