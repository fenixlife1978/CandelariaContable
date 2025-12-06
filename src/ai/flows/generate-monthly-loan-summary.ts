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
        date: z.string().describe('La fecha del ingreso.'),
        amount: z.number().describe('El monto del ingreso.'),
        description: z.string().describe('La descripción del ingreso.'),
      })
    )
    .describe('Un arreglo de entradas de ingresos.'),
  expenses: z
    .array(
      z.object({
        date: z.string().describe('La fecha del egreso.'),
        amount: z.number().describe('El monto del egreso.'),
        description: z.string().describe('La descripción del egreso.'),
      })
    )
    .describe('Un arreglo de entradas de egresos.'),
  capital: z.number().describe('El capital actual.'),
  financialBenchmarks: z
    .string()
    .optional()
    .describe('Benchmarks financieros opcionales a considerar.'),
});

export type GenerateMonthlyLoanSummaryInput = z.infer<
  typeof GenerateMonthlyLoanSummaryInputSchema
>;

const GenerateMonthlyLoanSummaryOutputSchema = z.object({
  summary: z.string().describe('El resumen mensual generado por IA.'),
  suggestions: z
    .array(z.string())
    .describe('Sugerencias para mejorar el flujo de caja.'),
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
  prompt: `Eres un asesor financiero especializado en la gestión de préstamos. Genera un resumen mensual de las actividades de préstamos y proporciona sugerencias para mejorar el flujo de caja. Responde siempre en español.

Aquí están los datos del mes:

Ingresos:
{{#each income}}
  - Fecha: {{date}}, Monto: {{amount}}, Descripción: {{description}}
{{/each}}

Egresos:
{{#each expenses}}
  - Fecha: {{date}}, Monto: {{amount}}, Descripción: {{description}}
{{/each}}

Capital Actual: {{capital}}

{{#if financialBenchmarks}}
  Considera estos benchmarks financieros: {{financialBenchmarks}}
{{/if}}

Genera un resumen conciso y proporciona sugerencias accionables para mejorar el flujo de caja. Solo haz sugerencias si es absolutamente necesario en función de los datos históricos y la configuración del usuario.

Resumen:
{{summary}}

Sugerencias:
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
