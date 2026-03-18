import { format } from 'date-fns';

/**
 * Export the full MBR report as a landscape PDF.
 * Uses jsPDF + html2canvas to capture live chart DOM elements.
 */
export async function exportReportPDF({ dateRange, summaryStats, chartRefs, workingDays, isAnyOverridden }) {
  const { default: jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  const W = 297; // landscape width mm
  const H = 167; // landscape height mm
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
  const margin = 12;
  const contentW = W - margin * 2;
  let pageNum = 0;
  const pages = []; // track page titles for numbering

  // ─── Helpers ──────────────────────────────────────────────
  const rgb = (hex) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };

  const addHeader = (title) => {
    // Top accent line
    pdf.setDrawColor(...rgb('#0451CC'));
    pdf.setLineWidth(0.6);
    pdf.line(margin, 8, W - margin, 8);
    // Title
    pdf.setFontSize(16);
    pdf.setTextColor(...rgb('#2D2D2D'));
    pdf.text(title, margin, 18);
  };

  const addFooter = (num, total) => {
    pdf.setFontSize(7);
    pdf.setTextColor(...rgb('#6B7280'));
    pdf.text('Monthly Business Review | Video Content Creation', margin, H - 6);
    
    if (isAnyOverridden) {
      pdf.setTextColor(...rgb('#D97706'));
      pdf.setFont(undefined, 'bold');
      pdf.text('* One or more data points in this report have been manually overridden for accuracy.', margin + 70, H - 6);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(...rgb('#6B7280'));
    }

    pdf.text(`Page ${num} of ${total}`, W - margin, H - 6, { align: 'right' });
  };

  const captureChart = async (ref) => {
    if (!ref?.current) return null;
    // Wait for animations
    await new Promise(r => setTimeout(r, 500));
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  };

  const addChartImage = (imgData, y, maxH) => {
    return new Promise((resolve) => {
      if (!imgData) {
        resolve(y);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        let imgW = contentW;
        let imgH = imgW / aspect;
        if (imgH > maxH) {
          imgH = maxH;
          imgW = imgH * aspect;
        }
        const x = margin + (contentW - imgW) / 2;
        pdf.addImage(imgData, 'PNG', x, y, imgW, imgH, undefined, 'FAST');
        resolve(y + imgH + 4);
      };
      img.onerror = () => {
        console.error('Failed to load image for PDF');
        resolve(y);
      };
      img.src = imgData;
    });
  };

  // ═══════════════════════════════════════════════════════════
  // PAGE 1: COVER
  // ═══════════════════════════════════════════════════════════
  pageNum++;
  pages.push('Cover');
  pdf.setFillColor(...rgb('#3B4FCC'));
  pdf.rect(0, 0, W, H, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.text('Monthly Business Review', W / 2, 50, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text(`${format(new Date(dateRange.start), 'MMMM dd, yyyy')} — ${format(new Date(dateRange.end), 'MMMM dd, yyyy')}`, W / 2, 65, { align: 'center' });
  pdf.setFontSize(13);
  pdf.text('Video Content Creation', W / 2, 80, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('Client Enablement & Scaled Ops', W / 2, 92, { align: 'center' });

  pdf.setFontSize(14);
  pdf.text('indeed  |  ARCGATE', W / 2, H - 20, { align: 'center' });

  // ═══════════════════════════════════════════════════════════
  // PAGE 2: TASK ALLOCATION — Stats + Utilization chart
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Task Allocation');
  addHeader('Task Allocation');

  // Time range label
  pdf.setFontSize(10);
  pdf.setTextColor(...rgb('#0451CC'));
  pdf.text(`Time Range: ${dateRange.start} – ${dateRange.end} (${workingDays} days)`, W - margin, 18, { align: 'right' });

  // Stat boxes
  const boxW = (contentW - 4 * 6) / 5;
  const boxH = 22;
  let boxY = 24;
  summaryStats.forEach((s, i) => {
    const x = margin + i * (boxW + 6);
    pdf.setDrawColor(...rgb('#E5E7EB'));
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, boxY, boxW, boxH, 3, 3, 'S');
    pdf.setFontSize(8);
    pdf.setTextColor(...rgb('#0451CC'));
    pdf.text(s.label, x + 4, boxY + 8);
    pdf.setFontSize(15);
    pdf.setTextColor(...rgb('#2D2D2D'));
    pdf.text(String(s.value), x + 4, boxY + 18);
  });

  // Utilization chart
  const utilImg = await captureChart(chartRefs.utilization);
  await addChartImage(utilImg, boxY + boxH + 6, H - boxY - boxH - 20);

  // ═══════════════════════════════════════════════════════════
  // PAGE 3: FEEDBACK BREAKDOWN
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Feedback Breakdown');
  addHeader('Feedback Breakdown');
  const fbImg = await captureChart(chartRefs.feedbackBreakdown);
  await addChartImage(fbImg, 22, H - 34);

  // ═══════════════════════════════════════════════════════════
  // PAGE 4: FEEDBACK COUNT VS VIDEO LENGTH
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Feedback Count vs Video Length');
  addHeader('Feedback Count vs Video Length');
  const fvlImg = await captureChart(chartRefs.feedbackVsLength);
  await addChartImage(fvlImg, 22, H - 34);

  // ═══════════════════════════════════════════════════════════
  // PAGE 5: FEEDBACK ROUNDS
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Feedback Rounds');
  addHeader('Feedback Rounds');
  const frImg = await captureChart(chartRefs.feedbackRounds);
  await addChartImage(frImg, 22, H - 34);

  // ═══════════════════════════════════════════════════════════
  // PAGE 6: TICKETS TURNAROUND TIME
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Tickets Turnaround Time');
  addHeader('Tickets Turnaround Time');
  const ttImg = await captureChart(chartRefs.turnaround);
  await addChartImage(ttImg, 22, H - 34);

  // ═══════════════════════════════════════════════════════════
  // PAGE 7: TOTAL TIME TO COMPLETE
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Total Time to Complete');
  addHeader('Total Time to Complete');
  const tcImg = await captureChart(chartRefs.totalTime);
  await addChartImage(tcImg, 22, H - 34);

  // ═══════════════════════════════════════════════════════════
  // PAGE 8: ADDITIONAL INSIGHTS — 2x2 grid
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Additional Insights');
  addHeader('Additional Insights');

  const halfW = contentW / 2 - 3;
  const halfH = (H - 36) / 2 - 3;
  const gridY = 22;

  const veImg = await captureChart(chartRefs.versionEfficiency);
  const donutImg = await captureChart(chartRefs.feedbackDonut);
  const trendImg = await captureChart(chartRefs.monthlyTrend);
  const dwImg = await captureChart(chartRefs.designerWorkload);

  const placeInGrid = (imgData, x, y) => {
    return new Promise((resolve) => {
      if (!imgData) return resolve();
      const img = new Image();
      img.onload = () => {
        pdf.addImage(imgData, 'PNG', x, y, halfW, halfH, undefined, 'FAST');
        resolve();
      };
      img.onerror = resolve;
      img.src = imgData;
    });
  };

  await Promise.all([
    placeInGrid(veImg, margin, gridY),
    placeInGrid(donutImg, margin + halfW + 6, gridY),
    placeInGrid(trendImg, margin, gridY + halfH + 6),
    placeInGrid(dwImg, margin + halfW + 6, gridY + halfH + 6)
  ]);

  // ═══════════════════════════════════════════════════════════
  // LAST PAGE: THANK YOU
  // ═══════════════════════════════════════════════════════════
  pdf.addPage([W, H]);
  pageNum++;
  pages.push('Thank You');
  pdf.setFillColor(...rgb('#3B4FCC'));
  pdf.rect(0, 0, W, H, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(40);
  pdf.text('Thank You', W / 2, H / 2 - 10, { align: 'center' });
  pdf.setFontSize(16);
  pdf.text('indeed  |  ARCGATE', W / 2, H / 2 + 12, { align: 'center' });

  // ─── Add footers to all pages except cover and thank you ──
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    if (i !== 1 && i !== totalPages) {
      addFooter(i, totalPages);
    }
  }

  // Save
  const filename = `MBR_${dateRange.start}_${dateRange.end}_VideoContentCreation.pdf`;
  pdf.save(filename);
}
