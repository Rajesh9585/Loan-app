"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash, UserCog, Download } from "lucide-react"
import { format } from "date-fns"
import type { Profile } from "@/lib/types"
import { EditUserDialog } from "./edit-user-dialog"
import { DeleteUserDialog } from "./delete-user-dialog"
import { PromoteUserDialog } from "./promote-user-dialog"
import { createClient } from "@/lib/supabase/client"

interface UsersTableProps {
  users: Profile[]
}

export function UsersTable({ users }: UsersTableProps) {
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)
  const [promotingUser, setPromotingUser] = useState<Profile | null>(null)
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(null)

  const handleDownloadReport = async (user: Profile) => {
    setDownloadingUserId(user.id)
    try {
      const supabase = createClient()

      // Fetch all loans for this user
      const { data: loans } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", user.id)
        .order("loan_date", { ascending: false })

      // Fetch all payments for this user
      const { data: payments } = await supabase
        .from("loan_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false })

      // Generate CSV content
      let csvContent = `LOAN REPORT FOR ${user.full_name}\n\n`
      csvContent += `User Information\n`
      csvContent += `Name,Email,Phone,Member Since,Monthly Contribution\n`
      csvContent += `"${user.full_name}","${user.email}","${user.phone || "N/A"}","${format(new Date(user.created_at), "MMM dd, yyyy")}","₹${user.monthly_contribution}"\n\n`

      // Loans section
      csvContent += `\nLoans History\n`
      csvContent += `Loan #,Loan Date,Amount,Interest Rate,Current Balance,Status,Closed Date\n`

      if (loans && loans.length > 0) {
        loans.forEach((loan, index) => {
          const closedDate =
            loan.status === "completed" && loan.closed_date ? format(new Date(loan.closed_date), "MMM dd, yyyy") : "N/A"
          csvContent += `${index + 1},"${format(new Date(loan.loan_date), "MMM dd, yyyy")}","₹${loan.amount}","${loan.interest_rate}%","₹${loan.current_balance}","${loan.status}","${closedDate}"\n`
        })
      } else {
        csvContent += `No loans found\n`
      }

      // Payments section
      csvContent += `\n\nPayment History\n`
      csvContent += `Payment #,Date,Interest Paid,Principal Paid,Interest Status,Remaining Balance\n`

      let totalInterestPaid = 0
      let totalPrincipalPaid = 0

      if (payments && payments.length > 0) {
        payments.forEach((payment, index) => {
          csvContent += `${index + 1},"${format(new Date(payment.payment_date), "MMM dd, yyyy")}","₹${payment.interest_paid}","₹${payment.principal_paid}","${payment.interest_status ? "PAID" : "UNPAID"}","₹${payment.remaining_balance}"\n`
          totalInterestPaid += Number(payment.interest_paid)
          totalPrincipalPaid += Number(payment.principal_paid)
        })

        csvContent += `\n,Total,₹${totalInterestPaid},₹${totalPrincipalPaid},,\n`
      } else {
        csvContent += `No payments found\n`
      }

      // Summary
      const activeLoan = loans?.find((l) => l.status === "active")
      csvContent += `\n\nSummary\n`
      csvContent += `Metric,Value\n`
      csvContent += `Total Loans Taken,${loans?.length || 0}\n`
      csvContent += `Active Loans,${loans?.filter((l) => l.status === "active").length || 0}\n`
      csvContent += `Completed Loans,${loans?.filter((l) => l.status === "completed").length || 0}\n`
      if (activeLoan) {
        csvContent += `Current Outstanding Balance,₹${activeLoan.current_balance}\n`
      }
      csvContent += `Report Generated,"${format(new Date(), "MMM dd, yyyy 'at' hh:mm a")}"\n`

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${user.full_name.replace(/\s+/g, "_")}_Loan_Report_${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating report:", error)
      alert("Failed to generate report. Please try again.")
    } finally {
      setDownloadingUserId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Report</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadReport(user)}
                    disabled={downloadingUserId === user.id}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadingUserId === user.id ? "Downloading..." : "Download"}
                  </Button>
                </TableCell>
                <TableCell>{format(new Date(user.created_at), "MMM dd, yyyy")}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPromotingUser(user)}>
                        <UserCog className="h-4 w-4 mr-2" />
                        {user.role === "user" ? "Promote to Admin" : "Demote to User"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-red-600">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingUser && <EditUserDialog user={editingUser} open={!!editingUser} onClose={() => setEditingUser(null)} />}

      {deletingUser && (
        <DeleteUserDialog user={deletingUser} open={!!deletingUser} onClose={() => setDeletingUser(null)} />
      )}

      {promotingUser && (
        <PromoteUserDialog user={promotingUser} open={!!promotingUser} onClose={() => setPromotingUser(null)} />
      )}
    </>
  )
}
