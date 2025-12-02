"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/loan-calculator"
import { format } from "date-fns"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface Loan {
  id: string
  amount: number
  interest_rate: number
  duration_months: number
  status: string
  requested_at: string
  profiles: {
    full_name: string
    email: string
  }
}

interface AdminLoansTableProps {
  loans: Loan[]
}

export function AdminLoansTable({ loans }: AdminLoansTableProps) {
  const [interestPaidThisMonth, setInterestPaidThisMonth] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkInterestPayments = async () => {
      const supabase = createClient()
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const statusMap: Record<string, boolean> = {}

      for (const loan of loans) {
        // Get the most recent payment for this loan
        const { data: payments } = await supabase
          .from("loan_payments")
          .select("*")
          .eq("loan_id", loan.id)
          .order("payment_date", { ascending: false })
          .limit(1)

        if (payments && payments.length > 0) {
          const lastPayment = payments[0]
          const paymentDate = new Date(lastPayment.payment_date)
          const paymentMonth = paymentDate.getMonth()
          const paymentYear = paymentDate.getFullYear()

          // Check if payment was made this month and interest was paid
          if (paymentMonth === currentMonth && paymentYear === currentYear && lastPayment.interest_status) {
            statusMap[loan.id] = true
          } else {
            statusMap[loan.id] = false
          }
        } else {
          statusMap[loan.id] = false
        }
      }

      setInterestPaidThisMonth(statusMap)
    }

    if (loans.length > 0) {
      checkInterestPayments()
    }
  }, [loans])

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Interest</TableHead>
            <TableHead>Interest This Month</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell>
                <div className="font-medium">{loan.profiles.full_name}</div>
              </TableCell>
              <TableCell className="font-semibold">{formatCurrency(Number(loan.amount))}</TableCell>
              <TableCell>{loan.interest_rate}%</TableCell>
              <TableCell>
                <Badge variant={interestPaidThisMonth[loan.id] ? "default" : "secondary"}>
                  {interestPaidThisMonth[loan.id] ? "Paid" : "Not Paid"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    loan.status === "active"
                      ? "default"
                      : loan.status === "completed"
                        ? "secondary"
                        : loan.status === "approved"
                          ? "default"
                          : "destructive"
                  }
                >
                  {loan.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(loan.requested_at), "MMM dd, yyyy")}</TableCell>
              <TableCell className="text-right">
                <RecordPaymentDialog loan={loan} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
