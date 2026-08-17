import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, ReportStatus, FisheryAssetFormData, FisheryLivestockFormData, MACHINE_LABELS } from '../types';

/**
 * Get device or computer name fallback
 */
export function getComputerName(): string {
  try {
    if (typeof window !== 'undefined') {
      const platform = window.navigator.platform || 'PC';
      const userAgent = window.navigator.userAgent;
      
      if (userAgent.includes('Windows')) {
        return `ACCAD-WIN-${platform.toUpperCase().replace(/\s+/g, '')}`;
      } else if (userAgent.includes('Mac')) {
        return `ACCAD-MAC-WORKSTATION`;
      } else if (userAgent.includes('Linux')) {
        return `ACCAD-LINUX-NODE`;
      }
      return `ACCAD-WORKSTATION-${platform.toUpperCase()}`;
    }
  } catch (e) {}
  return 'ACCAD-WORKSTATION-PC';
}

/**
 * Standard Naming Convention: "Inventory Type - Date - User Computers"
 * Example: "Asset Inventory - 2026-07-27 - ACCAD-WIN-WIN32"
 */
export function formatLogName(report: Report): string {
  const dateStr = new Date(report.timestamp).toISOString().split('T')[0];
  const senderName = report.fullName || 'Staff User';
  const invType = report.inventoryType || 'Log';
  return `${invType}- ${dateStr} - ${senderName}`;
}

/**
 * Format Status Label for UI & Export
 */
export function formatStatusLabel(status: ReportStatus): string {
  switch (status) {
    case ReportStatus.APPROVED:
      return 'FULLY APPROVED (ED)';
    case ReportStatus.PENDING_ED:
      return 'PENDING ED FINAL APPROVAL';
    case ReportStatus.PENDING_MANAGER:
      return 'PENDING MANAGER REVIEW';
    case ReportStatus.REJECTED_BY_MANAGER:
      return 'REJECTED BY MANAGER';
    case ReportStatus.REJECTED_BY_ED:
      return 'REJECTED BY ED';
    default:
      return String(status).toUpperCase();
  }
}

/**
 * Exhaustive PDF Sheet Export Engine with Headers, Footers, and Page Numbers
 */
export function exportLogToPDF(report: Report): void {
  try {
    const doc = new jsPDF();
    const logName = formatLogName(report);
    const dateSubmitted = new Date(report.timestamp).toLocaleString();
    const computerName = report.computerName || getComputerName();

    // ACCAD FARMS Letterhead Header (Page 1)
    doc.setFillColor(5, 150, 105); // Emerald Green
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ACCAD FARMS NIGERIA LIMITED', 14, 14);
    
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Precision Agricultural Operations & Operational Inventory Sheet', 14, 21);

    // Document Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`OFFICIAL LOG: ${logName}`, 14, 36);

    // Section 1: Metadata & Approval Audit Trail Table
    const approvalChain = [
      `Manager Vetting: ${report.managerApprovedBy ? `Approved by ${report.managerApprovedBy}` : 'Pending Review'}`,
      `ED Authorization: ${report.edApprovedBy ? `Approved by ${report.edApprovedBy}` : 'Pending Authorization'}`,
      report.rejectionReason ? `Rejection Reason: ${report.rejectionReason}` : ''
    ].filter(Boolean).join('\n');

    autoTable(doc, {
      startY: 40,
      head: [['LOG METADATA FIELD', 'EXHAUSTIVE RECORD DETAILS']],
      body: [
        ['Standardized Log Name', logName],
        ['Inventory Type', report.inventoryType || 'General Log'],
        ['Department Sector', report.department || 'Fishery'],
        ['Date Submitted', dateSubmitted],
        ['Submitting User', `${report.fullName || 'Staff User'} (${report.email})`],
        ['Log Status', formatStatusLabel(report.status)],
        ['Re-Entry Status', report.isReEntry ? 'Yes (Correction Re-Entry)' : 'Initial Log Submission'],
        ['Approval & Vetting Audit', approvalChain],
        ['Log Timestamps', `Created: ${dateSubmitted} | Last Updated: ${new Date(report.updatedAt || report.timestamp).toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 52 },
        1: { cellWidth: 128 }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    // Section 2: Narrative & Field Observations
    const narrativeRows: [string, string][] = [];
    if (report.content) narrativeRows.push(['Operational Log Narrative', report.content]);

    if (report.formData?.feedStorage) {
      const fs = report.formData.feedStorage;
      if (fs.wastageNoticed?.hasWastage) {
        narrativeRows.push(['Feed Wastage Noticed', `YES - Comment: ${fs.wastageNoticed.comment || 'Wastage observed'}`]);
      } else {
        narrativeRows.push(['Feed Wastage Noticed', 'NO wastage reported']);
      }

      if (fs.machineIssues?.hasIssue) {
        narrativeRows.push(['Machine Issues Reported', `YES - Comment: ${fs.machineIssues.comment || 'Machine malfunction noted'}`]);
      } else {
        narrativeRows.push(['Machine Issues Reported', 'NO machine issues reported']);
      }
    }

    if (narrativeRows.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('OPERATIONAL NARRATIVE & OBSERVATION NOTES', 14, currentY);
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: [['OBSERVATION ITEM', 'FIELD DETAILS & NOTES']],
        body: narrativeRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 52 },
          1: { cellWidth: 128 }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Section 3: Forms Audit (Asset Inventory)
    if (report.formData) {
      const assetData = report.formData as FisheryAssetFormData;

      // Feeds Inventory Breakdown Table
      if (assetData.feedsInventory?.items && assetData.feedsInventory.items.length > 0) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('FEEDS INVENTORY & STORE AUDIT', 14, currentY);
        currentY += 4;

        const feedItems = assetData.feedsInventory.items.map((item, idx) => [
          String(idx + 1),
          item.type || 'Branded',
          item.brand || 'N/A',
          item.size || 'N/A',
          `${item.quantityKg || 0} Kg`
        ]);

        feedItems.push([
          'SUMMARY',
          'TOTAL BAGS IN STORE:',
          String(assetData.feedsInventory.totalBags || 0),
          'TOTAL STORE FEEDS:',
          `${assetData.feedsInventory.totalFeedsInStore || assetData.feedStorage?.totalFeedInStoreKg || 0} Kg`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'FEED TYPE', 'BRAND', 'PELLET SIZE', 'QUANTITY']],
          body: feedItems,
          theme: 'grid',
          headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Raw Ingredients Breakdown Table
      if (assetData.ingredientsUsed) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('RAW INGREDIENTS USAGE AUDIT (KG)', 14, currentY);
        currentY += 4;

        const ingEntries = Object.entries(assetData.ingredientsUsed).map(([k, v]) => {
          const name = k === 'gnc' ? 'GNC' :
            k === 'dcp' ? 'DCP' :
            k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return [name, `${v || 0} Kg`];
        });

        const ingRows: string[][] = [];
        for (let i = 0; i < ingEntries.length; i += 2) {
          const first = ingEntries[i];
          const second = ingEntries[i + 1] || ['-', '-'];
          ingRows.push([first[0], first[1], second[0], second[1]]);
        }

        autoTable(doc, {
          startY: currentY,
          head: [['INGREDIENT NAME', 'QUANTITY', 'INGREDIENT NAME', 'QUANTITY']],
          body: ingRows,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Drugs & Additives Table
      if (assetData.drugsUsed) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('DRUGS & ADDITIVES AUDIT', 14, currentY);
        currentY += 4;

        const drg = assetData.drugsUsed;
        const drugRows = [
          ['KlinoFeed', String(drg.klinoFeed || 0), 'Lysine', String(drg.lysine || 0)],
          ['Probiotic', String(drg.probiotic || 0), 'Enzyme', String(drg.enzyme || 0)],
          ['Fish Premix', String(drg.fishPremix || 0), 'Toxin Binder', String(drg.toxin || 0)],
          ['Methionine', String(drg.methionine || 0), 'DCP', String(drg.dcp || 0)],
          ['Salt', String(drg.salt || 0), '-', '-']
        ];

        autoTable(doc, {
          startY: currentY,
          head: [['DRUG / ADDITIVE', 'DOSAGE/VAL', 'DRUG / ADDITIVE', 'DOSAGE/VAL']],
          body: drugRows,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Machinery Health Check Table
      if (assetData.machineCheck) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('MACHINERY HEALTH & OPERATIONAL CHECK', 14, currentY);
        currentY += 4;

        const mc = assetData.machineCheck;
        const machineRows = Object.entries(mc).map(([key, val]) => [
          MACHINE_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          val || 'Good'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['EQUIPMENT / AUDIT ITEM', 'OPERATIONAL STATUS']],
          body: machineRows,
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Technical Report & Fuel Table
      if (assetData.technicalReport) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('TECHNICAL & DIESEL FUEL AUDIT', 14, currentY);
        currentY += 4;

        const tech = assetData.technicalReport;
        const techRows = [
          ['Diesel in Generator (Litres)', `${tech.dieselGeneratorLitres || 0} L`],
          ['Diesel in Kegs (Litres)', `${tech.dieselKegsLitres || 0} L`],
          ['Total Available Diesel (Litres)', `${tech.totalDieselAvailable || 0} L`],
          ['Generator Meter Photo Attached', tech.generatorMeterPhoto ? 'YES (Photo Attached in System)' : 'NO photo attached']
        ];

        autoTable(doc, {
          startY: currentY,
          head: [['TECHNICAL FUEL METRIC', 'RECORDED AUDIT VALUE']],
          body: techRows,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8.5, cellPadding: 2.5 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;

        if (tech.generatorMeterPhoto) {
          if (currentY > 220) { doc.addPage(); currentY = 20; }
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text('GENERATOR METER PHOTO ATTACHMENT', 14, currentY);
          currentY += 6;
          try {
            doc.addImage(tech.generatorMeterPhoto, 'JPEG', 14, currentY, 60, 45);
            currentY += 50;
          } catch (err) {
            console.error("Error adding generator photo to PDF", err);
          }
        }
      }

      // Section 4: Forms Audit (Livestock Inventory)
      const livestockData = report.formData as FisheryLivestockFormData;
      if (livestockData.ponds && Array.isArray(livestockData.ponds) && livestockData.ponds.length > 0) {
        if (currentY > 230) { doc.addPage(); currentY = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('LIVESTOCK PONDS AUDIT RECORD', 14, currentY);
        currentY += 4;

        livestockData.ponds.forEach((pond, idx) => {
          if (currentY > 240) { doc.addPage(); currentY = 20; }

          const feedingSummary = (pond.feedingRecords?.items || [])
            .map(f => `${f.type} (${f.brand || ''} ${f.size}): ${f.quantityKg}Kg`)
            .join('; ');

          const pondRows = [
            ['Pond Identifier & Batch', `${pond.pondNo} (${pond.batch})`],
            ['Pond Size', `${pond.pondSizeSqm} SQM`],
            ['Fish Quantity Count', `${pond.quantityOfFish} Fish`],
            ['Water Condition', pond.waterCondition || 'Clear'],
            ['Water Changed Today', pond.waterChangedToday?.hasChanged ? `YES (${pond.waterChangedToday.times || 1} times)` : 'NO'],
            ['Feeding Records Summary', feedingSummary || 'N/A'],
            ['Fish Feeding Response', pond.feedingResponse || 'Active'],
            ['Mortality Count', `${pond.mortality || 0} Fish`],
            ['Pond Photo Attachment', pond.pondPhoto ? 'YES (Photo Attached in System)' : 'NO photo attached']
          ];

          autoTable(doc, {
            startY: currentY,
            head: [[`POND #${idx + 1} (${pond.pondNo}) PARAMETER`, 'FIELD VALUE']],
            body: pondRows,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 }
          });

          currentY = (doc as any).lastAutoTable.finalY + 6;

          if (pond.pondPhoto) {
            if (currentY > 220) { doc.addPage(); currentY = 20; }
            try {
              doc.addImage(pond.pondPhoto, 'JPEG', 14, currentY, 60, 45);
              currentY += 50;
            } catch (err) {
              console.error("Error adding pond photo to PDF", err);
            }
          }
        });
      }
    }

    // Dynamic Page Numbering & Footer Setup on Every Page
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);

      // Footer Line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 282, 196, 282);

      // Running Footer Text
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`CONFIDENTIAL • ACCAD FARMS NIGERIA LIMITED • OFFICIAL SHEET`, 14, 287);
      doc.text(`Page ${page} of ${totalPages}`, 196, 287, { align: 'right' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 291);
    }

    // Save PDF
    const filename = `${logName.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
    doc.save(filename);
  } catch (e: any) {
    console.error('Exhaustive PDF Generation Error:', e);
    alert('PDF Export failed: ' + e.message);
  }
}

/**
 * Exhaustive Word (.doc) File Format Export Engine with Styled Tables and Page Breaks
 */
export function exportLogToWord(report: Report): void {
  try {
    const logName = formatLogName(report);
    const dateSubmitted = new Date(report.timestamp).toLocaleString();
    const computerName = report.computerName || getComputerName();
    const statusText = formatStatusLabel(report.status);

    const approvalHistory = [
      report.managerApprovedBy ? `Manager Vetted By: ${report.managerApprovedBy}` : 'Manager Vetting: Pending',
      report.edApprovedBy ? `ED Approved By: ${report.edApprovedBy}` : 'ED Authorization: Pending',
      report.rejectionReason ? `Rejection Reason: ${report.rejectionReason}` : ''
    ].filter(Boolean).join('<br/>');

    const assetData = report.formData as FisheryAssetFormData;
    const livestockData = report.formData as FisheryLivestockFormData;

    // Build Exhaustive Word HTML Blob
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${logName}</title>
        <style>
          @page {
            size: portrait;
            margin: 1in;
            @bottom-right { content: "Page " counter(page); font-size: 8pt; color: #64748b; }
          }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.5; }
          .header-banner { background-color: #059669; color: #ffffff; padding: 18px; border-radius: 6px; margin-bottom: 20px; text-align: left; }
          .header-banner h1 { margin: 0; font-size: 20pt; text-transform: uppercase; letter-spacing: 0.5px; }
          .header-banner p { margin: 4px 0 0 0; font-size: 10pt; opacity: 0.9; }
          .doc-title { font-size: 14pt; font-weight: bold; color: #0f172a; margin-bottom: 14px; text-transform: uppercase; border-bottom: 2px solid #059669; padding-bottom: 4px; }
          .section-title { font-size: 11pt; font-weight: bold; color: #059669; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; background-color: #ecfdf5; padding: 6px 10px; border-left: 4px solid #059669; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; page-break-inside: avoid; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9.5pt; text-align: left; vertical-align: top; }
          th { background-color: #059669; color: #ffffff; font-weight: bold; text-transform: uppercase; }
          .dark-th { background-color: #1e293b; color: #ffffff; }
          .label { font-weight: bold; background-color: #f8fafc; width: 32%; }
          .value { width: 68%; }
          .photo-box { margin-top: 10px; padding: 10px; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 6px; }
          .photo-box img { max-width: 450px; max-height: 300px; border-radius: 4px; display: block; margin-top: 6px; }
          .footer { margin-top: 40px; font-size: 8.5pt; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; }
        </style>
      </head>
      <body>

        <!-- Official Letterhead Header -->
        <div class="header-banner">
          <h1>ACCAD FARMS NIGERIA LIMITED</h1>
          <p>Precision Agricultural Operations & Operational Inventory Sheet</p>
        </div>

        <div class="doc-title">OFFICIAL LOG: ${logName}</div>

        <!-- Section 1: Metadata & Approvals -->
        <div class="section-title">1. LOG SPECIFICATIONS & APPROVAL AUDIT</div>
        <table>
          <tbody>
            <tr><td class="label">Standardized Log Name</td><td class="value"><strong>${logName}</strong></td></tr>
            <tr><td class="label">Inventory Type</td><td class="value">${report.inventoryType || 'General Log'}</td></tr>
            <tr><td class="label">Department Sector</td><td class="value">${report.department || 'Fishery'}</td></tr>
            <tr><td class="label">Date Submitted</td><td class="value">${dateSubmitted}</td></tr>
            <tr><td class="label">Submitting User</td><td class="value">${report.fullName || 'Staff User'} (${report.email})</td></tr>
            <tr><td class="label">User Computer Workstation</td><td class="value"><code>${computerName}</code></td></tr>
            <tr><td class="label">Log Status</td><td class="value"><strong>${statusText}</strong></td></tr>
            <tr><td class="label">Re-Entry Status</td><td class="value">${report.isReEntry ? 'Yes (Correction Entry)' : 'Initial Log Entry'}</td></tr>
            <tr><td class="label">Approval & Vetting Audit</td><td class="value">${approvalHistory || 'No approval record timestamped yet'}</td></tr>
            <tr><td class="label">Timestamps</td><td class="value">Logged: ${dateSubmitted}<br/>Last Updated: ${new Date(report.updatedAt || report.timestamp).toLocaleString()}</td></tr>
          </tbody>
        </table>

        <!-- Section 2: Narrative & Field Observations -->
        <div class="section-title">2. OPERATIONAL NARRATIVE & FIELD OBSERVATIONS</div>
        <table>
          <tbody>
            <tr><td class="label">Operational Log Narrative</td><td class="value">${report.content || 'N/A'}</td></tr>
            ${assetData?.feedStorage ? `
              <tr><td class="label">Feed Wastage Noticed</td><td class="value">${assetData.feedStorage.wastageNoticed?.hasWastage ? `YES - Comment: ${assetData.feedStorage.wastageNoticed.comment || 'Wastage observed'}` : 'NO wastage reported'}</td></tr>
              <tr><td class="label">Machine Issues Reported</td><td class="value">${assetData.feedStorage.machineIssues?.hasIssue ? `YES - Comment: ${assetData.feedStorage.machineIssues.comment || 'Issue reported'}` : 'NO machine issues reported'}</td></tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Section 3: Asset Inventory Data -->
        ${assetData ? `
          ${assetData.feedsInventory?.items?.length ? `
            <div class="section-title">3. FEEDS INVENTORY & STORE AUDIT</div>
            <table>
              <thead>
                <tr><th>#</th><th>FEED TYPE</th><th>BRAND</th><th>PELLET SIZE</th><th>QUANTITY (KG)</th></tr>
              </thead>
              <tbody>
                ${assetData.feedsInventory.items.map((item, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.type || 'Branded'}</td>
                    <td>${item.brand || 'N/A'}</td>
                    <td>${item.size || 'N/A'}</td>
                    <td><strong>${item.quantityKg || 0} Kg</strong></td>
                  </tr>
                `).join('')}
                <tr style="background-color: #ecfdf5; font-weight: bold;">
                  <td colspan="3">SUMMARY AUDIT:</td>
                  <td>Total Bags: ${assetData.feedsInventory.totalBags || 0}</td>
                  <td>Total Feeds in Store: ${assetData.feedsInventory.totalFeedsInStore || assetData.feedStorage?.totalFeedInStoreKg || 0} Kg</td>
                </tr>
              </tbody>
            </table>
          ` : ''}

          ${assetData.ingredientsUsed ? `
            <div class="section-title">4. RAW INGREDIENTS USAGE AUDIT (KG)</div>
            <table>
              <thead>
                <tr class="dark-th"><th>INGREDIENT</th><th>QUANTITY (KG)</th><th>INGREDIENT</th><th>QUANTITY (KG)</th></tr>
              </thead>
              <tbody>
                ${(() => {
                  const entries = Object.entries(assetData.ingredientsUsed).map(([k, v]) => {
                    const name = k === 'gnc' ? 'GNC' :
                      k === 'dcp' ? 'DCP' :
                      k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return [name, `${v || 0} Kg`];
                  });
                  let html = '';
                  for (let i = 0; i < entries.length; i += 2) {
                    const first = entries[i];
                    const second = entries[i + 1] || ['-', '-'];
                    html += `<tr><td>${first[0]}</td><td>${first[1]}</td><td>${second[0]}</td><td>${second[1]}</td></tr>`;
                  }
                  return html;
                })()}
              </tbody>
            </table>
          ` : ''}

          ${assetData.drugsUsed ? `
            <div class="section-title">5. DRUGS & ADDITIVES USAGE AUDIT</div>
            <table>
              <thead>
                <tr class="dark-th"><th>DRUG / ADDITIVE</th><th>DOSAGE/VAL</th><th>DRUG / ADDITIVE</th><th>DOSAGE/VAL</th></tr>
              </thead>
              <tbody>
                <tr><td>KlinoFeed</td><td>${assetData.drugsUsed.klinoFeed || 0}</td><td>Lysine</td><td>${assetData.drugsUsed.lysine || 0}</td></tr>
                <tr><td>Probiotic</td><td>${assetData.drugsUsed.probiotic || 0}</td><td>Enzyme</td><td>${assetData.drugsUsed.enzyme || 0}</td></tr>
                <tr><td>Fish Premix</td><td>${assetData.drugsUsed.fishPremix || 0}</td><td>Toxin Binder</td><td>${assetData.drugsUsed.toxin || 0}</td></tr>
                <tr><td>Methionine</td><td>${assetData.drugsUsed.methionine || 0}</td><td>DCP</td><td>${assetData.drugsUsed.dcp || 0}</td></tr>
                <tr><td>Salt</td><td>${assetData.drugsUsed.salt || 0}</td><td>-</td><td>-</td></tr>
              </tbody>
            </table>
          ` : ''}

          ${assetData.machineCheck ? `
            <div class="section-title">6. MACHINERY HEALTH & OPERATIONAL CHECK</div>
            <table>
              <thead>
                <tr><th>EQUIPMENT ITEM</th><th>STATUS</th></tr>
              </thead>
              <tbody>
                ${Object.entries(assetData.machineCheck).map(([k, v]) => `
                  <tr>
                    <td class="label">${MACHINE_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                    <td class="value"><strong>${v || 'Good'}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${assetData.technicalReport ? `
            <div class="section-title">7. TECHNICAL & DIESEL FUEL AUDIT</div>
            <table>
              <tbody>
                <tr><td class="label">Diesel Generator (Litres)</td><td class="value">${assetData.technicalReport.dieselGeneratorLitres || 0} L</td></tr>
                <tr><td class="label">Diesel Kegs (Litres)</td><td class="value">${assetData.technicalReport.dieselKegsLitres || 0} L</td></tr>
                <tr><td class="label">Total Available Diesel</td><td class="value"><strong>${assetData.technicalReport.totalDieselAvailable || 0} L</strong></td></tr>
              </tbody>
            </table>
            ${assetData.technicalReport.generatorMeterPhoto ? `
              <div class="photo-box">
                <strong>Generator Meter Photo Attachment:</strong><br/>
                <img src="${assetData.technicalReport.generatorMeterPhoto}" alt="Generator Meter Photo" />
              </div>
            ` : ''}
          ` : ''}
        ` : ''}

        <!-- Section 4: Livestock Inventory Data -->
        ${livestockData?.ponds?.length ? `
          <div class="section-title">LIVESTOCK PONDS AUDIT RECORD</div>
          ${livestockData.ponds.map((pond, pIdx) => `
            <table style="margin-top: 12px;">
              <thead>
                <tr><th colspan="2">POND #${pIdx + 1}: ${pond.pondNo} (${pond.batch})</th></tr>
              </thead>
              <tbody>
                <tr><td class="label">Pond Size</td><td class="value">${pond.pondSizeSqm} SQM</td></tr>
                <tr><td class="label">Fish Count</td><td class="value"><strong>${pond.quantityOfFish} Fish</strong></td></tr>
                <tr><td class="label">Water Condition</td><td class="value">${pond.waterCondition || 'Clear'}</td></tr>
                <tr><td class="label">Water Changed Today</td><td class="value">${pond.waterChangedToday?.hasChanged ? `YES (${pond.waterChangedToday.times || 1} times)` : 'NO'}</td></tr>
                <tr><td class="label">Feeding Records</td><td class="value">${(pond.feedingRecords?.items || []).map(f => `${f.type} (${f.brand || ''} ${f.size}): ${f.quantityKg}Kg`).join('; ') || 'N/A'}</td></tr>
                <tr><td class="label">Feeding Response</td><td class="value">${pond.feedingResponse || 'Active'}</td></tr>
                <tr><td class="label">Mortality Count</td><td class="value"><strong>${pond.mortality || 0} Fish</strong></td></tr>
              </tbody>
            </table>
            ${pond.pondPhoto ? `
              <div class="photo-box">
                <strong>Pond ${pond.pondNo} Photo Attachment:</strong><br/>
                <img src="${pond.pondPhoto}" alt="Pond Photo" />
              </div>
            ` : ''}
          `).join('')}
        ` : ''}

        <div class="footer">
          CONFIDENTIAL &bull; ACCAD FARMS NIGERIA LIMITED &bull; Official Sheet Export<br/>
          Generated on ${new Date().toLocaleString()} &bull; Computer Workstation: <code>${computerName}</code>
        </div>

      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${logName.replace(/[/\\?%*:|"<>]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e: any) {
    console.error('Exhaustive Word Export Error:', e);
    alert('Word Export failed: ' + e.message);
  }
}
