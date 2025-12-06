'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';

type TransactionsTableProps = {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  formatCurrency: (amount: number) => string;
};

export function TransactionsTable({ transactions, onDelete, formatCurrency }: TransactionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Transactions</CardTitle>
        <CardDescription>A log of all your income and expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="hidden md:table-cell">{format(transaction.date, 'dd MMM, yyyy')}</TableCell>
                   <TableCell className="md:hidden table-cell">{format(transaction.date, 'dd/MM/yy')}</TableCell>
                  <TableCell className="font-medium max-w-[150px] truncate">{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={cn(transaction.type === 'income' && 'bg-primary')}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn("text-right font-medium", transaction.type === 'expense' && 'text-destructive')}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete transaction</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this transaction.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(transaction.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
