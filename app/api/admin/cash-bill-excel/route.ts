// app/api/admin/cash-bill-excel/route.ts
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"

type AnyObj = Record<string, any>

/**
 * Defensive helper: extract voucher from explicit fields or trailing token in full_name.
 */
function cleanNameAndVoucher(user: AnyObj) {
  const rawName = user.full_name ? String(user.full_name).trim() : ""
  // prefer explicit voucher-like fields
  const explicit = (user.voucher_no ?? user.voucher ?? user.member_id ?? "").toString().trim()
  const explicitMatch = explicit.match(/\bV[-]?\d{1,6}\b/i)
  if (explicitMatch) {
    const voucher = explicitMatch[0].toUpperCase()
    const cleanedName = rawName.replace(new RegExp(`(?:[\\s,\\-\$$\$$]*)${voucher}$`, "i"), "").trim()
    return { name: cleanedName || rawName, voucher }
  }

  const trailingRegex = /^(.*?)[\s,-]*(?:[$$#]?)(V[-]?\s*\d{1,6})(?:[$$]?)\s*$/i
  const m = rawName.match(trailingRegex)
  if (m) {
    const namePart = (m[1] || "").trim()
    const voucher = (m[2] || "").replace(/\s+/g, "").toUpperCase()
    return { name: namePart || rawName, voucher }
  }

  return { name: rawName, voucher: "" }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Cash bill API called")
    const { selectedUser } = await request.json()

    const supabase = await createClient()

    let query = supabase.from("member_cash_bill_data").select("*")

    if (selectedUser) {
      query = query.eq("user_id", selectedUser)
    }

    const { data: users, error } = await query

    if (error) {
      console.error("[v0] Error fetching cash bill data:", error)
      return NextResponse.json({ error: "Failed to fetch cash bill data", details: error.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "No users found" }, { status: 404 })
    }

    console.log("[v0] Fetched cash bill data for", users.length, "users")

    const wb = new ExcelJS.Workbook()
    wb.creator = "Financial Community App"
    wb.created = new Date()
    const ws = wb.addWorksheet("Cash Bills")

    // Columns A..G (A blank, B-C left bill, D-E gap, F-G right bill)
    ws.getColumn(1).width = 4
    ws.getColumn(2).width = 35.22
    ws.getColumn(3).width = 26.1
    ws.getColumn(4).width = 5.84
    ws.getColumn(5).width = 5.84
    ws.getColumn(6).width = 26.1
    ws.getColumn(7).width = 26.21

    const blueARGB = "FF0B2E6F"
    const thinSide = { style: "thin", color: { argb: "FF000000" } }
    const thickSide = { style: "medium", color: { argb: "FF000000" } }
    const borderThin = { top: thinSide, left: thinSide, bottom: thinSide, right: thinSide }

    const safeNum = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }
    const formatDateDDMMYYYY = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0")
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }

    function applyThinBorderRange(top: number, left: number, bottom: number, right: number) {
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const cell = ws.getCell(r, c)
          cell.border = { ...cell.border, ...borderThin }
        }
      }
    }
    function applyOuterThickBorder(top: number, left: number, bottom: number, right: number) {
      for (let c = left; c <= right; c++) {
        ws.getCell(top, c).border = { ...ws.getCell(top, c).border, top: thickSide }
        ws.getCell(bottom, c).border = { ...ws.getCell(bottom, c).border, bottom: thickSide }
      }
      for (let r = top; r <= bottom; r++) {
        ws.getCell(r, left).border = { ...ws.getCell(r, left).border, left: thickSide }
        ws.getCell(r, right).border = { ...ws.getCell(r, right).border, right: thickSide }
      }
    }

    function placeBillAt(user: AnyObj, topRow: number, leftCol: number) {
      const { name: pureName, voucher: extractedVoucher } = cleanNameAndVoucher(user)
      let voucher = extractedVoucher || (user.member_id ?? "")
      if (typeof voucher === "string") voucher = voucher.trim()

      const subscription_income = safeNum(user.subscription_income)
      const principal_balance = safeNum(user.loan_balance) // was principal_balance
      const monthly_interest = safeNum(user.monthly_interest)
      const updated_principal_balance = safeNum(user.updated_principal_balance)
      const monthly_installment = safeNum(user.monthly_installment)
      const installment_interest = safeNum(user.installment_interest)
      const interest_months_remaining = safeNum(user.interest_months)
      const total_loan_balance = safeNum(user.total_loan_balance)
      const fine = safeNum(user.fine)
      const total_to_be_paid = safeNum(user.total_amount_to_pay) // was total_to_be_paid

      const bottomRow = topRow + 13
      for (let r = topRow; r <= bottomRow; r++) ws.getRow(r).height = 20

      ws.mergeCells(topRow, leftCol, topRow, leftCol + 1)
      ws.getCell(topRow, leftCol).value = "CASH BILL MEETING 85"
      ws.getCell(topRow, leftCol).font = { size: 13, bold: true, color: { argb: blueARGB } }
      ws.getCell(topRow, leftCol).alignment = { horizontal: "center", vertical: "middle" }

      ws.mergeCells(topRow + 1, leftCol, topRow + 1, leftCol + 1)
      ws.getCell(topRow + 1, leftCol).value = `Date: ${formatDateDDMMYYYY(new Date())}`
      ws.getCell(topRow + 1, leftCol).font = { size: 11, color: { argb: blueARGB } }
      ws.getCell(topRow + 1, leftCol).alignment = { horizontal: "center", vertical: "middle" }

      ws.getCell(topRow + 2, leftCol).value = `Name: ${pureName}`.trim()
      ws.getCell(topRow + 2, leftCol).font = { size: 11, color: { argb: blueARGB } }
      ws.getCell(topRow + 2, leftCol).alignment = { horizontal: "left", vertical: "middle" }

      ws.getCell(topRow + 2, leftCol + 1).value = null
      if (voucher) {
        ws.getCell(topRow + 2, leftCol + 1).value = String(voucher)
        ws.getCell(topRow + 2, leftCol + 1).font = { size: 18, bold: true, color: { argb: blueARGB } }
        ws.getCell(topRow + 2, leftCol + 1).alignment = { horizontal: "center", vertical: "middle" }
      }

      const hdrRow = topRow + 3
      ws.getCell(hdrRow, leftCol).value = "Description"
      ws.getCell(hdrRow, leftCol + 1).value = "Amount to be Paid"
      ws.getCell(hdrRow, leftCol).font = { bold: true, color: { argb: blueARGB } }
      ws.getCell(hdrRow, leftCol + 1).font = { bold: true, color: { argb: blueARGB } }
      ws.getCell(hdrRow, leftCol).alignment = { horizontal: "left", vertical: "middle" }
      ws.getCell(hdrRow, leftCol + 1).alignment = { horizontal: "right", vertical: "middle" }

      const rows: [string, number][] = [
        ["Subscription Income", subscription_income],
        ["Principal Balance", principal_balance],
        ["Interest", monthly_interest],
        ["Principal Balance", updated_principal_balance],
        ["Monthly Installment / Month", monthly_installment],
        ["Installment Interest", installment_interest],
        ["Interest Months", interest_months_remaining],
        ["Total Loan Balance", total_loan_balance],
        ["Fine", fine],
      ]

      let rr = hdrRow + 1
      for (const [label, amt] of rows) {
        ws.getCell(rr, leftCol).value = label
        ws.getCell(rr, leftCol + 1).value = amt
        ws.getCell(rr, leftCol + 1).alignment = { horizontal: "right", vertical: "middle" }
        rr++
      }

      ws.getCell(rr, leftCol).value = "Total"
      ws.getCell(rr, leftCol).font = { bold: true }
      ws.getCell(rr, leftCol + 1).value = total_to_be_paid
      ws.getCell(rr, leftCol + 1).font = { bold: true }
      ws.getCell(rr, leftCol + 1).alignment = { horizontal: "right", vertical: "middle" }

      applyThinBorderRange(topRow, leftCol, rr, leftCol + 1)
      applyOuterThickBorder(topRow, leftCol, rr, leftCol + 1)

      return rr - topRow + 1
    }

    const startRow = 2
    const startLeftCol = 2 // B
    const gapCols = 2 // D & E
    const verticalGapRows = 2

    let cursorRow = startRow
    for (let i = 0; i < users.length; i += 2) {
      const leftUsedRows = placeBillAt(users[i], cursorRow, startLeftCol)

      if (i + 1 < users.length) {
        const rightLeftCol = startLeftCol + 2 + gapCols // 6 (F)
        const rightUsedRows = placeBillAt(users[i + 1], cursorRow, rightLeftCol)
        const used = Math.max(leftUsedRows, rightUsedRows)
        cursorRow = cursorRow + used + verticalGapRows
      } else {
        cursorRow = cursorRow + leftUsedRows + verticalGapRows
      }
    }

    const sanitizeFilename = (s: string) => (s || "").replace(/[^a-z0-9_\-.]/gi, "_")
    let filename: string
    if (selectedUser) {
      const single = users[0]
      const base =
        (single.name && String(single.name).trim()) ||
        (single.member_id && String(single.member_id).trim()) ||
        String(single.user_id || selectedUser)
      filename = `cash-bill-${sanitizeFilename(base)}-${new Date().toISOString().split("T")[0]}.xlsx`
    } else {
      filename = `cash-bill-all-members-${new Date().toISOString().split("T")[0]}.xlsx`
    }

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[v0] Error generating cash bill:", err)
    return NextResponse.json({ error: "Failed to generate cash bill", details: String(err) }, { status: 500 })
  }
}
