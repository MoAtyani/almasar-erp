'use client'
import { useState, useMemo, useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────

export type MovementType =
  | 'sales'
  | 'purchases'
  | 'purchase_returns'
  | 'sales_returns'
  | 'stock_issue'
  | 'stock_transfer'
  | 'purchase_order'
  | 'picking_order'
  | 'stock_inward'

export type TaxType = 'all' | 'taxable' | 'zero_exempt' | 'zero_only' | 'exempt_only'
export type PostingStatus = 'all' | 'posted' | 'unposted'
export type PaymentMode = 'all' | 'cash' | 'credit'
export type SortOrder = 'by_date' | 'by_number'

export interface TransactionEntry {
  id: string
  voucher_number: number | string
  voucher_date: string
  warehouse_name: string
  account_client_name: string
  pre_tax_value: number      // القيمة قبل
  discount_value: number     // قيمة الخصم
  calculated_tax: number     // الضريبة المحتسبة
  grand_total: number        // القيمة بعد
  movement_type: MovementType
  tax_type: TaxType
  posting_status: 'posted' | 'unposted'
  payment_mode: 'cash' | 'credit'
  branch?: string
  supplier?: string
  sales_rep?: string
  system_user?: string
  target_account?: string
  cash_customer?: string
  destination_warehouse?: string
}

// ── Seed / Demo Data ───────────────────────────────────────────────────────

const SEED_TRANSACTIONS: TransactionEntry[] = [
  {
    id: 'tx-1',
    voucher_number: 14141,
    voucher_date: '2026-10-10',
    warehouse_name: 'المستودع الرئيسي',
    account_client_name: 'الشركة السعودية للكهرباء',
    pre_tax_value: 185000.000,
    discount_value: 5100.000,
    calculated_tax: 26985.000,
    grand_total: 206885.000,
    movement_type: 'sales',
    tax_type: 'taxable',
    posting_status: 'posted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: '',
    sales_rep: 'أحمد الغامدي',
    system_user: 'admin',
    target_account: '1200 - ذمم العملاء',
    cash_customer: '',
  },
  {
    id: 'tx-2',
    voucher_number: 14142,
    voucher_date: '2026-10-12',
    warehouse_name: 'مستودع المواد الخام',
    account_client_name: 'شنايدر إلكتريك السعودية',
    pre_tax_value: 78500.000,
    discount_value: 0.000,
    calculated_tax: 11775.000,
    grand_total: 90275.000,
    movement_type: 'purchases',
    tax_type: 'taxable',
    posting_status: 'posted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: 'شنايدر إلكتريك',
    sales_rep: '',
    system_user: 'purchasing_officer',
    target_account: '2100 - ذمم الموردين',
    cash_customer: '',
  },
  {
    id: 'tx-3',
    voucher_number: 14143,
    voucher_date: '2026-10-14',
    warehouse_name: 'المستودع الرئيسي',
    account_client_name: 'ريتال للوحات والهياكل المعدنية',
    pre_tax_value: 32000.000,
    discount_value: 1600.000,
    calculated_tax: 4560.000,
    grand_total: 34960.000,
    movement_type: 'purchase_returns',
    tax_type: 'taxable',
    posting_status: 'posted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: 'ريتال',
    sales_rep: '',
    system_user: 'admin',
    target_account: '2100 - ذمم الموردين',
    cash_customer: '',
  },
  {
    id: 'tx-4',
    voucher_number: 14144,
    voucher_date: '2026-10-15',
    warehouse_name: 'المستودع الرئيسي',
    account_client_name: 'عميل نقدي',
    pre_tax_value: 12500.000,
    discount_value: 500.000,
    calculated_tax: 1800.000,
    grand_total: 13800.000,
    movement_type: 'sales',
    tax_type: 'taxable',
    posting_status: 'posted',
    payment_mode: 'cash',
    branch: 'جدة',
    supplier: '',
    sales_rep: 'سلمى عمر',
    system_user: 'cashier_01',
    target_account: '1100 - الصندوق',
    cash_customer: 'محمد عبدالله',
  },
  {
    id: 'tx-5',
    voucher_number: 14145,
    voucher_date: '2026-10-18',
    warehouse_name: 'مستودع المواد الخام',
    account_client_name: 'مستودع الإنتاج',
    pre_tax_value: 45000.000,
    discount_value: 0.000,
    calculated_tax: 0.000,
    grand_total: 45000.000,
    movement_type: 'stock_transfer',
    tax_type: 'exempt_only',
    posting_status: 'posted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: '',
    sales_rep: '',
    system_user: 'warehouse_officer',
    target_account: '1300 - المخزون',
    destination_warehouse: 'مستودع الإنتاج',
    cash_customer: '',
  },
  {
    id: 'tx-6',
    voucher_number: 14146,
    voucher_date: '2026-10-20',
    warehouse_name: 'المستودع الرئيسي',
    account_client_name: 'شركة البواني للمقاولات',
    pre_tax_value: 94000.000,
    discount_value: 2820.000,
    calculated_tax: 13677.000,
    grand_total: 104857.000,
    movement_type: 'sales',
    tax_type: 'taxable',
    posting_status: 'posted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: '',
    sales_rep: 'أحمد الغامدي',
    system_user: 'admin',
    target_account: '1200 - ذمم العملاء',
    cash_customer: '',
  },
  {
    id: 'tx-7',
    voucher_number: 14147,
    voucher_date: '2026-10-22',
    warehouse_name: 'مستودع قطع الغيار',
    account_client_name: 'ABB Limited KSA',
    pre_tax_value: 55000.000,
    discount_value: 0.000,
    calculated_tax: 8250.000,
    grand_total: 63250.000,
    movement_type: 'stock_inward',
    tax_type: 'taxable',
    posting_status: 'unposted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: 'ABB Limited',
    sales_rep: '',
    system_user: 'purchasing_officer',
    target_account: '1300 - المخزون',
    cash_customer: '',
  },
  {
    id: 'tx-8',
    voucher_number: 14148,
    voucher_date: '2026-10-25',
    warehouse_name: 'المستودع الرئيسي',
    account_client_name: 'عميل نقدي',
    pre_tax_value: 8900.000,
    discount_value: 890.000,
    calculated_tax: 1201.500,
    grand_total: 9211.500,
    movement_type: 'sales_returns',
    tax_type: 'taxable',
    posting_status: 'posted',
    payment_mode: 'cash',
    branch: 'جدة',
    supplier: '',
    sales_rep: 'سلمى عمر',
    system_user: 'cashier_01',
    target_account: '1100 - الصندوق',
    cash_customer: 'خالد السعد',
  },
  {
    id: 'tx-9',
    voucher_number: 14149,
    voucher_date: '2026-10-28',
    warehouse_name: 'مستودع المواد الخام',
    account_client_name: 'مورد المواد الكهربائية',
    pre_tax_value: 29700.000,
    discount_value: 0.000,
    calculated_tax: 0.000,
    grand_total: 29700.000,
    movement_type: 'purchase_order',
    tax_type: 'zero_only',
    posting_status: 'unposted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: 'مورد المواد الكهربائية',
    sales_rep: '',
    system_user: 'purchasing_officer',
    target_account: '2100 - ذمم الموردين',
    cash_customer: '',
  },
  {
    id: 'tx-10',
    voucher_number: 14150,
    voucher_date: '2026-11-01',
    warehouse_name: 'مستودع الإنتاج',
    account_client_name: 'خط الإنتاج A',
    pre_tax_value: 18000.000,
    discount_value: 0.000,
    calculated_tax: 0.000,
    grand_total: 18000.000,
    movement_type: 'stock_issue',
    tax_type: 'exempt_only',
    posting_status: 'posted',
    payment_mode: 'credit',
    branch: 'الرياض',
    supplier: '',
    sales_rep: '',
    system_user: 'warehouse_officer',
    target_account: '5100 - تكلفة الإنتاج',
    cash_customer: '',
  },
]

// ── Movement Type / Tax Labels ─────────────────────────────────────────────

const MOVEMENT_TYPE_LABELS: Record<MovementType, { en: string; ar: string }> = {
  sales:            { en: 'Sales',                     ar: 'المبيعات' },
  purchases:        { en: 'Purchases',                 ar: 'المشتريات' },
  purchase_returns: { en: 'Purchase Returns',          ar: 'مرتجع المشتريات' },
  sales_returns:    { en: 'Sales Returns',             ar: 'مرتجع المبيعات' },
  stock_issue:      { en: 'Stock Issue (Outward)',      ar: 'الإخراج' },
  stock_transfer:   { en: 'Stock Transfer',            ar: 'التحويل' },
  purchase_order:   { en: 'Purchase Order',            ar: 'طلب الشراء' },
  picking_order:    { en: 'Picking / Prep Order',      ar: 'طلب التحضير' },
  stock_inward:     { en: 'Stock Inward (Receiving)',  ar: 'الإدخالات' },
}

const TAX_TYPE_LABELS: Record<TaxType, { en: string; ar: string }> = {
  all:          { en: 'All',                              ar: 'الكل' },
  taxable:      { en: 'Standard Taxable',                ar: 'الخاضعة للضريبة' },
  zero_exempt:  { en: 'Zero-Rated and Exempt',           ar: 'خاضعة بنسبة الصفر والمعفاة' },
  zero_only:    { en: 'Zero-Rated Only',                 ar: 'خاضعة بنسبة الصفر فقط' },
  exempt_only:  { en: 'Exempt Only',                     ar: 'المعفاة فقط' },
}

const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  sales:            '#22c55e',
  purchases:        '#3b82f6',
  purchase_returns: '#f59e0b',
  sales_returns:    '#f97316',
  stock_issue:      '#ef4444',
  stock_transfer:   '#8b5cf6',
  purchase_order:   '#06b6d4',
  picking_order:    '#ec4899',
  stock_inward:     '#10b981',
}

// ── Format helpers ─────────────────────────────────────────────────────────

function fmt3(val: number): string {
  return val.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch { return dateStr }
}

// ── Main Component ─────────────────────────────────────────────────────────

interface TransactionLedgerProps {
  onNewVoucher?: () => void
  extraData?: TransactionEntry[]
}

export default function TransactionLedger({ onNewVoucher, extraData }: TransactionLedgerProps) {
  const { isRtl } = useLanguage()

  // ── Filter State ────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('by_date')
  const [movementType, setMovementType] = useState<string>('all')
  const [taxType, setTaxType] = useState<TaxType>('all')
  const [voucherFrom, setVoucherFrom] = useState('')
  const [voucherTo, setVoucherTo] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [destWarehouse, setDestWarehouse] = useState('')
  const [branch, setBranch] = useState('')
  const [supplier, setSupplier] = useState('')
  const [salesRep, setSalesRep] = useState('')
  const [systemUser, setSystemUser] = useState('')
  const [targetAccount, setTargetAccount] = useState('')
  const [cashCustomer, setCashCustomer] = useState('')
  const [postingStatus, setPostingStatus] = useState<PostingStatus>('all')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('all')
  const [isQuerying, setIsQuerying] = useState(false)
  const [hasQueried, setHasQueried] = useState(true)

  // ── Applied Filters (snapshot on query run) ─────────────────────────────
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '', dateTo: '', sortOrder: 'by_date' as SortOrder,
    movementType: 'all', taxType: 'all' as TaxType,
    voucherFrom: '', voucherTo: '',
    warehouse: '', destWarehouse: '', branch: '',
    supplier: '', salesRep: '', systemUser: '',
    targetAccount: '', cashCustomer: '',
    postingStatus: 'all' as PostingStatus,
    paymentMode: 'all' as PaymentMode,
  })

  const allTransactions = useMemo(() => [
    ...SEED_TRANSACTIONS,
    ...(extraData || []),
  ], [extraData])

  // ── Run Query ────────────────────────────────────────────────────────────
  const handleQuery = useCallback(async () => {
    setIsQuerying(true)
    // Simulate async query delay
    await new Promise(res => setTimeout(res, 600))
    setAppliedFilters({
      dateFrom, dateTo, sortOrder,
      movementType, taxType,
      voucherFrom, voucherTo,
      warehouse, destWarehouse, branch,
      supplier, salesRep, systemUser,
      targetAccount, cashCustomer,
      postingStatus, paymentMode,
    })
    setHasQueried(true)
    setIsQuerying(false)
  }, [
    dateFrom, dateTo, sortOrder, movementType, taxType,
    voucherFrom, voucherTo, warehouse, destWarehouse, branch,
    supplier, salesRep, systemUser, targetAccount, cashCustomer,
    postingStatus, paymentMode,
  ])

  // ── Filtered + Sorted Data ────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!hasQueried) return []

    let rows = [...allTransactions]

    // Date range
    if (appliedFilters.dateFrom) {
      rows = rows.filter(r => r.voucher_date >= appliedFilters.dateFrom)
    }
    if (appliedFilters.dateTo) {
      rows = rows.filter(r => r.voucher_date <= appliedFilters.dateTo)
    }

    // Movement type
    if (appliedFilters.movementType !== 'all') {
      rows = rows.filter(r => r.movement_type === appliedFilters.movementType)
    }

    // Tax type
    if (appliedFilters.taxType !== 'all') {
      if (appliedFilters.taxType === 'zero_exempt') {
        rows = rows.filter(r => r.tax_type === 'zero_only' || r.tax_type === 'exempt_only')
      } else {
        rows = rows.filter(r => r.tax_type === appliedFilters.taxType)
      }
    }

    // Voucher number range
    if (appliedFilters.voucherFrom) {
      rows = rows.filter(r => Number(r.voucher_number) >= Number(appliedFilters.voucherFrom))
    }
    if (appliedFilters.voucherTo) {
      rows = rows.filter(r => Number(r.voucher_number) <= Number(appliedFilters.voucherTo))
    }

    // Warehouse
    if (appliedFilters.warehouse.trim()) {
      rows = rows.filter(r => r.warehouse_name.toLowerCase().includes(appliedFilters.warehouse.toLowerCase()))
    }

    // Destination warehouse
    if (appliedFilters.destWarehouse.trim()) {
      rows = rows.filter(r => (r.destination_warehouse || '').toLowerCase().includes(appliedFilters.destWarehouse.toLowerCase()))
    }

    // Branch
    if (appliedFilters.branch.trim()) {
      rows = rows.filter(r => (r.branch || '').toLowerCase().includes(appliedFilters.branch.toLowerCase()))
    }

    // Supplier
    if (appliedFilters.supplier.trim()) {
      rows = rows.filter(r => (r.supplier || '').toLowerCase().includes(appliedFilters.supplier.toLowerCase()))
    }

    // Sales rep
    if (appliedFilters.salesRep.trim()) {
      rows = rows.filter(r => (r.sales_rep || '').toLowerCase().includes(appliedFilters.salesRep.toLowerCase()))
    }

    // System user
    if (appliedFilters.systemUser.trim()) {
      rows = rows.filter(r => (r.system_user || '').toLowerCase().includes(appliedFilters.systemUser.toLowerCase()))
    }

    // Target account
    if (appliedFilters.targetAccount.trim()) {
      rows = rows.filter(r => (r.target_account || '').toLowerCase().includes(appliedFilters.targetAccount.toLowerCase()))
    }

    // Cash customer
    if (appliedFilters.cashCustomer.trim()) {
      rows = rows.filter(r => (r.cash_customer || '').toLowerCase().includes(appliedFilters.cashCustomer.toLowerCase()))
    }

    // Posting status
    if (appliedFilters.postingStatus !== 'all') {
      rows = rows.filter(r => r.posting_status === appliedFilters.postingStatus)
    }

    // Payment mode
    if (appliedFilters.paymentMode !== 'all') {
      rows = rows.filter(r => r.payment_mode === appliedFilters.paymentMode)
    }

    // Sort
    rows.sort((a, b) => {
      if (appliedFilters.sortOrder === 'by_number') {
        return Number(a.voucher_number) - Number(b.voucher_number)
      }
      return a.voucher_date.localeCompare(b.voucher_date)
    })

    return rows
  }, [allTransactions, appliedFilters, hasQueried])

  // ── Aggregates ────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    preTax:   filteredData.reduce((s, r) => s + r.pre_tax_value, 0),
    discount: filteredData.reduce((s, r) => s + r.discount_value, 0),
    tax:      filteredData.reduce((s, r) => s + r.calculated_tax, 0),
    grand:    filteredData.reduce((s, r) => s + r.grand_total, 0),
  }), [filteredData])

  // ── Shared input style ───────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    color: 'var(--text-primary)',
    width: '100%',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  }

  const fieldGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }

  return (
    <div style={{ fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          FILTER PANEL
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {isRtl ? 'معايير الاستعلام — قائمة بالحركات' : 'Query Criteria — Transactions Ledger'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {isRtl ? 'حدد الفترة ونوع الحركة والمعايير المطلوبة ثم اضغط استعلام' : 'Set period, movement type and criteria, then run query'}
            </div>
          </div>
        </div>

        {/* ── A: Date Range & Sort ─────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 12, letterSpacing: 0.5 }}>
            {isRtl ? 'أ — الفترة الزمنية والترتيب' : 'A — Date Range & Sort Order'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'بداية الفترة' : 'Period Start'}</label>
              <input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'نهاية الفترة' : 'Period End'}</label>
              <input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'الترتيب' : 'Sort By'}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                  <input
                    type="radio"
                    name="sortOrder"
                    value="by_date"
                    checked={sortOrder === 'by_date'}
                    onChange={() => setSortOrder('by_date')}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {isRtl ? 'حسب تاريخ السند' : 'By Voucher Date'}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                  <input
                    type="radio"
                    name="sortOrder"
                    value="by_number"
                    checked={sortOrder === 'by_number'}
                    onChange={() => setSortOrder('by_number')}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {isRtl ? 'ترتيب حسب الرقم' : 'By Voucher Number'}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── B+C: Movement Type & Tax Classification ──────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 12, letterSpacing: 0.5 }}>
            {isRtl ? 'ب — نوع الحركة والضريبة' : 'B — Movement Type & Tax Classification'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'نوع الحركة' : 'Movement Type'}</label>
              <select style={inputStyle} value={movementType} onChange={e => setMovementType(e.target.value)}>
                <option value="all">{isRtl ? '— الكل —' : '— All Types —'}</option>
                {(Object.entries(MOVEMENT_TYPE_LABELS) as [MovementType, {en:string;ar:string}][]).map(([k, v]) => (
                  <option key={k} value={k}>{isRtl ? v.ar : v.en}</option>
                ))}
              </select>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'نوع الضريبة' : 'Tax Classification'}</label>
              <select style={inputStyle} value={taxType} onChange={e => setTaxType(e.target.value as TaxType)}>
                {(Object.entries(TAX_TYPE_LABELS) as [TaxType, {en:string;ar:string}][]).map(([k, v]) => (
                  <option key={k} value={k}>{isRtl ? v.ar : v.en}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── D: Numerical & Entity Range Filters ──────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 12, letterSpacing: 0.5 }}>
            {isRtl ? 'ج — نطاقات الأرقام والجهات' : 'C — Number Ranges & Entity Filters'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>

            {/* Voucher number range */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'من رقم السند' : 'Voucher # From'}</label>
              <input
                type="number"
                style={inputStyle}
                placeholder={isRtl ? 'من رقم' : 'From #'}
                value={voucherFrom}
                onChange={e => setVoucherFrom(e.target.value)}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'إلى رقم السند' : 'Voucher # To'}</label>
              <input
                type="number"
                style={inputStyle}
                placeholder={isRtl ? 'إلى رقم' : 'To #'}
                value={voucherTo}
                onChange={e => setVoucherTo(e.target.value)}
              />
            </div>

            {/* Warehouse */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'المستودع' : 'Warehouse'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={isRtl ? 'اسم المستودع' : 'Warehouse name'}
                  value={warehouse}
                  onChange={e => setWarehouse(e.target.value)}
                />
                <button
                  title={isRtl ? 'بحث في المستودعات' : 'Browse warehouses'}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >🏭</button>
              </div>
            </div>

            {/* Destination Warehouse */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'مستودع المحول إليه' : 'Destination Warehouse'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={isRtl ? 'للتحويل فقط' : 'Transfer only'}
                  value={destWarehouse}
                  onChange={e => setDestWarehouse(e.target.value)}
                />
                <button
                  title={isRtl ? 'بحث في المستودعات' : 'Browse warehouses'}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >🔀</button>
              </div>
            </div>

            {/* Branch */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'الفرع' : 'Branch'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={isRtl ? 'الفرع / الموقع' : 'Branch / Location'}
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                />
                <button
                  title={isRtl ? 'بحث الفروع' : 'Browse branches'}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >🏢</button>
              </div>
            </div>

            {/* Supplier */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'المورد' : 'Supplier / Vendor'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={isRtl ? 'اسم المورد' : 'Vendor name'}
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                />
                <button
                  title={isRtl ? 'بحث الموردين' : 'Browse vendors'}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >🔎</button>
              </div>
            </div>

            {/* Sales Rep */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'المندوب' : 'Sales Rep / Agent'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={isRtl ? 'اسم المندوب' : 'Rep name'}
                  value={salesRep}
                  onChange={e => setSalesRep(e.target.value)}
                />
                <button
                  title={isRtl ? 'بحث المندوبين' : 'Browse reps'}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >👤</button>
              </div>
            </div>

            {/* System User */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'المستخدم' : 'System User'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={isRtl ? 'اسم المستخدم' : 'Username'}
                  value={systemUser}
                  onChange={e => setSystemUser(e.target.value)}
                />
                <button
                  title={isRtl ? 'بحث المستخدمين' : 'Browse users'}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >🔑</button>
              </div>
            </div>

            {/* Target Account */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'الحساب المراد معرفة حركاته' : 'Target Account'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={isRtl ? 'كود أو اسم الحساب' : 'Account code or name'}
                  value={targetAccount}
                  onChange={e => setTargetAccount(e.target.value)}
                />
                <button
                  title={isRtl ? 'بحث الحسابات' : 'Browse accounts'}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >📒</button>
              </div>
            </div>

            {/* Cash Customer */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>{isRtl ? 'إسم العميل نقدي' : 'Cash Customer Name'}</label>
              <input
                type="text"
                style={inputStyle}
                placeholder={isRtl ? 'اسم العميل النقدي' : 'Cash customer name'}
                value={cashCustomer}
                onChange={e => setCashCustomer(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── E: Status & Payment Radios ───────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 12, letterSpacing: 0.5 }}>
            {isRtl ? 'د — حالة الترحيل وطريقة الدفع' : 'D — Posting Status & Payment Mode'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>

            {/* Posting Status */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                {isRtl ? 'حالة الترحيل:' : 'Posting Status:'}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {(['all', 'posted', 'unposted'] as PostingStatus[]).map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="postingStatus"
                      value={s}
                      checked={postingStatus === s}
                      onChange={() => setPostingStatus(s)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {s === 'all'
                      ? (isRtl ? 'الكل' : 'All')
                      : s === 'posted'
                      ? (isRtl ? 'الفواتير المرحلة' : 'Posted')
                      : (isRtl ? 'الغير مرحلة' : 'Unposted / Draft')
                    }
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                {isRtl ? 'طريقة الدفع:' : 'Payment Mode:'}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {(['all', 'cash', 'credit'] as PaymentMode[]).map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="paymentMode"
                      value={m}
                      checked={paymentMode === m}
                      onChange={() => setPaymentMode(m)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {m === 'all'
                      ? (isRtl ? 'الكل' : 'All')
                      : m === 'cash'
                      ? (isRtl ? 'نقدي' : 'Cash')
                      : (isRtl ? 'ذمم (آجل)' : 'Credit / On Account')
                    }
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: isRtl ? 'flex-start' : 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            onClick={() => onNewVoucher?.()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 20px',
              background: 'var(--success-dim)',
              border: '1px solid var(--success)',
              borderRadius: 8,
              color: 'var(--success)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <span>📝</span>
            {isRtl ? 'إدخال سند جديد' : 'New Voucher Entry'}
          </button>
          <button
            onClick={handleQuery}
            disabled={isQuerying}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 28px',
              background: isQuerying ? 'var(--accent-dim)' : 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              color: isQuerying ? 'var(--accent)' : '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: isQuerying ? 'wait' : 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {isQuerying ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(14,165,233,0.3)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                {isRtl ? 'جاري الاستعلام...' : 'Querying...'}
              </>
            ) : (
              <>
                <span>🔍</span>
                {isRtl ? 'استعلام جديد' : 'Run Query'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RESULTS TABLE
          ═══════════════════════════════════════════════════════════════════ */}
      {hasQueried && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Table Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  {isRtl ? 'قائمة بالحركات' : 'Transactions & Movement Ledger'}
                </span>
                <span style={{
                  marginInlineStart: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 10px',
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  borderRadius: 20,
                  border: '1px solid var(--accent)',
                }}>
                  {filteredData.length} {isRtl ? 'سند' : 'records'}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {isRtl ? 'الأرقام بـ 3 خانات عشرية' : '3-decimal precision amounts'}
            </div>
          </div>

          {/* Scrollable Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              direction: isRtl ? 'rtl' : 'ltr',
            }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
                  <th style={thStyle(isRtl)}>{isRtl ? 'نوع الحركة' : 'Movement'}</th>
                  <th style={thStyle(isRtl)}>{isRtl ? 'إسم المستودع' : 'Warehouse'}</th>
                  <th style={thStyle(isRtl)}>{isRtl ? 'رقم السند' : 'Voucher #'}</th>
                  <th style={thStyle(isRtl)}>{isRtl ? 'تاريخ السند' : 'Date'}</th>
                  <th style={thStyle(isRtl)}>{isRtl ? 'إسم الحساب / العميل' : 'Account / Client'}</th>
                  <th style={{ ...thStyle(isRtl), textAlign: 'end' }}>{isRtl ? 'القيمة قبل' : 'Pre-Tax'}</th>
                  <th style={{ ...thStyle(isRtl), textAlign: 'end' }}>{isRtl ? 'قيمة الخصم' : 'Discount'}</th>
                  <th style={{ ...thStyle(isRtl), textAlign: 'end' }}>{isRtl ? 'الضريبة المحتسبة' : 'Tax (VAT)'}</th>
                  <th style={{ ...thStyle(isRtl), textAlign: 'end' }}>{isRtl ? 'القيمة بعد' : 'Grand Total'}</th>
                  <th style={thStyle(isRtl)}>{isRtl ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                      {isRtl ? 'لا توجد حركات مطابقة لمعايير البحث المحددة.' : 'No transactions match the selected filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => {
                    const mvLabel = MOVEMENT_TYPE_LABELS[row.movement_type]
                    const mvColor = MOVEMENT_TYPE_COLORS[row.movement_type]
                    const isEven = idx % 2 === 0

                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: isEven ? 'transparent' : 'rgba(255,255,255,0.025)',
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = isEven ? 'transparent' : 'rgba(255,255,255,0.025)')}
                      >
                        {/* Movement Type Badge */}
                        <td style={tdStyle(isRtl)}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: `${mvColor}18`,
                            color: mvColor,
                            border: `1px solid ${mvColor}40`,
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: mvColor, flexShrink: 0 }} />
                            {isRtl ? mvLabel.ar : mvLabel.en}
                          </span>
                        </td>

                        {/* Warehouse */}
                        <td style={tdStyle(isRtl)}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                            {row.warehouse_name}
                          </span>
                        </td>

                        {/* Voucher Number */}
                        <td style={tdStyle(isRtl)}>
                          <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', fontSize: 13 }}>
                            {row.voucher_number}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={tdStyle(isRtl)}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {fmtDate(row.voucher_date)}
                          </span>
                        </td>

                        {/* Account / Client */}
                        <td style={{ ...tdStyle(isRtl), maxWidth: 180 }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                            {row.account_client_name}
                          </div>
                          {row.cash_customer && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {isRtl ? 'نقدي:' : 'Cash:'} {row.cash_customer}
                            </div>
                          )}
                        </td>

                        {/* Pre-Tax */}
                        <td style={{ ...tdStyle(isRtl), textAlign: 'end', fontFamily: 'monospace' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{fmt3(row.pre_tax_value)}</span>
                        </td>

                        {/* Discount */}
                        <td style={{ ...tdStyle(isRtl), textAlign: 'end', fontFamily: 'monospace' }}>
                          <span style={{ color: row.discount_value > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {fmt3(row.discount_value)}
                          </span>
                        </td>

                        {/* Tax */}
                        <td style={{ ...tdStyle(isRtl), textAlign: 'end', fontFamily: 'monospace' }}>
                          <span style={{ color: row.calculated_tax > 0 ? 'var(--purple)' : 'var(--text-muted)' }}>
                            {fmt3(row.calculated_tax)}
                          </span>
                        </td>

                        {/* Grand Total */}
                        <td style={{ ...tdStyle(isRtl), textAlign: 'end', fontFamily: 'monospace' }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                            {fmt3(row.grand_total)}
                          </span>
                        </td>

                        {/* Posting Status */}
                        <td style={tdStyle(isRtl)}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: row.posting_status === 'posted' ? 'var(--success-dim)' : 'var(--warning-dim)',
                              color: row.posting_status === 'posted' ? 'var(--success)' : 'var(--warning)',
                              border: `1px solid ${row.posting_status === 'posted' ? 'var(--success)' : 'var(--warning)'}40`,
                            }}>
                              {row.posting_status === 'posted'
                                ? (isRtl ? 'مرحل' : 'Posted')
                                : (isRtl ? 'غير مرحل' : 'Unposted')
                              }
                            </span>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              background: row.payment_mode === 'cash' ? 'rgba(16,185,129,0.12)' : 'var(--accent-dim)',
                              color: row.payment_mode === 'cash' ? 'var(--success)' : 'var(--accent)',
                            }}>
                              {row.payment_mode === 'cash'
                                ? (isRtl ? '💵 نقدي' : '💵 Cash')
                                : (isRtl ? '📄 ذمم' : '📄 Credit')
                              }
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              STICKY FOOTER SUMMARY BAR
              ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            borderTop: '2px solid var(--border)',
            background: 'var(--bg-elevated)',
            padding: '14px 20px',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Pre-Tax Total */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isRtl ? 'القيمة قبل' : 'Pre-Tax Total'}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  {fmt3(totals.preTax)}
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

              {/* Discount Total */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isRtl ? 'الخصم' : 'Total Discount'}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--warning)' }}>
                  {fmt3(totals.discount)}
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

              {/* Tax Total */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isRtl ? 'الضريبة المحتسبة' : 'Total VAT'}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--purple)' }}>
                  {fmt3(totals.tax)}
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

              {/* Grand Total */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isRtl ? 'الإجمالي الكلي' : 'Grand Total'}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 17, color: 'var(--accent)' }}>
                  {fmt3(totals.grand)}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => onNewVoucher?.()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 16px',
                  background: 'var(--success-dim)',
                  border: '1px solid var(--success)',
                  borderRadius: 7,
                  color: 'var(--success)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                📝 {isRtl ? 'إدخال سند جديد' : 'New Voucher'}
              </button>
              <button
                onClick={handleQuery}
                disabled={isQuerying}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 16px',
                  background: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 7,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isQuerying ? 'wait' : 'pointer',
                  opacity: isQuerying ? 0.7 : 1,
                }}
              >
                🔍 {isRtl ? 'استعلام جديد' : 'Run Query'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Style Helpers ──────────────────────────────────────────────────────────

function thStyle(isRtl: boolean): React.CSSProperties {
  return {
    padding: '10px 14px',
    textAlign: isRtl ? 'right' : 'left',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
  }
}

function tdStyle(isRtl: boolean): React.CSSProperties {
  return {
    padding: '10px 14px',
    textAlign: isRtl ? 'right' : 'left',
    verticalAlign: 'middle',
    fontSize: 13,
  }
}

