import theme from './theme';

const t = theme;

// Page
export const h1 = { fontSize: t.fontSize.xxxl, fontWeight: t.fontWeight.bold, marginBottom: t.spacing.xxl, color: t.colors.textPrimary };
export const h2 = { fontSize: t.fontSize.xl, fontWeight: t.fontWeight.semibold, marginBottom: t.spacing.lg, marginTop: t.spacing.xxxl };
export const pageHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.xl };

// Buttons
export const btn = { padding: '10px 20px', background: t.colors.primary, color: t.colors.white, border: 'none', borderRadius: t.radius.md, cursor: 'pointer', fontSize: t.fontSize.md, fontWeight: t.fontWeight.semibold, transition: 'all 0.2s' };
export const btnScan = { ...btn, background: t.colors.scan, marginRight: t.spacing.sm };
export const btnDanger = { padding: '6px 14px', background: t.colors.danger, color: t.colors.white, border: 'none', borderRadius: t.radius.sm, cursor: 'pointer', fontSize: t.fontSize.sm, marginLeft: t.spacing.sm, fontWeight: t.fontWeight.medium };
export const btnSmall = { padding: '6px 14px', background: t.colors.info, color: t.colors.white, border: 'none', borderRadius: t.radius.sm, cursor: 'pointer', fontSize: t.fontSize.sm, fontWeight: t.fontWeight.medium };
export const btnSmallDanger = { padding: '6px 14px', background: t.colors.danger, color: t.colors.white, border: 'none', borderRadius: t.radius.sm, cursor: 'pointer', fontSize: t.fontSize.sm, marginLeft: t.spacing.xs, fontWeight: t.fontWeight.medium };
export const btnOutline = { ...btn, background: t.colors.white, color: t.colors.primary, border: `2px solid ${t.colors.primary}`, marginRight: t.spacing.sm };
export const btnExport = { ...btn, background: t.colors.export };

// Tables
export const table = { width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: t.colors.bgCard, borderRadius: t.radius.lg, overflow: 'hidden', boxShadow: t.shadow.sm, border: `1px solid ${t.colors.border}` };
export const th = { textAlign: 'left', padding: '12px 16px', background: t.colors.bgTableHeader, fontSize: t.fontSize.xs, fontWeight: t.fontWeight.semibold, borderBottom: `2px solid ${t.colors.border}`, textTransform: 'uppercase', letterSpacing: '0.5px', color: t.colors.textSecondary };
export const td = { padding: '12px 16px', borderBottom: `1px solid ${t.colors.borderLight}`, fontSize: t.fontSize.base, color: t.colors.textPrimary };
export const tdEmpty = { ...td, color: t.colors.textMuted, textAlign: 'center', padding: '24px 16px' };

// Forms
export const form = { background: t.colors.bgCard, padding: t.spacing.xxxl, borderRadius: t.radius.xl, marginBottom: t.spacing.xl, boxShadow: t.shadow.md, border: `1px solid ${t.colors.border}` };
export const label = { display: 'block', fontSize: t.fontSize.md, fontWeight: t.fontWeight.semibold, marginBottom: t.spacing.xs, color: t.colors.textSecondary };
export const input = { width: '100%', padding: '10px 14px', border: `1.5px solid ${t.colors.gray300}`, borderRadius: t.radius.md, fontSize: t.fontSize.base, marginBottom: t.spacing.md, transition: 'border-color 0.2s', outline: 'none' };
export const textarea = { ...input, resize: 'vertical', fontFamily: 'inherit' };
export const select = { ...input, background: t.colors.white, appearance: 'auto' };
export const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: t.spacing.lg };
export const row3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: t.spacing.lg };

// Cards
export const card = { background: t.colors.bgCard, borderRadius: t.radius.xl, padding: t.spacing.xxl, boxShadow: t.shadow.md, border: `1px solid ${t.colors.border}` };
export const cardTitle = { fontSize: t.fontSize.xl, fontWeight: t.fontWeight.semibold, marginBottom: t.spacing.xs };

// Scan/AI
export const scanBox = { background: t.colors.scanBg, border: `2px dashed ${t.colors.scan}`, borderRadius: t.radius.xl, padding: t.spacing.xxl, marginBottom: t.spacing.xl, textAlign: 'center' };
export const spinner = { display: 'inline-block', width: 20, height: 20, border: `3px solid ${t.colors.gray300}`, borderTop: `3px solid ${t.colors.scan}`, borderRadius: '50%', animation: 'spin 1s linear infinite' };
export const scanLabel = { marginTop: t.spacing.md, color: t.colors.scan, fontWeight: t.fontWeight.semibold };

// Modal
export const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
export const modalContent = { background: t.colors.bgCard, borderRadius: t.radius.xl, padding: t.spacing.xl, maxWidth: '90vw', maxHeight: '90vh' };

// Badges
export const badge = { display: 'inline-block', padding: '3px 10px', borderRadius: t.radius.pill, fontSize: t.fontSize.sm, fontWeight: t.fontWeight.semibold };

// KPIs
export const kpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: t.spacing.lg, marginBottom: t.spacing.xxl };
export const kpiCard = { background: t.colors.bgCard, borderRadius: t.radius.xl, padding: t.spacing.xl, textAlign: 'center', boxShadow: t.shadow.md, border: `1px solid ${t.colors.border}` };
export const kpiVal = { fontSize: 28, fontWeight: t.fontWeight.bold, color: t.colors.primary };
export const kpiLabel = { fontSize: t.fontSize.sm, color: t.colors.textMuted, marginTop: t.spacing.xs };

// Tabs
export const tabBar = { display: 'flex', gap: 0, marginBottom: t.spacing.xxl, borderBottom: `2px solid ${t.colors.border}` };
export const tab = { padding: '12px 24px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -2, cursor: 'pointer', fontSize: t.fontSize.base, fontWeight: t.fontWeight.medium, color: t.colors.textMuted, transition: 'all 0.2s' };
export const tabActive = { ...tab, color: t.colors.primary, fontWeight: t.fontWeight.bold, borderBottom: `2px solid ${t.colors.primary}` };

// Attachments
export const attBox = { background: t.colors.gray50, borderRadius: t.radius.lg, padding: t.spacing.md, marginTop: t.spacing.sm };
export const attItem = { display: 'flex', alignItems: 'center', gap: t.spacing.sm, fontSize: t.fontSize.md, padding: '4px 0' };

// Filters
export const filterBar = { display: 'flex', gap: t.spacing.md, marginBottom: t.spacing.xl, alignItems: 'center', flexWrap: 'wrap' };
export const filterSelect = { padding: '10px 14px', border: `1.5px solid ${t.colors.gray300}`, borderRadius: t.radius.md, fontSize: t.fontSize.base, background: t.colors.white, marginRight: t.spacing.md };
export const searchInput = { padding: '10px 14px', border: `1.5px solid ${t.colors.gray300}`, borderRadius: t.radius.md, fontSize: t.fontSize.base, width: 300, marginBottom: t.spacing.xl };

// Pagination
export const pagination = { display: 'flex', gap: t.spacing.sm, marginTop: t.spacing.lg, alignItems: 'center' };

// Messages
export const msgSuccess = { padding: t.spacing.md, borderRadius: t.radius.md, marginTop: t.spacing.md, fontSize: t.fontSize.base, background: '#d4edda', color: '#155724' };
export const msgError = { padding: t.spacing.md, borderRadius: t.radius.md, marginTop: t.spacing.md, fontSize: t.fontSize.base, background: '#f8d7da', color: '#721c24' };

// Empty State
export const emptyState = { textAlign: 'center', padding: '48px 24px', color: t.colors.textMuted };
export const emptyIcon = { fontSize: 48, marginBottom: t.spacing.md, opacity: 0.4 };
export const emptyText = { fontSize: t.fontSize.base, color: t.colors.textMuted };
