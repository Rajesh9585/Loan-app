"use client"

import type React from "react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface AddLoanDialogProps {
  users: Array<{ id: string; full_name: string; email: string }>
}

export function AddLoanDialog({ users }: AddLoanDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const userId = formData.get("userId") as string
    const amount = formData.get("amount") as string
    const interestRate = formData.get("interestRate") as string
    const purpose = formData.get("purpose") as string
    const durationMonths = formData.get("durationMonths") as string
    const monthlyEmi = formData.get("monthlyEmi") as string

    console.log("[v0] Creating loan with data:", {
      userId,
      amount,
      interestRate,
      durationMonths,
      monthlyEmi,
      purpose,
    })

    try {
      const supabase = createClient()

      const principal = Number.parseFloat(amount)
      const rate = Number.parseFloat(interestRate) / 100
      const duration = Number.parseInt(durationMonths)
      const emi = Number.parseFloat(monthlyEmi)
      const emiInterest = (principal * rate) / 12 // Monthly interest

      console.log("[v0] Calculated values:", { principal, rate, duration, emi, emiInterest })

      const { data: loanData, error: loanError } = await supabase
        .from("loans")
        .insert({
          user_id: userId,
          amount: principal,
          interest_rate: Number.parseFloat(interestRate),
          installment_loan_taken: principal, // Same as amount initially
          installment_duration_months: duration,
          monthly_emi_amount: emi,
          emi_monthly_interest: emiInterest,
          purpose: purpose || null,
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .select()

      console.log("[v0] Loan creation response:", { loanData, loanError })

      if (loanError) {
        console.error("[v0] Loan creation error:", loanError)
        throw loanError
      }

      console.log("[v0] Loan created successfully:", loanData)
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      console.error("[v0] Error in handleSubmit:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Loan</DialogTitle>
            <DialogDescription>Create a new loan for a user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User</Label>
              <Select name="userId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Loan Amount (₹)</Label>
              <Input id="amount" name="amount" type="number" step="100" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input id="interestRate" name="interestRate" type="number" step="0.1" defaultValue="15" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMonths">Duration (Months)</Label>
              <Input id="durationMonths" name="durationMonths" type="number" min="1" defaultValue="12" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyEmi">Monthly EMI Amount (₹)</Label>
              <Input id="monthlyEmi" name="monthlyEmi" type="number" step="100" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input id="purpose" name="purpose" placeholder="Optional loan purpose" />
            </div>
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
