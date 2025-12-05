-- Normalize database by removing duplicate loan data from profiles table
-- Keep only core member information in profiles

-- Remove duplicate loan fields from profiles (these should come from loans table)
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS loan_balance,
  DROP COLUMN IF EXISTS monthly_interest_received,
  DROP COLUMN IF EXISTS previous_month_interest,
  DROP COLUMN IF EXISTS installment_loan_taken,
  DROP COLUMN IF EXISTS installment_duration,
  DROP COLUMN IF EXISTS installment_taken,
  DROP COLUMN IF EXISTS installment_months,
  DROP COLUMN IF EXISTS monthly_emi,
  DROP COLUMN IF EXISTS emi_balance,
  DROP COLUMN IF EXISTS emi_interest,
  DROP COLUMN IF EXISTS installment_loan_bought;

-- Keep only core member fields in profiles:
-- - member_id (unique identifier like V01, V02)
-- - monthly_subscription (fixed monthly contribution amount)
-- - fine (any penalty amount)

-- Add comments to clarify data ownership
COMMENT ON TABLE public.profiles IS 'Core member information - name, contact, subscription, role';
COMMENT ON TABLE public.loans IS 'All loan records - amount, interest, EMI details, balance';
COMMENT ON TABLE public.loan_payments IS 'Monthly payment history - interest paid, principal paid, status';
COMMENT ON TABLE public.monthly_contributions IS 'Monthly subscription payment tracking';

-- Ensure loans table has all necessary fields
ALTER TABLE public.loans 
  ADD COLUMN IF NOT EXISTS loan_balance DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_loan_taken DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_duration_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_emi_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emi_balance DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emi_monthly_interest DECIMAL(10, 2) DEFAULT 0;

-- Create view for easy cash bill data retrieval
CREATE OR REPLACE VIEW public.member_cash_bill_data AS
SELECT 
  p.id as user_id,
  p.member_id,
  p.full_name as name,
  p.monthly_subscription as subscription_income,
  COALESCE(SUM(l.loan_balance), 0) as principal_balance,
  COALESCE(SUM(l.amount * l.interest_rate / 100 / 12), 0) as monthly_interest,
  COALESCE(SUM(l.loan_balance + (l.loan_balance * l.interest_rate / 100)), 0) as updated_principal_balance,
  COALESCE(SUM(l.monthly_emi_amount), 0) as monthly_installment,
  COALESCE(SUM(l.emi_monthly_interest), 0) as installment_interest,
  COALESCE(MAX(l.installment_duration_months), 0) as interest_months_remaining,
  COALESCE(SUM(l.loan_balance + l.emi_balance), 0) as total_loan_balance,
  COALESCE(p.fine, 0) as fine,
  COALESCE(p.monthly_subscription, 0) + 
    COALESCE(SUM(l.amount * l.interest_rate / 100 / 12), 0) + 
    COALESCE(SUM(l.monthly_emi_amount), 0) + 
    COALESCE(SUM(l.emi_monthly_interest), 0) + 
    COALESCE(p.fine, 0) as total_to_be_paid
FROM public.profiles p
LEFT JOIN public.loans l ON p.id = l.user_id AND l.status IN ('active', 'approved')
WHERE p.role = 'user'
GROUP BY p.id, p.member_id, p.full_name, p.monthly_subscription, p.fine
ORDER BY p.member_id;

-- Grant access to the view
GRANT SELECT ON public.member_cash_bill_data TO authenticated;

COMMENT ON VIEW public.member_cash_bill_data IS 'Normalized view combining profiles and loans for cash bill generation';
