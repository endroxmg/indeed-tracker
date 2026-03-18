import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export function generateSalarySlip(salaryData, employeeData) {
  const {
    month,
    monthlySalary,
    totalCalendarDays,
    dailyRate,
    hourlyRate,
    overtimeHourlyRate,
    baseSalary,
    sundayBonusCount,
    sundayBonusAmount,
    holidayBonusCount,
    holidayBonusAmount,
    overtimeHours,
    overtimeAmount,
    totalEarnings,
    halfDayCount,
    halfDayDeductionAmount,
    earlyLeaveHalfDays,
    earlyLeaveDeductionAmount,
    leaveWithoutBalanceCount,
    leaveWithoutBalanceAmount,
    sickLeaveWithoutBalanceCount,
    sickLeaveWithoutBalanceAmount,
    festivalLeaveWithoutBalanceCount,
    festivalLeaveWithoutBalanceAmount,
    totalDeductions,
    netSalary
  } = salaryData;

  const doc = new jsPDF('p', 'mm', 'a4');
  const primaryColor = [4, 81, 204]; // #0451CC
  const textColor = [45, 45, 45];
  const mutedColor = [107, 114, 128];
  
  // Helpers
  const formatCurrency = (val) => `INR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // HEADER
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ARCGATE', 20, 25);
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  const monthName = format(new Date(month + '-01'), 'MMMM yyyy');
  doc.text(`Salary Slip — ${monthName}`, 20, 33);

  doc.setFontSize(10);
  doc.text('indeed | ARCGATE', 190, 25, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Date Generated: ${format(new Date(), 'dd MMM yyyy')}`, 190, 31, { align: 'right' });

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.line(20, 38, 190, 38);

  // EMPLOYEE DETAILS BOX
  doc.setFillColor(249, 250, 251); // #F9FAFB
  doc.rect(20, 45, 170, 30, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.1);
  doc.rect(20, 45, 170, 30, 'S');

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Name:', 25, 52);
  doc.text('Role:', 25, 59);
  doc.text('Employee ID:', 25, 66);

  doc.setFont('helvetica', 'normal');
  doc.text(employeeData.name || '—', 58, 52);
  doc.text(employeeData.role || 'Designer', 58, 59);
  doc.text((employeeData.id || employeeData.uid || '—').substring(0, 8), 58, 66);

  doc.setFont('helvetica', 'bold');
  doc.text('Pay Period:', 110, 52);
  doc.text('Working Days:', 110, 59);
  doc.text('Daily Rate:', 110, 66);

  doc.setFont('helvetica', 'normal');
  doc.text(`01 ${monthName.split(' ')[0]} - ${totalCalendarDays} ${monthName.split(' ')[0]} ${monthName.split(' ')[1]}`, 140, 52);
  doc.text(`${totalCalendarDays}`, 140, 59);
  doc.text(formatCurrency(dailyRate), 140, 66);

  // EARNINGS TABLE
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EARNINGS', 20, 88);

  const earningsRows = [
    ['Base Salary', `${totalCalendarDays} days`, formatCurrency(dailyRate), formatCurrency(baseSalary)],
    ['Sunday Work Bonus', `${(sundayBonusCount * 1.5).toFixed(1)} days`, '1.5x Daily', formatCurrency(sundayBonusAmount)],
    ['Public Holiday Bonus', `${(holidayBonusCount * 2.5).toFixed(1)} days`, '2.5x Daily', formatCurrency(holidayBonusAmount)],
    ['Overtime Pay', `${overtimeHours.toFixed(1)} hrs`, `${formatCurrency(overtimeHourlyRate)}/hr`, formatCurrency(overtimeAmount)],
  ];

  doc.autoTable({
    startY: 92,
    head: [['Description', 'Days/Hours', 'Rate', 'Amount']],
    body: earningsRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 20, right: 20 },
    foot: [['TOTAL EARNINGS', '', '', formatCurrency(totalEarnings)]],
    footStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'right' },
  });

  // DEDUCTIONS TABLE
  let finalY = doc.lastAutoTable.finalY + 12;
  doc.setTextColor(220, 38, 38); // #DC2626
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DEDUCTIONS', 20, finalY);

  const deductionsRows = [
    ['Half Day Deductions', halfDayCount || '0', '0.5x Daily', formatCurrency(halfDayDeductionAmount)],
    ['Early Leave (4hr rule)', earlyLeaveHalfDays || '0', '0.5x Daily', formatCurrency(earlyLeaveDeductionAmount)],
    ['Leave Without Balance', leaveWithoutBalanceCount || '0', '1.0x Daily', formatCurrency(leaveWithoutBalanceAmount)],
    ['Sick/Fest Without Bal', (sickLeaveWithoutBalanceCount + festivalLeaveWithoutBalanceCount) || '0', '1.0x Daily', formatCurrency(sickLeaveWithoutBalanceAmount + festivalLeaveWithoutBalanceAmount)],
  ];

  doc.autoTable({
    startY: finalY + 4,
    head: [['Description', 'Count', 'Rate', 'Amount']],
    body: deductionsRows,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 20, right: 20 },
    foot: [['TOTAL DEDUCTIONS', '', '', formatCurrency(totalDeductions)]],
    footStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', halign: 'right' },
  });

  // NET SALARY BOX
  finalY = doc.lastAutoTable.finalY + 15;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(20, finalY, 170, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SALARY', 105, finalY + 8, { align: 'center' });
  doc.setFontSize(24);
  doc.text(formatCurrency(netSalary), 105, finalY + 18, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatCurrency(totalEarnings)} earnings - ${formatCurrency(totalDeductions)} deductions`, 105, finalY + 22, { align: 'center' });

  // ATTENDANCE SUMMARY
  finalY += 35;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ATTENDANCE SUMMARY', 20, finalY);

  const chips = [
    { label: 'Working Days', val: totalCalendarDays - leaveWithoutBalanceCount },
    { label: 'Leave Days', val: leaveWithoutBalanceCount },
    { label: 'Half Days', val: halfDayCount },
    { label: 'Sunday Bonuses', val: sundayBonusCount },
    { label: 'Holiday Bonuses', val: holidayBonusCount },
    { label: 'OT Hours', val: overtimeHours.toFixed(1) },
  ];

  let currentX = 20;
  doc.setFontSize(8);
  chips.forEach((chip, i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${chip.label}:`, currentX, finalY + 7);
    doc.setFont('helvetica', 'normal');
    const valWidth = doc.getTextWidth(` ${chip.val}`);
    doc.text(` ${chip.val}`, currentX + doc.getTextWidth(`${chip.label}:`), finalY + 7);
    currentX += doc.getTextWidth(`${chip.label}: ${chip.val}`) + 8;
    if (i === 2) { 
      currentX = 20;
      finalY += 5;
    }
  });

  // FOOTER
  doc.setDrawColor(229, 231, 235);
  doc.line(20, 280, 190, 280);
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('This is a computer-generated salary slip.', 20, 285);
  doc.text('Arcgate — Confidential', 190, 285, { align: 'right' });
  doc.text('Page 1 of 1', 105, 285, { align: 'center' });

  doc.save(`SalarySlip_${employeeData.name.replace(/\s+/g, '_')}_${month}.pdf`);
}
