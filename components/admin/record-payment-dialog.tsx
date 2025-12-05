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
  const [interestPaid, setInterestPaid] = useState<boolean>(false)
  const [principalPaid, setPrincipalPaid] = useState<boolean>(false)
  const [principalAmount, setPrincipalAmount] = useState("")
  const router = useRouter()

  const handleSubmit = async () => {
    console.log("[v0] Starting payment recording for loan:", loan.id)
    console.log("[v0] Interest paid:", interestPaid, "Principal paid:", principalPaid, "Amount:", principalAmount)

    if (!interestPaid && !principalPaid) {
      setError("Please mark at least interest or principal as paid")
      console.log("[v0] Validation failed: No payment type selected")
      return
    }

    const principal = principalPaid && principalAmount ? Number.parseFloat(principalAmount) : 0

    if (principalPaid && (!principalAmount || principal <= 0)) {
      setError("Please enter a valid principal amount")
      console.log("[v0] Validation failed: Invalid principal amount")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      console.log("[v0] Supabase client created successfully")

      // Fetch current loan data
      const { data: loanData, error: fetchError } = await supabase
        .from("loans")
        .select("amount")
        .eq("id", loan.id)
        .maybeSingle()

      console.log("[v0] Loan data fetch result:", { data: loanData, error: fetchError })

      if (fetchError) {
        console.error("[v0] Error fetching loan:", fetchError)
        throw new Error(`Failed to fetch loan: ${fetchError.message}`)
      }

      if (!loanData) {
        console.error("[v0] Loan not found in database")
        throw new Error("Loan not found")
      }

      const currentBalance = Number(loanData.amount)
      const remainingBalance = Math.max(0, currentBalance - principal)
      const interestAmount = interestPaid ? (currentBalance * loan.interest_rate) / 100 : 0

      console.log("[v0] Payment calculation:", {
        currentBalance,
        principal,
        remainingBalance,
        interestAmount,
        interestRate: loan.interest_rate,
      })

      const now = new Date()
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

      const paymentData = {
        loan_id: loan.id,
        user_id: loan.user_id,
        month_year: monthYear,
        principal_paid: principal,
        interest_paid: interestAmount,
        remaining_balance: remainingBalance,
        payment_date: now.toISOString(),
        status: remainingBalance === 0 ? "completed" : "paid",
      }

      console.log("[v0] Attempting to insert payment:", paymentData)

      const { data: paymentResult, error: paymentError } = await supabase
        .from("loan_payments")
        .insert(paymentData)
        .select()

      console.log("[v0] Payment insert result:", { data: paymentResult, error: paymentError })

      if (paymentError) {
        console.error("[v0] Payment insert error:", paymentError)
        throw new Error(`Failed to record payment: ${paymentError.message}`)
      }

      console.log("[v0] Payment recorded successfully, updating loan balance...")

      // Update loan balance and status
      const updateData: { amount: number; status?: string; updated_at: string } = {
        amount: remainingBalance,
        updated_at: now.toISOString(),
      }

      if (remainingBalance === 0) {
        updateData.status = "completed"
        console.log("[v0] Loan will be marked as completed")
      }

      const { data: loanUpdateResult, error: loanError } = await supabase
        .from("loans")
        .update(updateData)
        .eq("id", loan.id)
        .select()

      console.log("[v0] Loan update result:", { data: loanUpdateResult, error: loanError })

      if (loanError) {
        console.error("[v0] Loan update error:", loanError)
        throw new Error(`Failed to update loan: ${loanError.message}`)
      }

      console.log("[v0] Payment recording completed successfully!")
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      console.error("[v0] Payment recording failed with error:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onValueChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Interest Payment Column */}
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
            <div className="space-y-2">
              <Label className="text-lg font-semibold text-blue-900">Record Interest</Label>
              <p className="text-sm text-muted-foreground">Mark monthly interest payment</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white rounded-md border">
                <div className="text-sm text-muted-foreground">Monthly Interest Amount</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency((loan.amount * loan.interest_rate) / 100)}
                </div>
              </div>

              <Button
                type="button"
                variant={interestPaid ? "default" : "outline"}
                onClick={() => setInterestPaid(!interestPaid)}
                className="w-full h-12"
                size="lg"
              >
                {interestPaid ? "✓ Interest Marked as Paid" : "Mark Interest as Paid"}
              </Button>

              {interestPaid && (
                <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 border border-green-200">
                  ✓ Interest payment of {formatCurrency((loan.amount * loan.interest_rate) / 100)} will be recorded
                </div>
              )}
            </div>
          </div>

          {/* Principal Payment Column */}
          <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
            <div className="space-y-2">
              <Label className="text-lg font-semibold text-green-900">Record Principal</Label>
              <p className="text-sm text-muted-foreground">Enter principal amount paid</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white rounded-md border">
                <div className="text-sm text-muted-foreground">Current Principal Balance</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(loan.amount)}</div>
              </div>

              <Button
                type="button"
                variant={principalPaid ? "default" : "outline"}
                onClick={() => {
                  setPrincipalPaid(!principalPaid)
                  if (!principalPaid) setPrincipalAmount("")
                }}
                className="w-full h-12"
                size="lg"
              >
                {principalPaid ? "✓ Principal Payment Enabled" : "Enable Principal Payment"}
              </Button>

              {principalPaid && (
                <div className="space-y-2">
                  <Label htmlFor="principalAmount" className="text-sm font-medium">
                    Enter Principal Amount Paid
                  </Label>
                  <Input
                    id="principalAmount"
                    type="number"
                    step="100"
                    min="0"
                    max={loan.amount}
                    placeholder="₹0"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="h-12 text-lg"
                  />
                  <div className="text-xs text-muted-foreground bg-white p-2 rounded border">
                    Remaining after payment:{" "}
                    <span className="font-semibold">
                      {formatCurrency(Math.max(0, loan.amount - (Number(principalAmount) || 0)))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
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
