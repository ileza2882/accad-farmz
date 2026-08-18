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

    // ACCAD FARMS Official Standard Letterhead (Clean Branding Only)
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

    // Section 1: Metadata & Approval Audit Trail Table (Starts right below letterhead)
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
      startY: 36,
      head: [['LOG METADATA FIELD', 'EXHAUSTIVE RECORD DETAILS']],
      body: metaBody,
      theme: 'grid',
      headStyles: { 
        fillColor: [6, 78, 59], // Thicker, Darker Forest Green Header
        textColor: 255, 
        fontStyle: 'bold',
        lineWidth: 0.5,
        lineColor: [4, 120, 87]
      },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 54, fillColor: [240, 253, 244], textColor: [6, 78, 59] }, // Light Mint Column
        1: { cellWidth: 126, fillColor: [255, 255, 255], textColor: [15, 23, 42] }
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
      autoTable(doc, {
        startY: currentY,
        head: [['OPERATIONAL NARRATIVE & OBSERVATION NOTES', 'FIELD DETAILS & NOTES']],
        body: narrativeRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [15, 23, 42], // Dark Slate Header
          textColor: 255, 
          fontStyle: 'bold',
          lineWidth: 0.5,
          lineColor: [30, 41, 59]
        },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 54, fillColor: [240, 253, 244], textColor: [6, 78, 59] },
          1: { cellWidth: 126, fillColor: [255, 255, 255], textColor: [15, 23, 42] }
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

        const feedItems = assetData.feedsInventory.items.map((item, idx) => [
          String(idx + 1),
          item.type || 'Branded',
          item.brand || 'N/A',
          item.size || 'N/A',
          `${item.quantityKg || 0} Kg`
        ]);

        feedItems.push([
          'TOTAL',
          'CALCULATED FEEDS IN STORE',
          'ALL BRANDS',
          'TOTAL STORE WT',
          `${assetData.feedsInventory.totalFeedsInStore || assetData.feedStorage?.totalFeedInStoreKg || 0} Kg`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'FEED TYPE', 'BRAND', 'PELLET SIZE', 'QUANTITY']],
          body: feedItems,
          theme: 'grid',
          headStyles: { 
            fillColor: [6, 95, 70], // Thicker, Darker Green Header
            textColor: 255, 
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [4, 120, 87]
          },
          styles: { fontSize: 8, cellPadding: 2.2 },
          columnStyles: {
            0: { cellWidth: 14, fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [6, 78, 59] }, // Light Mint
            1: { fillColor: [248, 250, 252], textColor: [15, 23, 42] }, // Light Slate
            2: { fillColor: [240, 249, 255], textColor: [3, 105, 161] }, // Light Sky Blue
            3: { fillColor: [254, 243, 199], textColor: [146, 64, 14] }, // Light Warm Amber
            4: { fillColor: [250, 245, 255], textColor: [107, 33, 168], fontStyle: 'bold' } // Light Lavender
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Raw Ingredients Breakdown Table
      if (assetData.ingredientsUsed) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

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
          head: [['RAW INGREDIENT', 'USAGE (KG)', 'RAW INGREDIENT', 'USAGE (KG)']],
          body: ingRows,
          theme: 'grid',
          headStyles: { 
            fillColor: [15, 23, 42], // Dark Slate Header
            textColor: 255, 
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [30, 41, 59]
          },
          styles: { fontSize: 8, cellPadding: 2.2 },
          columnStyles: {
            0: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [6, 78, 59] }, // Light Mint
            1: { fontStyle: 'bold', fillColor: [240, 249, 255], textColor: [3, 105, 161] }, // Light Sky
            2: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [6, 78, 59] },
            3: { fontStyle: 'bold', fillColor: [240, 249, 255], textColor: [3, 105, 161] }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Drugs & Additives Table
      if (assetData.drugsUsed) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

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
          headStyles: { 
            fillColor: [15, 23, 42], // Dark Slate Header
            textColor: 255, 
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [30, 41, 59]
          },
          styles: { fontSize: 8, cellPadding: 2.2 },
          columnStyles: {
            0: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [6, 78, 59] },
            1: { fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [146, 64, 14] }, // Light Amber
            2: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [6, 78, 59] },
            3: { fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [146, 64, 14] }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Machinery Health Check Table
      if (assetData.machineCheck) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

        const mc = assetData.machineCheck;
        const machineRows = Object.entries(mc).map(([key, val]) => [
          MACHINE_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          val || 'Good'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['MACHINERY / EQUIPMENT ITEM', 'OPERATIONAL HEALTH STATUS']],
          body: machineRows,
          theme: 'grid',
          headStyles: { 
            fillColor: [6, 95, 70], // Dark Forest Green Header
            textColor: 255, 
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [4, 120, 87]
          },
          styles: { fontSize: 8, cellPadding: 2.2 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 100, fillColor: [240, 253, 244], textColor: [6, 78, 59] },
            1: { cellWidth: 80, fontStyle: 'bold', fillColor: [240, 249, 255], textColor: [3, 105, 161] }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Technical Report & Fuel Table
      if (assetData.technicalReport) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }

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
          headStyles: { 
            fillColor: [15, 23, 42], // Dark Slate Header
            textColor: 255, 
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [30, 41, 59]
          },
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 54, fillColor: [240, 253, 244], textColor: [6, 78, 59] },
            1: { cellWidth: 126, fontStyle: 'bold', fillColor: [240, 249, 255], textColor: [3, 105, 161] }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;

        if (tech.generatorMeterPhoto) {
          if (currentY > 220) { doc.addPage(); currentY = 20; }
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
        livestockData.ponds.forEach((pond, idx) => {
          if (currentY > 230) { doc.addPage(); currentY = 20; }

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
            head: [[`POND #${idx + 1} (${pond.pondNo}) PARAMETER`, 'RECORDED POND OBSERVATION']],
            body: pondRows,
            theme: 'grid',
            headStyles: { 
              fillColor: [6, 95, 70], // Dark Forest Green Header
              textColor: 255, 
              fontStyle: 'bold',
              lineWidth: 0.5,
              lineColor: [4, 120, 87]
            },
            styles: { fontSize: 8, cellPadding: 2.2 },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 54, fillColor: [240, 253, 244], textColor: [6, 78, 59] }, // Light Mint
              1: { cellWidth: 126, fillColor: [255, 255, 255], textColor: [15, 23, 42] }
            }
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
        hatcheryData.batches.forEach((batch, idx) => {
          if (currentY > 230) { doc.addPage(); currentY = 20; }

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
            head: [[`HATCHERY BATCH #${idx + 1} (${batch.batchNumber || 'Batch'}) PARAMETER`, 'RECORDED AUDIT VALUE']],
            body: batchRows,
            theme: 'grid',
            headStyles: { 
              fillColor: [88, 28, 135], // Deep Purple Header for Hatchery
              textColor: 255, 
              fontStyle: 'bold',
              lineWidth: 0.5,
              lineColor: [107, 33, 168]
            },
            styles: { fontSize: 8, cellPadding: 2.2 },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 54, fillColor: [250, 245, 255], textColor: [88, 28, 135] }, // Light Lavender
              1: { cellWidth: 126, fillColor: [255, 255, 255], textColor: [15, 23, 42] }
            }
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
    // Build Exhaustive Word HTML Blob
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${logName}</title>
        <style>
          @page {
            size: portrait;
            margin: 0.8in;
            @bottom-right { content: "Page " counter(page); font-size: 8pt; color: #64748b; }
          }
          body { font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.45; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; page-break-inside: avoid; }
          th { background-color: #064e3b; color: #ffffff; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; border: 1.5px solid #047857; padding: 9px 11px; letter-spacing: 0.5px; }
          td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 9pt; vertical-align: top; }
          .col-label { background-color: #f0fdf4; color: #064e3b; font-weight: bold; width: 32%; border: 1px solid #cbd5e1; }
          .col-value { background-color: #ffffff; color: #0f172a; width: 68%; border: 1px solid #cbd5e1; }
          .col-mint { background-color: #f0fdf4; color: #064e3b; font-weight: bold; border: 1px solid #cbd5e1; }
          .col-slate { background-color: #f8fafc; color: #1e293b; border: 1px solid #cbd5e1; }
          .col-sky { background-color: #f0f9ff; color: #0369a1; border: 1px solid #cbd5e1; }
          .col-amber { background-color: #fffbeb; color: #92400e; border: 1px solid #cbd5e1; }
          .col-lavender { background-color: #faf5ff; color: #6b21a8; font-weight: bold; border: 1px solid #cbd5e1; }
          .photo-box { margin-top: 10px; padding: 10px; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 6px; }
          .photo-box img { max-width: 450px; max-height: 300px; border-radius: 4px; display: block; margin-top: 6px; }
          .footer { margin-top: 36px; font-size: 8pt; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 8px; text-align: center; }
        </style>
      </head>
      <body>

        <!-- Official Standard Letterhead Header (Clean Branding Only) -->
        <table style="width: 100%; border: none; border-bottom: 2.5px solid #006400; padding-bottom: 12px; margin-bottom: 20px; page-break-inside: avoid;">
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

        <!-- Section 1: Metadata & Approvals -->
        <table>
          <thead>
            <tr><th colspan="2">LOG SPECIFICATIONS & APPROVAL AUDIT</th></tr>
          </thead>
          <tbody>
            <tr><td class="col-label">Standardized Log Name</td><td class="col-value"><strong>${logName}</strong></td></tr>
            <tr><td class="col-label">Inventory Type</td><td class="col-value">${report.inventoryType || 'General Log'}</td></tr>
            <tr><td class="col-label">Department Sector</td><td class="col-value">${report.department || 'Fishery'}</td></tr>
            <tr><td class="col-label">Date Submitted</td><td class="col-value">${dateSubmitted}</td></tr>
            <tr><td class="col-label">Submitting User</td><td class="col-value">${report.fullName || 'Staff User'} (${report.email})</td></tr>
            <tr><td class="col-label">User Computer Workstation</td><td class="col-value"><code>${computerName}</code></td></tr>
            <tr><td class="col-label">Log Status</td><td class="col-value"><strong>${statusText}</strong></td></tr>
            <tr><td class="col-label">Submission Audit</td><td class="col-value">${report.isResubmitted ? `REDONE & RESUBMITTED (Attempt #${report.resubmissionCount || 1})` : 'Initial Log Submission'}</td></tr>
            ${report.isResubmitted && report.previousRejectionReason ? `<tr><td class="col-label">Previous Rejection Note</td><td class="col-value" style="color: #b91c1c; font-weight: bold;">${report.previousRejectionReason}</td></tr>` : ''}
            <tr><td class="col-label">Approval & Vetting Audit</td><td class="col-value">${approvalHistory || 'No approval record timestamped yet'}</td></tr>
            <tr><td class="col-label">Timestamps</td><td class="col-value">Logged: ${dateSubmitted}<br/>Last Updated: ${new Date(report.updatedAt || report.timestamp).toLocaleString()}</td></tr>
          </tbody>
        </table>

        <!-- Section 2: Narrative & Field Observations -->
        <table>
          <thead>
            <tr><th colspan="2" style="background-color: #0f172a; border-color: #1e293b;">OPERATIONAL NARRATIVE & FIELD OBSERVATIONS</th></tr>
          </thead>
          <tbody>
            <tr><td class="col-label">Operational Log Narrative</td><td class="col-value">${report.content || 'N/A'}</td></tr>
            ${assetData?.feedStorage ? `
              <tr><td class="col-label">Feed Wastage Noticed</td><td class="col-value">${assetData.feedStorage.wastageNoticed?.hasWastage ? `YES - Comment: ${assetData.feedStorage.wastageNoticed.comment || 'Wastage observed'}` : 'NO wastage reported'}</td></tr>
              <tr><td class="col-label">Machine Issues Reported</td><td class="col-value">${assetData.feedStorage.machineIssues?.hasIssue ? `YES - Comment: ${assetData.feedStorage.machineIssues.comment || 'Issue reported'}` : 'NO machine issues reported'}</td></tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Section 3: Asset Inventory Data -->
        ${assetData ? `
          ${assetData.feedsInventory?.items?.length ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 8%;">#</th>
                  <th style="width: 26%;">FEED TYPE</th>
                  <th style="width: 26%;">BRAND</th>
                  <th style="width: 20%;">PELLET SIZE</th>
                  <th style="width: 20%;">QUANTITY (KG)</th>
                </tr>
              </thead>
              <tbody>
                ${assetData.feedsInventory.items.map((item, idx) => `
                  <tr>
                    <td class="col-mint" style="text-align: center;">${idx + 1}</td>
                    <td class="col-slate">${item.type || 'Branded'}</td>
                    <td class="col-sky">${item.brand || 'N/A'}</td>
                    <td class="col-amber">${item.size || 'N/A'}</td>
                    <td class="col-lavender"><strong>${item.quantityKg || 0} Kg</strong></td>
                  </tr>
                `).join('')}
                <tr style="background-color: #ecfdf5; font-weight: bold;">
                  <td colspan="3" class="col-mint">CALCULATED STORE FEEDS:</td>
                  <td colspan="2" class="col-lavender">Total Store Weight: ${assetData.feedsInventory.totalFeedsInStore || assetData.feedStorage?.totalFeedInStoreKg || 0} Kg</td>
                </tr>
              </tbody>
            </table>
          ` : ''}

          ${assetData.ingredientsUsed ? `
            <table>
              <thead>
                <tr>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 28%;">RAW INGREDIENT</th>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 22%;">QUANTITY (KG)</th>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 28%;">RAW INGREDIENT</th>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 22%;">QUANTITY (KG)</th>
                </tr>
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
                    html += `<tr>
                      <td class="col-mint">${first[0]}</td>
                      <td class="col-sky" style="font-weight: bold;">${first[1]}</td>
                      <td class="col-mint">${second[0]}</td>
                      <td class="col-sky" style="font-weight: bold;">${second[1]}</td>
                    </tr>`;
                  }
                  return html;
                })()}
              </tbody>
            </table>
          ` : ''}

          ${assetData.drugsUsed ? `
            <table>
              <thead>
                <tr>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 28%;">DRUG / ADDITIVE</th>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 22%;">DOSAGE/VAL</th>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 28%;">DRUG / ADDITIVE</th>
                  <th style="background-color: #0f172a; border-color: #1e293b; width: 22%;">DOSAGE/VAL</th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="col-mint">KlinoFeed</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.klinoFeed || 0}</td><td class="col-mint">Lysine</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.lysine || 0}</td></tr>
                <tr><td class="col-mint">Probiotic</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.probiotic || 0}</td><td class="col-mint">Enzyme</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.enzyme || 0}</td></tr>
                <tr><td class="col-mint">Fish Premix</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.fishPremix || 0}</td><td class="col-mint">Toxin Binder</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.toxin || 0}</td></tr>
                <tr><td class="col-mint">Methionine</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.methionine || 0}</td><td class="col-mint">DCP</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.dcp || 0}</td></tr>
                <tr><td class="col-mint">Salt</td><td class="col-amber" style="font-weight: bold;">${assetData.drugsUsed.salt || 0}</td><td class="col-slate">-</td><td class="col-slate">-</td></tr>
              </tbody>
            </table>
          ` : ''}

          ${assetData.machineCheck ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 60%;">MACHINERY / EQUIPMENT ITEM</th>
                  <th style="width: 40%;">OPERATIONAL HEALTH STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(assetData.machineCheck).map(([k, v]) => `
                  <tr>
                    <td class="col-mint">${MACHINE_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                    <td class="col-sky"><strong>${v || 'Good'}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${assetData.technicalReport ? `
            <table>
              <thead>
                <tr><th colspan="2" style="background-color: #0f172a; border-color: #1e293b;">TECHNICAL & DIESEL FUEL AUDIT</th></tr>
              </thead>
              <tbody>
                <tr><td class="col-label">Diesel Generator (Litres)</td><td class="col-sky" style="font-weight: bold;">${assetData.technicalReport.dieselGeneratorLitres || 0} L</td></tr>
                <tr><td class="col-label">Diesel Kegs (Litres)</td><td class="col-sky" style="font-weight: bold;">${assetData.technicalReport.dieselKegsLitres || 0} L</td></tr>
                <tr><td class="col-label">Total Available Diesel</td><td class="col-sky" style="font-weight: bold; color: #0369a1;">${assetData.technicalReport.totalDieselAvailable || 0} L</td></tr>
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
          ${livestockData.ponds.map((pond, pIdx) => `
            <table style="margin-top: 14px;">
              <thead>
                <tr><th colspan="2">POND #${pIdx + 1}: ${pond.pondNo} (${pond.batch})</th></tr>
              </thead>
              <tbody>
                <tr><td class="col-label">Pond Size</td><td class="col-value">${pond.pondSizeSqm} SQM</td></tr>
                <tr><td class="col-label">Fish Count</td><td class="col-value" style="font-weight: bold; color: #065f46;">${pond.quantityOfFish} Fish</td></tr>
                <tr><td class="col-label">Water Condition</td><td class="col-value">${pond.waterCondition || 'Clear'}</td></tr>
                <tr><td class="col-label">Water Changed Today</td><td class="col-value">${pond.waterChangedToday?.hasChanged ? `YES (${pond.waterChangedToday.times || 1} times)` : 'NO'}</td></tr>
                <tr><td class="col-label">Feeding Records</td><td class="col-value">${(pond.feedingRecords?.items || []).map(f => `${f.type} (${f.brand || ''} ${f.size}): ${f.quantityKg}Kg`).join('; ') || 'N/A'}</td></tr>
                <tr><td class="col-label">Feeding Response</td><td class="col-value">${pond.feedingResponse || 'Active'}</td></tr>
                <tr><td class="col-label">Mortality Count</td><td class="col-value" style="color: #b91c1c; font-weight: bold;">${pond.mortality || 0} Fish</td></tr>
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
          ${hatcheryData.batches.map((batch, bIdx) => `
            <table style="margin-top: 14px;">
              <thead>
                <tr><th colspan="2" style="background-color: #581c87; border-color: #6b21a8;">HATCHERY BATCH #${bIdx + 1}: ${batch.batchNumber || 'Batch'}</th></tr>
              </thead>
              <tbody>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Source of Broodstock</td><td class="col-value"><strong>${batch.sourceOfBroodstock || 'N/A'}</strong></td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Batch Number</td><td class="col-value">${batch.batchNumber || 'N/A'}</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Hatchery Date</td><td class="col-value">${batch.hatcheryDate || 'N/A'}</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">First Date of Feeding</td><td class="col-value">${batch.firstDateOfFeeding || 'N/A'}</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Date of Transfer to Grow-Out</td><td class="col-value">${batch.dateOfTransferToGrowOut || 'N/A'}</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Total Transferred Fingerlings</td><td class="col-value" style="font-weight: bold; color: #581c87;">${Number(batch.totalTransferredFingerlings || 0).toLocaleString()} Fish</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Average Weight of Fingerlings</td><td class="col-value">${batch.averageWeightTransferred || 0} g</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Age of Fingerlings</td><td class="col-value">${batch.ageOfFingerlingsTransferred || 'N/A'}</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Health Status</td><td class="col-value">${batch.healthStatusTransferred || 'Good'}</td></tr>
                <tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Destinated Pond</td><td class="col-value">${batch.destinatedPondTransferred || 'N/A'}</td></tr>
                ${batch.remarks ? `<tr><td class="col-label" style="background-color: #faf5ff; color: #581c87;">Batch Remarks</td><td class="col-value">${batch.remarks}</td></tr>` : ''}
              </tbody>
            </table>
          `).join('')}
          ${hatcheryData.generalNotes ? `
            <div style="margin-top: 10px; padding: 10px; background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; font-size: 9pt; color: #581c87;">
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
 * Dedicated Excel Exporter for Hatchery Section Records
 * Each parameter forms a column, and each batch / progressive update forms a new row.
 * Color coded with light professional pastel shades and darker thicker headers.
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
          batchNo: 'General Entry',
          broodstock: 'N/A',
          hatcheryDate: dateLogged,
          firstFeedDate: 'N/A',
          transferDate: 'N/A',
          qty: 0,
          avgWeight: 0,
          age: 'N/A',
          health: 'N/A',
          destPond: 'N/A',
          stage: 'N/A',
          lockStatus: 'N/A',
          remarks: rep.content || 'N/A',
          reportTitle: logName,
          staff: submitter,
          dateLogged: dateLogged,
          status: status
        });
      } else {
        batches.forEach((batch, bIdx) => {
          const stageInfo = getHatcheryBatchStage(batch);
          rowData.push({
            batchNo: batch.batchNumber || `Batch #${bIdx + 1}`,
            broodstock: batch.sourceOfBroodstock || 'N/A',
            hatcheryDate: batch.hatcheryDate || 'N/A',
            firstFeedDate: batch.firstDateOfFeeding || 'N/A',
            transferDate: batch.dateOfTransferToGrowOut || 'N/A',
            qty: Number(batch.totalTransferredFingerlings) || 0,
            avgWeight: Number(batch.averageWeightTransferred) || 0,
            age: batch.ageOfFingerlingsTransferred || 'N/A',
            health: batch.healthStatusTransferred || 'Good',
            destPond: batch.destinatedPondTransferred || 'N/A',
            stage: stageInfo.stage,
            lockStatus: batch.isLocked ? 'Locked & Saved (Permanent)' : 'Active / Editable',
            remarks: batch.remarks || rep.formData?.generalNotes || rep.content || '',
            reportTitle: logName,
            staff: submitter,
            dateLogged: dateLogged,
            status: status
          });
        });
      }
    });

    if (rowData.length === 0) {
      alert('No hatchery batch records found to export.');
      return;
    }

    // Build Rich Styled HTML / XML Spreadsheet Blob with embedded color codes
    const xmlSpreadsheet = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="BrandTitle">
   <Font ss:FontName="Times New Roman" ss:Size="16" ss:Bold="1" ss:Color="#006400"/>
  </Style>
  <Style ss:ID="BrandSub">
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#334155"/>
  </Style>
  <Style ss:ID="HeaderCol">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#047857"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#047857"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#065F46" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColMint">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Bold="1" ss:Color="#064E3B"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColSky">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Color="#0369A1"/>
   <Interior ss:Color="#F0F9FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColAmber">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Bold="1" ss:Color="#92400E"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColLavender">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Bold="1" ss:Color="#6B21A8"/>
   <Interior ss:Color="#FAF5FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColSlate">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Hatchery Batch Ledger">
  <Table>
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="130"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="160"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>

   <Row ss:Height="22">
    <Cell ss:StyleID="BrandTitle"><Data ss:Type="String">ACCAD FARMS LIMITED - HATCHERY OPERATIONS &amp; BATCH LEDGER</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:StyleID="BrandSub"><Data ss:Type="String">Agboopa Village, Awowo, Ewekoro LGA, Abeokuta, Ogun State, Nigeria | info@accadfarms.com</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:StyleID="BrandSub"><Data ss:Type="String">Export Timestamp: ${new Date().toLocaleString()} | Total Recorded Batches: ${rowData.length}</Data></Cell>
   </Row>
   <Row ss:Height="8"/>

   <!-- Header Row with Thicker, Darker Emerald Green Styling -->
   <Row ss:Height="26">
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Batch #</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Source of Broodstock</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Hatchery Date</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">First Date of Feeding</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Date of Transfer</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Total Transferred (Qty)</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Average Weight (g)</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Age (Weeks/Days)</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Health Status</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Destination Pond</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Current Hatchery Stage</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Lock / Save Status</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Remarks / Notes</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Log Report Title</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Submitting Staff</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Date Submitted</Data></Cell>
    <Cell ss:StyleID="HeaderCol"><Data ss:Type="String">Approval Status</Data></Cell>
   </Row>

   <!-- Data Rows Color-Coded by Functional Groups with Light Pastel Shades -->
   ${rowData.map(r => `
   <Row ss:Height="20">
    <Cell ss:StyleID="ColMint"><Data ss:Type="String">${escapeXml(r.batchNo)}</Data></Cell>
    <Cell ss:StyleID="ColMint"><Data ss:Type="String">${escapeXml(r.broodstock)}</Data></Cell>
    <Cell ss:StyleID="ColSky"><Data ss:Type="String">${escapeXml(r.hatcheryDate)}</Data></Cell>
    <Cell ss:StyleID="ColSky"><Data ss:Type="String">${escapeXml(r.firstFeedDate)}</Data></Cell>
    <Cell ss:StyleID="ColSky"><Data ss:Type="String">${escapeXml(r.transferDate)}</Data></Cell>
    <Cell ss:StyleID="ColAmber"><Data ss:Type="Number">${r.qty}</Data></Cell>
    <Cell ss:StyleID="ColAmber"><Data ss:Type="Number">${r.avgWeight}</Data></Cell>
    <Cell ss:StyleID="ColAmber"><Data ss:Type="String">${escapeXml(r.age)}</Data></Cell>
    <Cell ss:StyleID="ColLavender"><Data ss:Type="String">${escapeXml(r.health)}</Data></Cell>
    <Cell ss:StyleID="ColLavender"><Data ss:Type="String">${escapeXml(r.destPond)}</Data></Cell>
    <Cell ss:StyleID="ColLavender"><Data ss:Type="String">${escapeXml(r.stage)}</Data></Cell>
    <Cell ss:StyleID="ColSlate"><Data ss:Type="String">${escapeXml(r.lockStatus)}</Data></Cell>
    <Cell ss:StyleID="ColSlate"><Data ss:Type="String">${escapeXml(r.remarks)}</Data></Cell>
    <Cell ss:StyleID="ColSlate"><Data ss:Type="String">${escapeXml(r.reportTitle)}</Data></Cell>
    <Cell ss:StyleID="ColMint"><Data ss:Type="String">${escapeXml(r.staff)}</Data></Cell>
    <Cell ss:StyleID="ColSlate"><Data ss:Type="String">${escapeXml(r.dateLogged)}</Data></Cell>
    <Cell ss:StyleID="ColMint"><Data ss:Type="String">${escapeXml(r.status)}</Data></Cell>
   </Row>
   `).join('')}

  </Table>
 </Worksheet>
</Workbook>`;

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = Array.isArray(input) 
      ? `ACCAD_FARMS_Hatchery_Ledger_${dateStr}.xls`
      : `Hatchery_Ledger_${formatLogName(input).replace(/[/\\?%*:|"<>]/g, '_')}.xls`;

    const blob = new Blob(['\ufeff', xmlSpreadsheet], {
      type: 'application/vnd.ms-excel;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (err: any) {
    console.error('Error exporting hatchery to Excel:', err);
    alert('Failed to export Excel file: ' + err.message);
  }
}

function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
