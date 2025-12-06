export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: Date;
};

export type Income = {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export type Expense = {
  id: string;
  date: string;
  amount: number;
  description: string;
}
