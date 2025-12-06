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
