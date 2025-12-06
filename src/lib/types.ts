export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: Date;
};

export type Income = {
  date: string;
  amount: number;
  description: string;
}

export type Expense = {
  date: string;
  amount: number;
  description: string;
}
