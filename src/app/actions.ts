'use server';

import { generateMonthlyLoanSummary, GenerateMonthlyLoanSummaryInput } from '@/ai/flows/generate-monthly-loan-summary';

export async function handleGenerateSummary(input: GenerateMonthlyLoanSummaryInput) {
  try {
    const summary = await generateMonthlyLoanSummary(input);
    return { data: summary };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    return { error: `An unexpected error occurred while generating the summary: ${errorMessage}` };
  }
}
