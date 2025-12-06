'use server';

import { generateMonthlyLoanSummary, GenerateMonthlyLoanSummaryInput } from '@/ai/flows/generate-monthly-loan-summary';

export async function handleGenerateSummary(input: GenerateMonthlyLoanSummaryInput) {
  try {
    const summary = await generateMonthlyLoanSummary(input);
    return { data: summary };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
    return { error: `Ocurrió un error inesperado al generar el resumen: ${errorMessage}` };
  }
}
