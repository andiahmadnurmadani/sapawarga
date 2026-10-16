/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, PengajuanSurat, InfoRT, SuratType, Inventory, IncidentLog, WargaReport, TempResident, AppConfig, SuratBlock, AppNotification } from './types';
import { jsPDF } from 'jspdf';
import { getCdnUrl } from './lib/cdnUtils';

/**
 * Mengambil gambar dari URL (termasuk CDN proxy) dan mengubahnya ke base64.
 * Diperlukan agar jsPDF bisa merender gambar dari CDN.
 */
async function fetchImageAsBase64(urlOrId: string): Promise<string | null> {
  if (!urlOrId) return null;
  try {
    // Jika sudah base64, kembalikan langsung
    if (urlOrId.startsWith('data:')) return urlOrId;
    // Konversi CDN file ID ke URL proxy
    const url = getCdnUrl(urlOrId);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Mock storage keys
const USERS_KEY = 'suradigital_users';
const PENGAJUAN_KEY = 'suradigital_pengajuan';
const INFO_KEY = 'suradigital_info';
const CURRENT_USER_KEY = 'suradigital_current_user';
const TEMPLATES_KEY = 'suradigital_templates';
const INVENTORY_KEY = 'suradigital_inventory';
const INCIDENTS_KEY = 'suradigital_incidents';
const REPORTS_KEY = 'suradigital_reports';
const TEMP_RESIDENTS_KEY = 'suradigital_temp_residents';
const CONFIG_KEY = 'suradigital_config';
const NOTIFICATIONS_KEY = 'suradigital_notifications';

const DEFAULT_CONFIG: AppConfig = {
  villageName: 'KETAPANG',
  districtName: 'KADEMANGAN',
  cityName: 'KOTA PROBOLINGGO',
  rtNumber: '02',
  rwNumber: '03',
  rtLeaderName: 'SUNAR WIBOWO',
  rwLeaderName: 'SOLIHIN',
  secretaryAddress: 'Jl. Kinibalu II No. 20 Kota Probolinggo',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/National_Emblem_of_Indonesia_Garuda_Pancasila.svg/450px-National_Emblem_of_Indonesia_Garuda_Pancasila.svg.png'
};

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Administrator Desa',
    nik: '0000000000000000',
    email: 'admin@desa.id',
    password: 'admin123',
    role: 'ADMIN',
    alamat: 'Kantor Desa Maju Jaya'
  },
  {
    id: 'warga-1',
    name: 'Budi Santoso',
    nik: '3201010101010001',
    email: 'budi@warga.id',
    password: 'warga123',
    role: 'WARGA',
    alamat: 'Jl. Merdeka No. 10, RT 01/01'
  },
  {
    id: 'warga-2',
    name: 'Siti Aminah',
    nik: '3201010101010002',
    email: 'siti@warga.id',
    password: 'user123',
    role: 'WARGA',
    alamat: 'Jl. Melati No. 5, RT 01/01'
  }
];

export const storage = {
  getUsers: (): User[] => {
    const usersStr = localStorage.getItem(USERS_KEY);
    let users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    // Always ensure default users are in the system for testing
    const adminExists = users.some(u => u.email === DEFAULT_USERS[0].email);
    if (!adminExists || users.length === 0) {
      // Merge defaults with existing users if some exist, otherwise just use defaults
      const merged = [...DEFAULT_USERS];
      users.forEach(u => {
        if (!merged.some(m => m.email === u.email || (m.nik && u.nik && m.nik === u.nik))) {
          merged.push(u);
        }
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(merged));
      console.log('--- TEST ACCOUNTS AVAILABLE ---');
      console.log('Admin:', DEFAULT_USERS[0].email, '/', DEFAULT_USERS[0].password);
      console.log('Warga 1:', DEFAULT_USERS[1].email, '/', DEFAULT_USERS[1].password);
      console.log('Warga 2:', DEFAULT_USERS[2].email, '/', DEFAULT_USERS[2].password);
      return merged;
    }
    return users;
  },
  setUsers: (users: User[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users)),
  
  getPengajuan: (): PengajuanSurat[] => JSON.parse(localStorage.getItem(PENGAJUAN_KEY) || '[]'),
  setPengajuan: (pengajuan: PengajuanSurat[]) => localStorage.setItem(PENGAJUAN_KEY, JSON.stringify(pengajuan)),
  
  getInfo: (): InfoRT[] => JSON.parse(localStorage.getItem(INFO_KEY) || '[]'),
  setInfo: (info: InfoRT[]) => localStorage.setItem(INFO_KEY, JSON.stringify(info)),
  
  getCurrentUser: (): User | null => JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null'),
  setCurrentUser: (user: User | null) => localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user)),

  getTemplates: (): SuratType[] => JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'),
  setTemplates: (templates: SuratType[]) => localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)),

  getInventory: (): Inventory[] => JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]'),
  setInventory: (items: Inventory[]) => localStorage.setItem(INVENTORY_KEY, JSON.stringify(items)),

  getIncidents: (): IncidentLog[] => JSON.parse(localStorage.getItem(INCIDENTS_KEY) || '[]'),
  setIncidents: (logs: IncidentLog[]) => localStorage.setItem(INCIDENTS_KEY, JSON.stringify(logs)),

  getReports: (): WargaReport[] => JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]'),
  setReports: (reports: WargaReport[]) => localStorage.setItem(REPORTS_KEY, JSON.stringify(reports)),

  getTempResidents: (): TempResident[] => JSON.parse(localStorage.getItem(TEMP_RESIDENTS_KEY) || '[]'),
  setTempResidents: (residents: TempResident[]) => localStorage.setItem(TEMP_RESIDENTS_KEY, JSON.stringify(residents)),

  getConfig: (): AppConfig => {
    return DEFAULT_CONFIG;
  },
  setConfig: (config: AppConfig) => {
    // Disabled localstorage
  },

  getNotifications: (): AppNotification[] => JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]'),
  setNotifications: (notifications: AppNotification[]) => localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications)),
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const createNotification = (userId: string, title: string, message: string, type: AppNotification['type'], relatedId?: string) => {
  const notifications = storage.getNotifications();
  const newNotif: AppNotification = {
    id: generateId(),
    userId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
    relatedId
  };
  storage.setNotifications([newNotif, ...notifications]);
  return newNotif;
};

export const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
};

export const formatDateTime = formatDate;

export const downloadTextFile = (filename: string, content: string) => {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const generatePDF = async (filename: string, content: string, config: AppConfig, blocks?: SuratBlock[], item?: PengajuanSurat, returnBlob?: boolean): Promise<any> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20; // Matches the editor's 15-20mm padding
  const contentWidth = pageWidth - (margin * 2);

  if (blocks && blocks.length > 0) {
    let cursorY = margin; // Start from top margin
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const now = new Date();

    // Pre-fetch semua gambar yang dibutuhkan agar jsPDF bisa merender dari CDN
    const logoBase64    = await fetchImageAsBase64(config.logoUrl || '');
    const rtSigBase64   = await fetchImageAsBase64(config.signatureUrl || '');
    const rwSigBase64   = await fetchImageAsBase64(config.rwSignatureUrl || '');
    // Kumpulkan TTD per-block (override)
    const blockSigCache: Record<string, { rt: string | null; rw: string | null }> = {};
    for (const block of blocks) {
      if (block.type === 'SIGNATURE') {
        const rtUrl = block.config?.rtSigUrl || '';
        const rwUrl = block.config?.rwSigUrl || '';
        blockSigCache[block.id] = {
          rt: rtUrl ? await fetchImageAsBase64(rtUrl) : null,
          rw: rwUrl ? await fetchImageAsBase64(rwUrl) : null,
        };
      }
    }

    blocks.forEach((block, index) => {
      let blockContent = block.content || '';
      
      // Replace common placeholders
      blockContent = blockContent
        .replace(/{{RT}}/g, config.rtNumber)
        .replace(/{{RW}}/g, config.rwNumber)
        .replace(/{{KELURAHAN}}/g, config.villageName)
        .replace(/{{KECAMATAN}}/g, config.districtName)
        .replace(/{{KOTA}}/g, config.cityName)
        .replace(/{{TAHUN}}/g, now.getFullYear().toString())
        .replace(/{{BULAN_ROMAWI}}/g, romanMonths[now.getMonth()]);

      const bFontSize = block.fontSize || (block.type === 'TITLE' ? 14 : 11.5);
      const bLineHeight = block.lineHeight || 1.1; // Tight space saving (jarak 1)
      const bTextAlign = block.textAlign || (block.type === 'TITLE' ? 'center' : 'left');
      
      doc.setFont('times', block.isBold || block.type === 'TITLE' ? 'bold' : 'normal');
      doc.setFontSize(bFontSize);

      // Page break check (rough estimate)
      if (cursorY > 275) {
        doc.addPage();
        cursorY = margin;
      }

      switch(block.type) {
        case 'HEADER':
          const headerStartY = cursorY;
          // Logo on the left
          if (logoBase64) {
             try { doc.addImage(logoBase64, 'PNG', margin, headerStartY, 22, 22); } catch(e) {}
          }
          
          const headerTextX = margin + 25; 
          const headerCenter = (pageWidth + headerTextX - margin) / 2;

          // Header text color is now black
          doc.setTextColor(0, 0, 0); 
          doc.setFont('times', 'bold');
          doc.setFontSize(16);
          const headerTitle = blockContent || (config.rtNumber && config.rwNumber ? `RUKUN TETANGGA ${config.rtNumber} RUKUN WARGA ${config.rwNumber}` : 'RUKUN TETANGGA ... RUKUN WARGA ...');
          doc.text(headerTitle, headerCenter, headerStartY + 5, { align: 'center' });
          
          doc.setFontSize(13);
          doc.text(`${block.config?.headerPrefix1 ?? 'KELURAHAN'} ${config.villageName.toUpperCase()}`, headerCenter, headerStartY + 10, { align: 'center' });
          
          doc.setFontSize(12);
          doc.text(`${block.config?.headerPrefix2 ?? 'KECAMATAN'} ${config.districtName.toUpperCase()} ${config.cityName.toUpperCase()}`, headerCenter, headerStartY + 15, { align: 'center' });
          
          doc.setTextColor(0, 0, 0); // Back to black
          doc.setFont('times', 'italic');
          doc.setFontSize(9);
          doc.text(`${block.config?.headerPrefix3 ?? 'Sekretariat :'} ${config.secretaryAddress}`, headerCenter, headerStartY + 20, { align: 'center' });
          
          // Double Line
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.8);
          doc.line(margin, headerStartY + 23, pageWidth - margin, headerStartY + 23);
          doc.setLineWidth(0.2);
          doc.line(margin, headerStartY + 24.2, pageWidth - margin, headerStartY + 24.2);
          
          cursorY = headerStartY + 32;
          break;

        case 'TITLE':
          const titleContent = blockContent.toUpperCase();
          doc.setFont('times', 'bold');
          doc.setFontSize(bFontSize);
          doc.text(titleContent, pageWidth / 2, cursorY, { align: 'center' });
          const textWidth = doc.getTextWidth(titleContent);
          doc.setLineWidth(0.4);
          doc.line(pageWidth / 2 - textWidth / 2, cursorY + 1, pageWidth / 2 + textWidth / 2, cursorY + 1);
          
          const m = now.getMonth();
          const yr = now.getFullYear();
          let nomorSurat = block.config?.customNumber || `... / RT.${config.rtNumber} / ${config.rwNumber} / ${romanMonths[m]} / ${yr}`;
          const titlePrefix = block.config?.titlePrefix ?? 'Nomor :';
          if (!nomorSurat.toLowerCase().includes(titlePrefix.toLowerCase().trim()) && titlePrefix.trim().length > 0) {
            nomorSurat = `${titlePrefix} ${nomorSurat}`;
          }
          doc.setFont('times', 'bold');
          doc.setFontSize(11);
          doc.text(nomorSurat, pageWidth / 2, cursorY + 6, { align: 'center' });
          cursorY += 12;
          break;

        case 'PARAGRAPH':
          doc.setFont('times', 'normal');
          doc.setFontSize(bFontSize);
          const pLines = doc.splitTextToSize(blockContent, contentWidth);
          doc.text(pLines, margin, cursorY, { 
            align: bTextAlign === 'justify' ? 'justify' : bTextAlign as any,
            lineHeightFactor: bLineHeight,
            maxWidth: contentWidth
          });
          cursorY += (pLines.length * (bFontSize * 0.3527) * bLineHeight) + 3;
          break;

        case 'DATA_GRID':
          const fields = block.config?.fields || [];
          const gridIndent = block.config?.indent ?? 10; // mm indentasi kiri
          const gridLabelWidth = block.config?.labelWidth ?? 44; // mm lebar kolom label
          const gridStartX = margin + gridIndent;
          const colonX = gridStartX + gridLabelWidth;
          const valueX = colonX + 5;
          const valueMaxWidth = pageWidth - margin - valueX;

          fields.forEach((f: string, i: number) => {
            doc.setFont('times', 'bold');
            doc.setFontSize(bFontSize);
            // Wrap label if too long
            const labelLines = doc.splitTextToSize(f, gridLabelWidth);
            doc.text(labelLines, gridStartX, cursorY);
            doc.text(':', colonX, cursorY);
            
            let val = '';
            if (block.config?.values && block.config.values[i] !== undefined && block.config.values[i] !== null) {
              val = block.config.values[i];
            } else {
              const cleanKey = f.toLowerCase().replace(/\s/g, '').replace(/^\d+\./, '');
              if (cleanKey.includes('nama')) val = item?.userName || item?.data?.nama || '';
              else if (cleanKey.includes('nik')) val = item?.userNik || item?.data?.nik || '';
              else if (cleanKey.includes('jenis') || cleanKey.includes('kelamin')) val = item?.data?.jenisKelamin || item?.data?.kelamin || '';
              else if (cleanKey.includes('tempat') && cleanKey.includes('lahir')) val = `${item?.data?.tempatLahir || ''}, ${item?.data?.tanggalLahir || item?.data?.tglLahir || ''}`;
              else if (cleanKey.includes('agama')) val = item?.data?.agama || '';
              else if (cleanKey.includes('status')) val = item?.data?.statusPernikahan || item?.data?.status || '';
              else if (cleanKey.includes('pekerjaan')) val = item?.data?.pekerjaan || '';
              else if (cleanKey.includes('alamat')) val = item?.data?.alamat || item?.data?.alamatLengkap || '';
              else if (cleanKey.includes('keperluan')) val = item?.keterangan || item?.data?.keperluan || item?.data?.keterangan || '';
              else if (cleanKey.includes('usaha')) val = item?.data?.jenisUsaha || item?.data?.usahaJenis || item?.data?.usahaAlamat || '';
              else val = item?.data?.[f] || item?.data?.[cleanKey] || '...................................................';
            }

            doc.setFont('times', 'bold');
            // Wrap value if too long
            const valLines = doc.splitTextToSize(val || '', valueMaxWidth);
            doc.text(valLines, valueX, cursorY);
            const rowLines = Math.max(labelLines.length, valLines.length);
            cursorY += rowLines * (bFontSize * 0.3527 * 1.25);
          });
          cursorY += 3;
          break;

        case 'LINE':
          doc.setLineWidth(0.4);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 6;
          break;

        case 'SIGNATURE':
          cursorY += 8;
          if (cursorY > 240) { doc.addPage(); cursorY = margin + 10; }

          const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          const leftLabel = block.config?.leftLabel || 'Mengetahui,';
          const leftSubLabel = block.config?.leftSubLabel || `Ketua RW.${config.rwNumber}`;
          const rightSubLabel = block.config?.rightSubLabel || `Ketua RT.${config.rtNumber}`;
          
          doc.setLineWidth(0.4);
          doc.setFontSize(bFontSize);
          doc.setFont('times', 'bold');
          
          // Right side: City, Date and RT Sublabel
          const dateText = block.config?.dateText ?? `${config.cityName}, ${dateStr}`;
          doc.text(dateText, pageWidth - margin - 35, cursorY, { align: 'center' });
          doc.text(rightSubLabel, pageWidth - margin - 35, cursorY + 7, { align: 'center' });
          
          // Left side: Label and RW Sublabel at same level as RT
          doc.text(leftLabel, margin + 35, cursorY + 7, { align: 'center' });
          doc.text(leftSubLabel, margin + 35, cursorY + 12, { align: 'center' });
          
          const rtSigUrl = blockSigCache[block.id]?.rt || rtSigBase64;
          const rwSigUrl = blockSigCache[block.id]?.rw || rwSigBase64;
          if (rwSigUrl) try { doc.addImage(rwSigUrl, 'PNG', margin + 20, cursorY + 14, 30, 16); } catch(e) {}
          if (rtSigUrl) try { doc.addImage(rtSigUrl, 'PNG', pageWidth - margin - 50, cursorY + 14, 30, 16); } catch(e) {}
          
          doc.text(`( ${config.rwLeaderName ? config.rwLeaderName.toUpperCase() : '__________________'} )`, margin + 35, cursorY + 38, { align: 'center' });
          doc.text(`( ${config.rtLeaderName ? config.rtLeaderName.toUpperCase() : '__________________'} )`, pageWidth - margin - 35, cursorY + 38, { align: 'center' });
          cursorY += 45;
          break;
      }
    });
  } else {
    // Old implementation fallback
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', margin, 15, 20, 20); } catch (e) {}
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(`PENGURUS RUKUN TETANGGA ${config.rtNumber} RUKUN WARGA ${config.rwNumber}`, pageWidth / 2 + 10, 20, { align: 'center' });
    doc.text(`KELURAHAN ${config.villageName} KECAMATAN ${config.districtName}`, pageWidth / 2 + 10, 26, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`${config.cityName.toUpperCase()}`, pageWidth / 2 + 10, 34, { align: 'center' });
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.text(`Sekretariat: ${config.secretaryAddress}`, pageWidth / 2 + 10, 40, { align: 'center' });
    doc.setLineWidth(0.8);
    doc.line(margin, 45, pageWidth - margin, 45);
    doc.setLineWidth(0.2);
    doc.line(margin, 46, pageWidth - margin, 46);
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const lines = content.split('\n');
    let cursorY = 55;
    lines.forEach(line => {
      if (line.trim() === '' && line.length === 0) { cursorY += 6; return; }
      if (line.includes('PENGURUS RUKUN TETANGGA')) return;
      if (line.includes('KELURAHAN')) return;
      if (line.includes('Sekretariat:')) return;
      if (line.includes('=====')) return;
      const wrappedLines = doc.splitTextToSize(line, contentWidth);
      if (cursorY + (wrappedLines.length * 6) > 270) { doc.addPage(); cursorY = 25; }
      doc.text(wrappedLines, margin, cursorY);
      cursorY += (wrappedLines.length * 6);
    });
  }
  if (returnBlob) {
    return doc.output('blob');
  }
  doc.save(filename);
};
