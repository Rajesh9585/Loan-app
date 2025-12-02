"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/loan-calculator"

interface Loan {
  id: string
  user_id: string
  amount: number
  interest_rate: number
  duration_months: number
  status: string
  profiles: {
    full_name: string
    email: string
  }
}

interface RecordPaymentDialogProps {
  loan: Loan
}

export function RecordPaymentDialog({ loan }: RecordPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interestPaid, setInterestPaid] = useState<boolean | null>(null)
  const [principalAmount, setPrincipalAmount] = useState("")
  const router = useRouter()

  const handleSubmit = async () => {
    if (interestPaid === null) {
      setError("Please select whether interest was paid")
      return
    }

    const principal = principalAmount ? Number.parseFloat(principalAmount) : 0

    if (principal < 0 || principal > loan.amount) {
      setError(`Principal amount must be between ₹0 and ${formatCurrency(loan.amount)}`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current loan balance
      const { data: loanData } = await supabase.from("loans").select("amount").eq("id", loan.id).single()

      if (!loanData) throw new Error("Loan not found")

      const currentBalance = Number(loanData.amount)
      const remainingBalance = Math.max(0, currentBalance - principal)

      const interestAmount = interestPaid ? (currentBalance * loan.interest_rate) / 100 : 0

      // Create payment record with proper month_year format
      const now = new Date()
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

      const { error: paymentError } = await supabase.from("loan_payments").insert({
        loan_id: loan.id,
        user_id: loan.user_id,
        month_year: monthYear,
        principal_paid: principal,
        interest_paid: interestAmount,
        remaining_balance: remainingBalance,
        payment_date: now.toISOString(),
        status: principal === 0 && interestPaid ? "paid" : principal > 0 ? "paid" : "partial",
      })

      if (paymentError) throw paymentError

      const updateData: { amount: number; status?: string; updated_at?: string } = {
        amount: remainingBalance,
        updated_at: now.toISOString(),
      }

      // If balance reaches zero, mark loan as completed with completion date
      if (remainingBalance === 0) {
        updateData.status = "completed"
      }

      const { error: loanError } = await supabase.from("loans").update(updateData).eq("id", loan.id)

      if (loanError) throw loanError

      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record payment for {loan.profiles.full_name}
            <div className="mt-2 space-y-1 text-sm">
              <div>Current Balance: {formatCurrency(loan.amount)}</div>
              <div>Interest Rate: {loan.interest_rate}%</div>
              <div>Monthly Interest: {formatCurrency((loan.amount * loan.interest_rate) / 100)}</div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Has Interest Been Paid?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={interestPaid === true ? "default" : "outline"}
                onClick={() => setInterestPaid(true)}
                className="flex-1"
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={interestPaid === false ? "default" : "outline"}
                onClick={() => setInterestPaid(false)}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="principalAmount">Principal Amount Paid (Optional)</Label>
            <Input
              id="principalAmount"
              type="number"
              step="100"
              min="0"
              max={loan.amount}
              placeholder="₹0"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if only interest was paid. Interest calculated on remaining balance automatically.
            </p>
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
