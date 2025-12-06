'use client';

import { useState } from 'react';
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
import { Trash2, Loader, Pencil } from 'lucide-react';
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
import { es } from 'date-fns/locale';
import { EditTransactionModal } from './edit-transaction-modal';

type TransactionsTableProps = {
  transactions: Transaction[];
  onDelete: (id: string, type: 'income' | 'expense') => void;
  onUpdate: (transaction: Transaction) => void;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
};

export function TransactionsTable({ transactions, onDelete, onUpdate, formatCurrency, isLoading }: TransactionsTableProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Transacciones Recientes</CardTitle>
        <CardDescription>Un registro de todos tus ingresos y egresos.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-[80px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    <div className="flex justify-center items-center">
                      <Loader className="h-6 w-6 animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Aún no hay transacciones.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="hidden md:table-cell">{format(transaction.date, 'dd MMM, yyyy', { locale: es })}</TableCell>
                   <TableCell className="md:hidden table-cell">{format(transaction.date, 'dd/MM/yy', { locale: es })}</TableCell>
                  <TableCell className="font-medium max-w-[150px] truncate">{transaction.description}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={cn(transaction.type === 'income' && 'bg-primary')}>
                      {transaction.type === 'income' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn("text-right font-medium", transaction.type === 'expense' && 'text-red-600')}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingTransaction(transaction)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar transacción</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar transacción</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente esta transacción.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(transaction.id, transaction.type)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
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
        {editingTransaction && (
          <EditTransactionModal 
            transaction={editingTransaction}
            onUpdate={onUpdate}
            isOpen={!!editingTransaction}
            onClose={() => setEditingTransaction(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
