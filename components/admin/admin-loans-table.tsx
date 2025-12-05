"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils/loan-calculator"
import { format } from "date-fns"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Eye } from "lucide-react"

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
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [loanDetailsOpen, setLoanDetailsOpen] = useState(false)

  useEffect(() => {
    const checkInterestPayments = async () => {
      const supabase = createClient()
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const statusMap: Record<string, boolean> = {}

      for (const loan of loans) {
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
                    loan.status === "active" ? "default" : loan.status === "completed" ? "secondary" : "destructive"
                  }
                >
                  {loan.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(loan.requested_at), "MMM dd, yyyy")}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Dialog
                    open={loanDetailsOpen && selectedLoan?.id === loan.id}
                    onOpenChange={(open) => {
                      setLoanDetailsOpen(open)
                      if (!open) setSelectedLoan(null)
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedLoan(loan)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Loan Details</DialogTitle>
                      </DialogHeader>
                      {selectedLoan && (
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Borrower</div>
                              <div className="text-base font-semibold">{selectedLoan.profiles.full_name}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Email</div>
                              <div className="text-sm">{selectedLoan.profiles.email}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Loan Amount</div>
                              <div className="text-lg font-bold">{formatCurrency(Number(selectedLoan.amount))}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Interest Rate</div>
                              <div className="text-lg font-bold">{selectedLoan.interest_rate}%</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Monthly Interest</div>
                              <div className="text-base font-semibold">
                                {formatCurrency((Number(selectedLoan.amount) * selectedLoan.interest_rate) / 100)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Duration</div>
                              <div className="text-base">{selectedLoan.duration_months} months</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Status</div>
                              <Badge
                                variant={
                                  selectedLoan.status === "active"
                                    ? "default"
                                    : selectedLoan.status === "completed"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {selectedLoan.status}
                              </Badge>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Requested Date</div>
                              <div className="text-sm">
                                {format(new Date(selectedLoan.requested_at), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  <RecordPaymentDialog loan={loan} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
