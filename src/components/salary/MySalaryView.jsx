import { IndianRupee, Download, Calendar, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import SalaryBreakdownCard from './SalaryBreakdownCard';
import DailyBreakdownTable from './DailyBreakdownTable';
import BonusDetailsCard from './BonusDetailsCard';
import { generateSalarySlip } from '../../utils/salaryPdf';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

export default function MySalaryView({ record, currentMonth }) {
  const { userDoc } = useAuth();
  
  if (!record) {
    return (
      <div style={emptyStateStyle}>
        <div style={emptyIconStyle}><IndianRupee size={48} color="var(--color-secondary-text)" /></div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>No Salary Data Found</h3>
        <p style={{ color: 'var(--color-secondary-text)', maxWidth: 360, margin: '0 0 24px', lineHeight: 1.6 }}>
          Your salary record for {format(currentMonth, 'MMMM yyyy')} hasn't been generated yet. 
          Please check back later or contact HR.
        </p>
      </div>
    );
  }

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Premium Payslip Header */}
      <div style={payslipHeaderStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-primary)', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
              <ShieldCheck size={24} /> INDEED CONTENT CREATION
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 500 }}>OFFICIAL MONTHLY PAYSLIP</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{format(currentMonth, 'MMMM yyyy')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>Reference: {record.id}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Employee Name</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 24 }}>{userDoc?.name}</div>
            
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-secondary-text)', textTransform: 'uppercase', marginBottom: 4 }}>Designation</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{userDoc?.role || 'Designer'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-secondary-text)', textTransform: 'uppercase', marginBottom: 4 }}>Daily Rate</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>₹{record?.dailyRate?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>

          <div style={netPayBoxStyle}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Net Salary Payable</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-surface)', letterSpacing: '-0.02em' }}>{formatCurrency(record.netSalary)}</div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
            <button 
              onClick={() => generateSalarySlip(record, userDoc)}
              style={downloadBtnStyle}
            >
              <Download size={16} /> Export PDF Slip
            </button>
          </div>
        </div>
      </div>

      {/* Details Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, padding: '0 20px' }}>
        <SalaryBreakdownCard record={record} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
          <DailyBreakdownTable record={record} />
          <BonusDetailsCard record={record} />
        </div>
      </div>

      <div style={footerDisclaimerStyle}>
        <FileText size={16} />
        This is a computer-generated document and does not require a physical signature.
      </div>
    </div>
  );
}

const emptyStateStyle = { 
  padding: '80px 40px', textAlign: 'center', display: 'flex', 
  flexDirection: 'column', alignItems: 'center' 
};

const emptyIconStyle = { 
  background: 'var(--color-surface-hover)', padding: '24px', borderRadius: '24px', marginBottom: 20 
};

const payslipHeaderStyle = {
  background: 'var(--color-surface)', padding: '40px', borderRadius: '32px',
  border: '1px solid var(--color-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
};

const netPayBoxStyle = {
  background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
  padding: '32px', borderRadius: '24px', color: 'var(--color-surface)'
};

const downloadBtnStyle = {
  width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none',
  padding: '12px', borderRadius: '12px', color: 'var(--color-surface)', fontWeight: 600,
  fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 8, backdropFilter: 'blur(10px)',
  transition: 'background 0.2s'
};

const footerDisclaimerStyle = {
  textAlign: 'center', fontSize: 11, color: 'var(--color-secondary-text)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '24px 0', borderTop: '1px solid var(--color-border)'
};
