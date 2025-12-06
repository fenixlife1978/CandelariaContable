'use server';

/**
 * @fileOverview Generates a monthly summary of loan activities using AI, including insights and suggestions for improving cash flow.
 *
 * - generateMonthlyLoanSummary - A function that handles the generation of the monthly loan summary.
 * - GenerateMonthlyLoanSummaryInput - The input type for the generateMonthlyLoanSummary function.
 * - GenerateMonthlyLoanSummaryOutput - The return type for the generateMonthlyLoanSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMonthlyLoanSummaryInputSchema = z.object({
  income: z
    .array(
      z.object({
        date: z.string().describe('The date of the income.'),
        amount: z.number().describe('The amount of the income.'),
        description: z.string().describe('The description of the income.'),
      })
    )
    .describe('An array of income entries.'),
  expenses: z
    .array(
      z.object({
        date: z.string().describe('The date of the expense.'),
        amount: z.number().describe('The amount of the expense.'),
        description: z.string().describe('The description of the expense.'),
      })
    )
    .describe('An array of expense entries.'),
  capital: z.number().describe('The current capital.'),
  financialBenchmarks: z
    .string()
    .optional()
    .describe('Optional financial benchmarks to consider.'),
});

export type GenerateMonthlyLoanSummaryInput = z.infer<
  typeof GenerateMonthlyLoanSummaryInputSchema
>;

const GenerateMonthlyLoanSummaryOutputSchema = z.object({
  summary: z.string().describe('The AI-generated monthly summary.'),
  suggestions: z
    .array(z.string())
    .describe('Suggestions for improving cash flow.'),
});

export type GenerateMonthlyLoanSummaryOutput = z.infer<
  typeof GenerateMonthlyLoanSummaryOutputSchema
>;

export async function generateMonthlyLoanSummary(
  input: GenerateMonthlyLoanSummaryInput
): Promise<GenerateMonthlyLoanSummaryOutput> {
  return generateMonthlyLoanSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMonthlyLoanSummaryPrompt',
  input: {schema: GenerateMonthlyLoanSummaryInputSchema},
  output: {schema: GenerateMonthlyLoanSummaryOutputSchema},
  prompt: `You are a financial advisor specializing in loan management. Generate a monthly summary of loan activities and provide suggestions for improving cash flow.

Here's the data for the month:

Income:
{{#each income}}
  - Date: {{date}}, Amount: {{amount}}, Description: {{description}}
{{/each}}

Expenses:
{{#each expenses}}
  - Date: {{date}}, Amount: {{amount}}, Description: {{description}}
{{/each}}

Current Capital: {{capital}}

{{#if financialBenchmarks}}
  Consider these financial benchmarks: {{financialBenchmarks}}
{{/if}}

Generate a concise summary and provide actionable suggestions for improving cash flow. Only make suggestions if it is absolutely necessary based on historical data and user settings.

Summary:
{{summary}}

Suggestions:
{{#each suggestions}}
  - {{this}}
{{/each}}`,
});

const generateMonthlyLoanSummaryFlow = ai.defineFlow(
  {
    name: 'generateMonthlyLoanSummaryFlow',
    inputSchema: GenerateMonthlyLoanSummaryInputSchema,
    outputSchema: GenerateMonthlyLoanSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
