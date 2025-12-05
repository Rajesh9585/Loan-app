"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Download } from "lucide-react"
import { AdminLoansTable } from "./admin-loans-table"
import { LoanHistoryTable } from "./loan-history-table"
import { AddLoanDialog } from "./add-loan-dialog"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { formatCurrency } from "@/lib/utils/loan-calculator"

interface Profile {
  id: string
  full_name: string
  email: string
  member_id: string | null
  phone: string | null
}

interface Loan {
  id: string
  user_id: string
  amount: number
  interest_rate: number
  duration_months: number
  status: string
  requested_at: string
  profiles: Profile
}

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

interface LoanManagementClientProps {
  loans: Loan[]
  payments: LoanPayment[]
  users: Profile[]
}

export function LoanManagementClient({ loans, payments, users }: LoanManagementClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")

  // Filter loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchesSearch =
        loan.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.profiles.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || loan.status === statusFilter
      const matchesUser = selectedUser === "all" || loan.user_id === selectedUser

      return matchesSearch && matchesStatus && matchesUser
    })
  }, [loans, searchTerm, statusFilter, selectedUser])

  // Filter payments for selected user
  const filteredPayments = useMemo(() => {
    if (selectedUser === "all") return payments
    return payments.filter((p) => p.user_id === selectedUser)
  }, [payments, selectedUser])

  return (
    <div className="container max-w-7xl py-6 px-2 md:px-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="pl-12 md:pl-0 px-2 md:px-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Loan Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Comprehensive loan tracking and payment management
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-4">
        <TabsList className="w-full grid grid-cols-3 h-9 md:h-10 mx-auto md:w-[400px] p-0.5">
          <TabsTrigger value="overview" className="text-xs md:text-sm px-2 md:px-3">
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs md:text-sm px-2 md:px-3">
            Payment History
          </TabsTrigger>
          <TabsTrigger value="record" className="text-xs md:text-sm px-2 md:px-3">
            Record Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, member ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <AddLoanDialog users={users} />
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loans Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Loans</CardTitle>
              <CardDescription>
                Showing {filteredLoans.length} of {loans.length} loans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminLoansTable loans={filteredLoans} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* User Filter for History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter by Member</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.member_id ? `${user.member_id} - ` : ""}
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Payment History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {selectedUser === "all"
                  ? `All payment records (${filteredPayments.length} total)`
                  : `Payment history for ${users.find((u) => u.id === selectedUser)?.full_name || "selected member"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanHistoryTable payments={filteredPayments} loans={loans} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="record" className="space-y-4">
          {/* Quick Record Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Payment Recording</CardTitle>
              <CardDescription>
                All active loans are shown. Select a member to filter by specific member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by member (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Loans</SelectItem>
                    {users.map((user) => {
                      const userLoans = loans.filter((l) => l.user_id === user.id && l.status === "active")
                      if (userLoans.length === 0) return null

                      return (
                        <SelectItem key={user.id} value={user.id}>
                          {user.member_id ? `${user.member_id} - ` : ""}
                          {user.full_name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                <div className="space-y-3">
                  {loans
                    .filter((l) => l.status === "active" && (selectedUser === "all" || l.user_id === selectedUser))
                    .map((loan) => (
                      <Card key={loan.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {loan.profiles.member_id ? `${loan.profiles.member_id} - ` : ""}
                                {loan.profiles.full_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Balance: {formatCurrency(loan.amount)} • Interest: {loan.interest_rate}% • Monthly:{" "}
                                {formatCurrency((loan.amount * loan.interest_rate) / 100)}
                              </div>
                              <Badge variant={loan.status === "active" ? "default" : "secondary"}>{loan.status}</Badge>
                            </div>
                            <RecordPaymentDialog loan={loan} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {loans.filter((l) => l.status === "active" && (selectedUser === "all" || l.user_id === selectedUser))
                    .length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No active loans found</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
