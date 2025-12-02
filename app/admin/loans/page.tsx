import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminLoansTable } from "@/components/admin/admin-loans-table"
import { AddLoanDialog } from "@/components/admin/add-loan-dialog"
import { MonthlyReportDownload } from "@/components/admin/monthly-report-download"

export default async function AdminLoansPage() {
  const profile = await requireAdmin()
  const supabase = await createClient()

  const { data: loans } = await supabase
    .from("loans")
    .select("*, profiles!loans_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })

  const { data: users } = await supabase.from("profiles").select("id, full_name, email").order("full_name")

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={profile.role} userName={profile.full_name} />

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="container max-w-7xl py-6 px-4 md:px-6 space-y-6">
          <div className="space-y-4">
            <div className="pl-12 md:pl-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Loan Management</h1>
              <p className="text-sm md:text-base text-muted-foreground">Manage all loans and payment tracking</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <MonthlyReportDownload />
              <AddLoanDialog users={users || []} />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Loans</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminLoansTable loans={loans || []} />
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNav role={profile.role} />
    </div>
  )
}
