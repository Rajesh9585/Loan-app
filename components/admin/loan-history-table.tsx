"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/loan-calculator"
import { format } from "date-fns"

interface LoanPayment {
  id: string
  loan_id: string
  user_id: string
  month_year: string
  principal_paid: number
  interest_paid: number
  remaining_balance: number
  status: string
  payment_date: string | null
}

interface Loan {
  id: string
  profiles: {
    full_name: string
    member_id: string | null
  }
}

interface LoanHistoryTableProps {
  payments: LoanPayment[]
  loans: Loan[]
}

export function LoanHistoryTable({ payments, loans }: LoanHistoryTableProps) {
  const getLoanDetails = (loanId: string) => {
    return loans.find((l) => l.id === loanId)
  }

  if (payments.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No payment history found</div>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Month/Year</TableHead>
            <TableHead>Principal Paid</TableHead>
            <TableHead>Interest Paid</TableHead>
            <TableHead>Remaining Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const loan = getLoanDetails(payment.loan_id)
            return (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="font-medium">{loan?.profiles.full_name || "Unknown"}</div>
                  {loan?.profiles.member_id && (
                    <div className="text-xs text-muted-foreground">{loan.profiles.member_id}</div>
                  )}
                </TableCell>
                <TableCell>{payment.month_year}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(payment.principal_paid)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(payment.interest_paid)}</TableCell>
                <TableCell>{formatCurrency(payment.remaining_balance)}</TableCell>
                <TableCell>
                  <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge>
                </TableCell>
                <TableCell>
                  {payment.payment_date ? format(new Date(payment.payment_date), "MMM dd, yyyy") : "N/A"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
