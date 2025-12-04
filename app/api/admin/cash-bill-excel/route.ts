import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Cash bill API called")

    const { selectedUser, month } = await request.json()
    console.log("[v0] Request params:", { selectedUser, month })

    const supabase = await createClient()
    console.log("[v0] Supabase client created")

    let query = supabase.from("profiles").select("*")

    if (selectedUser) {
      query = query.eq("id", selectedUser)
    } else {
      query = query.not("member_id", "is", null)
    }

    const { data: users, error } = await query
    console.log("[v0] Users fetched:", users?.length, error)

    if (error) throw error
    if (!users || users.length === 0) {
      return NextResponse.json({ error: "No users found" }, { status: 404 })
    }

    // Generate CSV content with complete cash bill data
    const csvRows: string[] = []

    users.forEach((user) => {
      const today = new Date()
      const dateStr = today.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })

      const updatedPrincipalBalance = (user.loan_balance || 0) + (user.monthly_interest_received || 0)

      const totalLoanBalance = (user.loan_balance || 0) + (user.emi_balance || 0)

      const totalAmount =
        (user.monthly_subscription || 0) +
        (user.monthly_interest_received || 0) +
        (user.monthly_emi || 0) +
        (user.emi_interest || 0) +
        (user.fine || 0)

      csvRows.push("CASH BILL MEETING 85")
      csvRows.push(`Date: ${dateStr}`)
      csvRows.push("")
      csvRows.push(`Name: ${user.full_name},${user.member_id}`)
      csvRows.push("")
      csvRows.push("Description,Amount to be Paid")

      csvRows.push(`Subscription Income,${user.monthly_subscription || 0}`)
      csvRows.push(`Principal Balance,${user.loan_balance || 0}`)
      csvRows.push(`Monthly Interest,${user.monthly_interest_received || 0}`)
      csvRows.push(`Updated Principal Balance,${updatedPrincipalBalance}`)
      csvRows.push(`Monthly Installment Amount,${user.monthly_emi || 0}`)
      csvRows.push(`Installment Interest,${user.emi_interest || 0}`)
      csvRows.push(`Interest Months Remaining,${user.installment_duration || 0}`)
      csvRows.push(`Total Loan Balance,${totalLoanBalance}`)
      csvRows.push(`Fine,${user.fine || 0}`)
      csvRows.push("")
      csvRows.push(`Total,${totalAmount}`)
      csvRows.push("")
      csvRows.push("---")
      csvRows.push("")
    })

    const csvContent = csvRows.join("\n")
    console.log("[v0] CSV generated, rows:", csvRows.length)

    const filename = selectedUser
      ? `cash-bill-individual-${month || new Date().toISOString().split("T")[0]}.csv`
      : `cash-bill-all-members-${month || new Date().toISOString().split("T")[0]}.csv`

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating cash bill:", error)
    return NextResponse.json({ error: "Failed to generate cash bill", details: String(error) }, { status: 500 })
  }
}
