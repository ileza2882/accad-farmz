import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Report, 
  ReportStatus, 
  FisheryAssetFormData, 
  FisheryLivestockFormData, 
  FisheryHatcheryFormData, 
  FisheryHatcheryBatchData,
  InventoryType, 
  Department,
  FisherySection,
  MACHINE_LABELS,
  getHatcheryBatchStage
} from '../types';
import { ACCAD_LOGO_BASE64 } from './logoBase64';

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

    // ACCAD FARMS Official Standard Letterhead Header (Page 1)
    // Left: Official Brand Logo
    try {
      doc.addImage(ACCAD_LOGO_BASE64, 'JPEG', 14, 7, 24, 22.3);
    } catch (err) {
      console.warn('Could not embed logo in PDF:', err);
    }

    // Right/Center: Corporate Header Details
    doc.setTextColor(0, 100, 0); // Deep Forest Green (#006400)
    doc.setFont('times', 'bold');
    doc.setFontSize(21);
    doc.text('Accad Farms Limited', 118, 14, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text('Agboopa Village, Awowo, Ewekoro Local Government Area, Abeokuta, Ogun State, Nigeria.', 118, 20, { align: 'center' });

    doc.setFontSize(7.2);
    doc.text('+234 916 358 3220 / +2347030141958 / +2347082162467 | info@accadfarms.com', 118, 25, { align: 'center' });

    // Double Decorative Green Dividing Rule
    doc.setDrawColor(0, 100, 0);
    doc.setLineWidth(0.8);
    doc.line(14, 31, 196, 31);
    doc.setLineWidth(0.3);
    doc.line(14, 32.2, 196, 32.2);

    // Document Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`OFFICIAL LOG: ${logName}`, 14, 39);

    // Section 1: Metadata & Approval Audit Trail Table
    const approvalChain = [
      `Manager Vetting: ${report.managerApprovedBy ? `Approved by ${report.managerApprovedBy}` : 'Pending Review'}`,
      `ED Authorization: ${report.edApprovedBy ? `Approved by ${report.edApprovedBy}` : 'Pending Authorization'}`,
      report.rejectionReason ? `Rejection Reason: ${report.rejectionReason}` : ''
    ].filter(Boolean).join('\n');

    const metaBody = [
      ['Standardized Log Name', logName],
      ['Inventory Type', report.inventoryType || 'General Log'],
      ['Department Sector', report.department || 'Fishery'],
      ['Date Submitted', dateSubmitted],
      ['Submitting User', `${report.fullName || 'Staff User'} (${report.email})`],
      ['Log Status', formatStatusLabel(report.status)],
      ['Submission Audit', report.isResubmitted ? `REDONE & RESUBMITTED (Attempt #${report.resubmissionCount || 1})` : 'Initial Log Submission'],
      ['Approval & Vetting Audit', approvalChain],
      ['Log Timestamps', `Created: ${dateSubmitted} | Last Updated: ${new Date(report.updatedAt || report.timestamp).toLocaleString()}`]
    ];

    if (report.isResubmitted && report.previousRejectionReason) {
      metaBody.splice(7, 0, ['Previous Rejection Note', report.previousRejectionReason]);
    }

    autoTable(doc, {
      startY: 40,
      head: [['LOG METADATA FIELD', 'EXHAUSTIVE RECORD DETAILS']],
      body: metaBody,
      theme: 'grid',
      headStyles: { fillColor: [0, 100, 0], textColor: 255, fontStyle: 'bold' },
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

      // Section 5: Forms Audit (Hatchery Record)
      const hatcheryData = report.formData as FisheryHatcheryFormData;
      if (hatcheryData?.batches && Array.isArray(hatcheryData.batches) && hatcheryData.batches.length > 0) {
        if (currentY > 230) { doc.addPage(); currentY = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('HATCHERY PRODUCTION & FINGERLING TRANSFER AUDIT', 14, currentY);
        currentY += 4;

        hatcheryData.batches.forEach((batch, idx) => {
          if (currentY > 240) { doc.addPage(); currentY = 20; }

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(`BATCH #${idx + 1}: ${batch.batchNumber || 'Batch'}`, 14, currentY);
          currentY += 3;

          const batchRows = [
            ['Source of Broodstock', batch.sourceOfBroodstock || 'N/A'],
            ['Batch Number', batch.batchNumber || 'N/A'],
            ['Hatchery Date', batch.hatcheryDate || 'N/A'],
            ['First Date of Feeding', batch.firstDateOfFeeding || 'N/A'],
            ['Date of Transfer to Grow-Out', batch.dateOfTransferToGrowOut || 'N/A'],
            ['Total Transferred Fingerlings', `${Number(batch.totalTransferredFingerlings || 0).toLocaleString()} Fish`],
            ['Average Weight of Fingerlings', `${batch.averageWeightTransferred || 0} g`],
            ['Age of Fingerlings', String(batch.ageOfFingerlingsTransferred || 'N/A')],
            ['Health Status of Fingerlings', batch.healthStatusTransferred || 'Good'],
            ['Destinated Pond of Fingerlings', batch.destinatedPondTransferred || 'N/A']
          ];

          if (batch.remarks) {
            batchRows.push(['Batch Remarks / Notes', batch.remarks]);
          }

          autoTable(doc, {
            startY: currentY,
            head: [['HATCHERY METRIC / PARAMETER', 'RECORDED AUDIT VALUE']],
            body: batchRows,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 }
          });
          currentY = (doc as any).lastAutoTable.finalY + 6;
        });

        if (hatcheryData.generalNotes) {
          if (currentY > 250) { doc.addPage(); currentY = 20; }
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(71, 85, 105);
          doc.text(`General Notes: ${hatcheryData.generalNotes}`, 14, currentY);
          currentY += 6;
        }
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
    const hatcheryData = report.formData as FisheryHatcheryFormData;

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

        <!-- Official Standard Letterhead Header -->
        <table style="width: 100%; border: none; border-bottom: 2.5px solid #006400; padding-bottom: 12px; margin-bottom: 22px; page-break-inside: avoid;">
          <tr>
            <td style="width: 110px; border: none; vertical-align: middle; padding: 0 12px 0 0;">
              <img src="${ACCAD_LOGO_BASE64}" width="95" height="88" style="display: block; border-radius: 4px;" alt="Accad Farms Logo" />
            </td>
            <td style="border: none; text-align: center; vertical-align: middle; padding: 0;">
              <h1 style="color: #006400; font-family: 'Times New Roman', Georgia, serif; font-size: 24pt; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 0.5px;">Accad Farms Limited</h1>
              <p style="color: #0f172a; font-family: Arial, sans-serif; font-weight: bold; font-size: 9pt; margin: 2px 0;">Agboopa Village, Awowo, Ewekoro Local Government Area, Abeokuta, Ogun State, Nigeria.</p>
              <p style="color: #0f172a; font-family: Arial, sans-serif; font-weight: bold; font-size: 8.5pt; margin: 2px 0;">+234 916 358 3220 / +2347030141958 / +2347082162467 | info@accadfarms.com</p>
            </td>
          </tr>
        </table>

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
            <tr><td class="label">Submission Audit</td><td class="value">${report.isResubmitted ? `REDONE & RESUBMITTED (Attempt #${report.resubmissionCount || 1})` : 'Initial Log Submission'}</td></tr>
            ${report.isResubmitted && report.previousRejectionReason ? `<tr><td class="label">Previous Rejection Note</td><td class="value" style="color: #b91c1c; font-weight: bold;">${report.previousRejectionReason}</td></tr>` : ''}
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

        <!-- Section 5: Hatchery Record Data -->
        ${hatcheryData?.batches?.length ? `
          <div class="section-title">HATCHERY PRODUCTION & FINGERLING TRANSFER AUDIT</div>
          ${hatcheryData.batches.map((batch, bIdx) => `
            <table style="margin-top: 12px;">
              <thead>
                <tr><th colspan="2">BATCH #${bIdx + 1}: ${batch.batchNumber || 'Batch'}</th></tr>
              </thead>
              <tbody>
                <tr><td class="label">Source of Broodstock</td><td class="value"><strong>${batch.sourceOfBroodstock || 'N/A'}</strong></td></tr>
                <tr><td class="label">Batch Number</td><td class="value">${batch.batchNumber || 'N/A'}</td></tr>
                <tr><td class="label">Hatchery Date</td><td class="value">${batch.hatcheryDate || 'N/A'}</td></tr>
                <tr><td class="label">First Date of Feeding</td><td class="value">${batch.firstDateOfFeeding || 'N/A'}</td></tr>
                <tr><td class="label">Date of Transfer to Grow-Out</td><td class="value">${batch.dateOfTransferToGrowOut || 'N/A'}</td></tr>
                <tr><td class="label">Total Transferred Fingerlings</td><td class="value"><strong>${Number(batch.totalTransferredFingerlings || 0).toLocaleString()} Fish</strong></td></tr>
                <tr><td class="label">Average Weight of Fingerlings</td><td class="value">${batch.averageWeightTransferred || 0} g</td></tr>
                <tr><td class="label">Age of Fingerlings</td><td class="value">${batch.ageOfFingerlingsTransferred || 'N/A'}</td></tr>
                <tr><td class="label">Health Status</td><td class="value">${batch.healthStatusTransferred || 'Good'}</td></tr>
                <tr><td class="label">Destinated Pond</td><td class="value">${batch.destinatedPondTransferred || 'N/A'}</td></tr>
                ${batch.remarks ? `<tr><td class="label">Batch Remarks</td><td class="value">${batch.remarks}</td></tr>` : ''}
              </tbody>
            </table>
          `).join('')}
          ${hatcheryData.generalNotes ? `
            <div style="margin-top: 10px; padding: 8px; background-color: #f1f5f9; border-radius: 4px; font-size: 11px;">
              <strong>General Hatchery Notes:</strong> ${hatcheryData.generalNotes}
            </div>
          ` : ''}
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

/**
 * Dedicated Excel (.xlsx) Exporter for Hatchery Section Records
 * Each parameter forms a column, and each batch / progressive update forms a new row.
 */
export function exportHatcheryToExcel(input: Report | Report[]): void {
  try {
    const reports = Array.isArray(input) ? input : [input];
    const hatcheryReports = reports.filter(r => 
      r.department === Department.FISHERY && 
      (r.inventoryType === InventoryType.HATCHERY || r.section === FisherySection.HATCHERY || Boolean(r.formData?.batches))
    );

    const targetReports = hatcheryReports.length > 0 ? hatcheryReports : reports;

    // Collect all batches across reports
    const rowData: any[] = [];
    
    targetReports.forEach((rep) => {
      const batches: FisheryHatcheryBatchData[] = rep.formData?.batches || [];
      const submitter = rep.fullName || rep.email || 'Staff';
      const logName = formatLogName(rep);
      const dateLogged = new Date(rep.timestamp).toLocaleDateString();
      const status = formatStatusLabel(rep.status);

      if (batches.length === 0) {
        rowData.push({
          'Batch #': 'General Entry',
          'Source of Broodstock': 'N/A',
          'Hatchery / Incubation Date': dateLogged,
          'First Date of Feeding': 'N/A',
          'Date of Transfer to Grow-Out': 'N/A',
          'Total Transferred Fingerlings (Qty)': 0,
          'Average Weight (g)': 0,
          'Age of Fingerlings (Weeks/Days)': 'N/A',
          'Health Status': 'N/A',
          'Destination Pond': 'N/A',
          'Current Hatchery Stage': 'N/A',
          'Lock / Save Status': 'N/A',
          'Remarks / Notes': rep.content || 'N/A',
          'Log Report Title': logName,
          'Submitting Staff': submitter,
          'Date Logged': dateLogged,
          'Approval Status': status
        });
      } else {
        batches.forEach((batch, bIdx) => {
          const stageInfo = getHatcheryBatchStage(batch);
          rowData.push({
            'Batch #': batch.batchNumber || `Batch #${bIdx + 1}`,
            'Source of Broodstock': batch.sourceOfBroodstock || 'N/A',
            'Hatchery / Incubation Date': batch.hatcheryDate || 'N/A',
            'First Date of Feeding': batch.firstDateOfFeeding || 'N/A',
            'Date of Transfer to Grow-Out': batch.dateOfTransferToGrowOut || 'N/A',
            'Total Transferred Fingerlings (Qty)': Number(batch.totalTransferredFingerlings) || 0,
            'Average Weight (g)': Number(batch.averageWeightTransferred) || 0,
            'Age of Fingerlings (Weeks/Days)': batch.ageOfFingerlingsTransferred || 'N/A',
            'Health Status': batch.healthStatusTransferred || 'Good',
            'Destination Pond': batch.destinatedPondTransferred || 'N/A',
            'Current Hatchery Stage': stageInfo.stage,
            'Lock / Save Status': batch.isLocked ? 'Locked & Saved (Permanent)' : 'Active / Editable',
            'Remarks / Notes': batch.remarks || rep.formData?.generalNotes || rep.content || '',
            'Log Report Title': logName,
            'Submitting Staff': submitter,
            'Date Logged': dateLogged,
            'Approval Status': status
          });
        });
      }
    });

    if (rowData.length === 0) {
      alert('No hatchery batch records found to export.');
      return;
    }

    // Build worksheet with corporate title headers
    const ws = XLSX.utils.json_to_sheet(rowData, { origin: 'A5' });

    // Set Header metadata on rows A1:A4
    XLSX.utils.sheet_add_aoa(ws, [
      ['ACCAD FARMS LIMITED - HATCHERY OPERATIONS & BATCH LEDGER'],
      ['Agboopa Village, Awowo, Ewekoro Local Government Area, Abeokuta, Ogun State, Nigeria | info@accadfarms.com'],
      [`Export Timestamp: ${new Date().toLocaleString()} | Total Recorded Batches: ${rowData.length}`],
      []
    ], { origin: 'A1' });

    // Set column widths for clear readability
    ws['!cols'] = [
      { wch: 16 }, // Batch #
      { wch: 22 }, // Broodstock
      { wch: 18 }, // Hatchery Date
      { wch: 18 }, // First Date Feeding
      { wch: 22 }, // Date Transfer
      { wch: 24 }, // Total Transferred
      { wch: 18 }, // Avg Weight
      { wch: 22 }, // Age
      { wch: 16 }, // Health
      { wch: 18 }, // Dest Pond
      { wch: 24 }, // Current Stage
      { wch: 24 }, // Lock / Save Status
      { wch: 32 }, // Remarks
      { wch: 26 }, // Log Title
      { wch: 20 }, // Staff
      { wch: 16 }, // Date Submitted
      { wch: 22 }  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hatchery Batch Ledger');

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = Array.isArray(input) 
      ? `ACCAD_FARMS_Hatchery_Ledger_${dateStr}.xlsx`
      : `Hatchery_Ledger_${formatLogName(input).replace(/[/\\?%*:|"<>]/g, '_')}.xlsx`;

    XLSX.writeFile(wb, filename);
  } catch (err: any) {
    console.error('Error exporting hatchery to Excel:', err);
    alert('Failed to export Excel file: ' + err.message);
  }
}
