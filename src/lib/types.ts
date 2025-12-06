export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: Date;
};

export type Income = {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

export type Expense = {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

export type MonthlyClosure = {
  id: string;
  month: number;
  year: number;
  initialBalance: number;
  totalIncome: number;
  totalExpenses: number;
  finalBalance: number;
  categoryTotals: Record<string, { income: number; expense: number }>;
  closedAt: string;
};

export type CompanyProfile = {
  id: string;
  name?: string;
  rif?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}
