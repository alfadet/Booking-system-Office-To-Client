
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, MapPin, Shield, Flame, 
  Mail, Phone, Building, FileText, 
  CheckCircle, ChevronLeft, 
  Info, Send, UserCheck, Receipt, Car, Hash, ArrowRight, 
  CreditCard, MailCheck, LayoutList, Download, Upload, HardDrive, ClipboardCheck, Share2, CloudUpload, Loader2, Shirt, StickyNote, Search, X, History, Copy, MailPlus, Percent, FileDown
} from 'lucide-react';
import { 
  ServiceDetails, ClientDetails, PaymentOption, Step 
} from './types';
import { PRICING, CONTACT_INFO, LEGAL_TEXT, PAYMENT_DESCRIPTIONS, OFFER_LEGAL_TEXT } from './constants';
import { generateQuotePDF } from './services/pdfService';

/**
 * Elite Input Component - Per garantire coerenza estetica e stabilità del focus.
 */
const EliteInput = ({ label, icon: Icon, ...props }: any) => (
  <div className="flex-1 space-y-1">
    {label && (
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
        {label}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1e40af] opacity-60 group-focus-within:opacity-100 transition-opacity" />
      )}
      <input 
        {...props} 
        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 ${Icon ? 'pl-11' : 'pl-4'} pr-4 text-[15px] text-slate-800 focus:border-[#1e40af]/50 focus:bg-white focus:ring-4 focus:ring-[#1e40af]/5 outline-none transition-all placeholder:text-slate-400 shadow-sm`}
      />
    </div>
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.SERVICE_DETAILS);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quoteHistory, setQuoteHistory] = useState<any[]>([]);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [currentQuoteId, setCurrentQuoteId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateNewId = () => {
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    return `AS-${datePart}-${randPart}`;
  };

  // Genera ID iniziale
  useEffect(() => {
    setCurrentQuoteId(generateNewId());
  }, []);

  const resetConfiguration = () => {
    setAppliedDiscount(0);
    setDiscountInput('0');
    setStep(Step.SERVICE_DETAILS);
    setCurrentQuoteId(generateNewId());
    setService({
      eventName: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      startTime: '18:00',
      endTime: '01:00',
      securityOperators: 0,
      fireOperators: 0,
      hasSupervisor: false,
      isOutsideTrento: false,
      notes: '',
      uniformType: 'Security'
    });
    setClient({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      companyName: '',
      vatNumber: '',
      billingCode: '',
    });
  };

  const playClickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio Context not supported or blocked", e);
    }
  };

  const handleInteraction = (fn?: () => void) => {
    playClickSound();
    if (fn) fn();
  };

  const [service, setService] = useState<ServiceDetails>({
    eventName: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    startTime: '18:00',
    endTime: '01:00',
    securityOperators: 0,
    fireOperators: 0,
    hasSupervisor: false,
    isOutsideTrento: false,
    notes: '',
    uniformType: 'Security'
  });

  const [client, setClient] = useState<ClientDetails>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    companyName: '',
    vatNumber: '',
    billingCode: '',
  });

  const [payment, setPayment] = useState<PaymentOption>(PaymentOption.BANK_TRANSFER);

  // Carica cronologia (File di Log 'preventivi inviati')
  useEffect(() => {
    const saved = localStorage.getItem('preventivi_inviati');
    if (saved) {
      try {
        setQuoteHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Errore caricamento log preventivi", e);
      }
    }
  }, []);

  // Logica automatica Capo Squadra (minimo 4 operatori totali)
  useEffect(() => {
    const totalOps = service.securityOperators + service.fireOperators;
    if (totalOps >= 4 && !service.hasSupervisor) {
      setService(s => ({ ...s, hasSupervisor: true }));
    }
  }, [service.securityOperators, service.fireOperators]);

  const calculations = useMemo(() => {
    const [sH, sM] = service.startTime.split(':').map(Number);
    const [eH, eM] = service.endTime.split(':').map(Number);
    let h = eH - sH + (eM - sM) / 60;
    if (h < 0) h += 24; 
    if (h === 0) h = 24;
    
    const totalOps = service.securityOperators + service.fireOperators;
    const minGrant = PRICING.MINIMUM_PER_OPERATOR;
    
    const secSingleTotal = Math.max(h * PRICING.SECURITY_OPERATOR_HOURLY, minGrant);
    const secTotal = secSingleTotal * service.securityOperators;
    
    const fireSingleTotal = Math.max(h * PRICING.FIRE_OPERATOR_HOURLY, minGrant);
    const fireTotal = fireSingleTotal * service.fireOperators;
    
    const supFee = service.hasSupervisor ? PRICING.SUPERVISOR_FLAT_FEE : 0;
    const transFee = service.isOutsideTrento ? Math.ceil(totalOps / 4) * PRICING.TRANSPORT_FEE_BASE : 0;
    
    const totalExclVat = secTotal + fireTotal + supFee + transFee;
    const vat = totalExclVat * PRICING.VAT_RATE;
    const preDiscountTotal = totalExclVat + vat;
    
    const discountAmount = preDiscountTotal * (appliedDiscount / 100);
    const totalInclVat = preDiscountTotal - discountAmount;

    return { 
      hours: h, 
      totalExclVat, 
      totalInclVat, 
      transportFee: transFee,
      securityRate: PRICING.SECURITY_OPERATOR_HOURLY,
      securitySingleTotal: secSingleTotal,
      securitySubtotal: secTotal,
      fireRate: PRICING.FIRE_OPERATOR_HOURLY,
      fireSingleTotal: fireSingleTotal,
      fireSubtotal: fireTotal,
      supervisorFee: supFee,
      vatAmount: vat,
      discountPercent: appliedDiscount,
      discountAmount: discountAmount
    };
  }, [service, appliedDiscount]);

  /**
   * Salva il preventivo corrente nel File di Log 'preventivi inviati'
   */
  const saveToHistory = () => {
    const newEntry = {
      id: currentQuoteId,
      timestamp: new Date().toISOString(),
      service: { ...service },
      client: { ...client },
      payment,
      total: calculations.totalInclVat,
      calculations: { ...calculations }
    };

    const updatedHistory = [newEntry, ...quoteHistory.filter(q => q.id !== currentQuoteId)].slice(0, 100);
    setQuoteHistory(updatedHistory);
    localStorage.setItem('preventivi_inviati', JSON.stringify(updatedHistory));
  };

  const getDynamicFileName = (c: ClientDetails = client, id: string = currentQuoteId) => {
    const parts = [
      'ALFA_SECURITY',
      c.firstName,
      c.lastName,
      c.companyName,
      id
    ].filter(part => part && part.trim() !== '');

    return parts.join('_').toUpperCase().replace(/\s+/g, '_') + '.txt';
  };

  const generateReportText = (s: ServiceDetails = service, c: ClientDetails = client, p: PaymentOption = payment, calc: any = calculations, id: string = currentQuoteId, includeExtendedTerms: boolean = false) => {
    const d = s.date.split('-').reverse().join('/');
    const locationStatus = s.isOutsideTrento ? 'Extra-Urbano' : 'Urbano (Trento)';
    
    let text = `ALFA SECURITY - RIEPILOGO PREVENTIVO\n` +
      `Codice: ${id}\n` +
      `Data Documento: ${new Date().toLocaleString()}\n` +
      `--------------------------------------------------\n\n` +
      `👤 DATI CLIENTE\n` +
      `Nome: ${c.firstName} ${c.lastName}\n` +
      `Email: ${c.email}\n` +
      `Tel: ${c.phone}\n` +
      `${c.companyName ? `Azienda: ${c.companyName}\n` : ''}` +
      `${c.vatNumber ? `P.IVA/CF: ${c.vatNumber}\n` : ''}` +
      `${c.billingCode ? `SDI/PEC: ${c.billingCode}\n` : ''}\n` +
      `📅 DETTAGLI SERVIZIO\n` +
      `Evento: ${s.eventName || 'Richiesta Standard'}\n` +
      `Data Intervento: ${d}\n` +
      `Luogo: ${s.location || 'Da definire'} (${locationStatus})\n` +
      `Orario: ${s.startTime} - ${s.endTime} (${calc.hours.toFixed(1)} ore totali)\n` +
      `Divisa Operatori: ${s.uniformType === 'Security' ? 'Divisa Security' : 'Abito Elegante'}\n` +
      `${s.notes ? `Note Evento: ${s.notes}\n` : ''}\n` +
      `🛡️ STAFF E LOGISTICA\n` +
      `Operatori Security: ${s.securityOperators} unità\n` +
      `Operatori Anti-incendio: ${s.fireOperators} unità\n` +
      `Capo Squadra: ${s.hasSupervisor ? 'SÌ (Supplemento incluso)' : 'NO'}\n` +
      `Trasferta: ${calc.transportFee > 0 ? 'SÌ' : 'NO'}\n\n` +
      `💳 PAGAMENTO\n` +
      `Metodo: ${p}\n\n` +
      `💰 DETTAGLIO ECONOMICO\n` +
      `Imponibile Security: € ${calc.securitySubtotal.toFixed(2)}\n` +
      `${s.fireOperators > 0 ? `Imponibile Anti-incendio: € ${calc.fireSubtotal.toFixed(2)}\n` : ''}` +
      `${s.hasSupervisor ? `Supplemento Capo Squadra: € ${calc.supervisorFee.toFixed(2)}\n` : ''}` +
      `${calc.transportFee > 0 ? `Spese Trasferta: € ${calc.transportFee.toFixed(2)}\n` : ''}\n` +
      `TOTALE IMPONIBILE: € ${calc.totalExclVat.toFixed(2)}\n` +
      `IVA (22%): € ${calc.vatAmount.toFixed(2)}\n` +
      `${calc.discountPercent > 0 ? `SCONTO APPLICATO (${calc.discountPercent}%): - € ${calc.discountAmount.toFixed(2)}\n` : ''}` +
      `--------------------------------------------------\n` +
      `TOTALE PREVENTIVO IVATO: € ${calc.totalInclVat.toFixed(2)}\n\n` +
      `--------------------------------------------------\n` +
      `ALFA SECURITY - Professional Division\n` +
      `Sede: Via Roma 35, Trento (TN)\n` +
      `Contatti: 0461 421049 | amm.alfadetectives@gmail.com\n`;

    if (includeExtendedTerms) {
      text += `\n${OFFER_LEGAL_TEXT}`;
    }

    return text;
  };

  const handleWhatsAppSubmit = () => {
    saveToHistory();
    const msg = generateReportText();
    let phone = client.phone.replace(/\D/g, '');
    if (phone.length === 10 && phone.startsWith('3')) {
      phone = '39' + phone;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleEmailSubmit = () => {
    saveToHistory();
    const msg = generateReportText(service, client, payment, calculations, currentQuoteId, true);
    const subject = `Preventivo Alfa Security - ${currentQuoteId} - ${service.eventName || 'Richiesta Servizio'}`;
    window.location.href = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
  };

  const handleCreatePDFMain = () => {
    saveToHistory();
    const data = {
      id: currentQuoteId,
      service,
      client,
      payment,
      calculations,
      total: calculations.totalInclVat
    };
    generateQuotePDF(data);
  };

  const handleDirectUploadToDrive = async () => {
    saveToHistory();
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbyWyugxJ55B2rQP8yQOZRW14TrK6DnIlq8aRW0W79A/exec';
    const driveFolderUrl = 'https://drive.google.com/drive/folders/1o1s1GN7HY6JQyr--l2Hb5MtHrW9gs0Sc?usp=drive_link';
    const content = generateReportText(service, client, payment, calculations, currentQuoteId, true);
    const fileName = getDynamicFileName();

    setIsUploading(true);
    try {
      const params = new URLSearchParams();
      params.append('filename', fileName);
      params.append('content', content);

      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      alert(`File "${fileName}" caricato correttamente! Verrai indirizzato alla cartella Drive.`);
      window.open(driveFolderUrl, '_blank');
    } catch (error) {
      console.error("Upload error:", error);
      alert("Errore nel caricamento diretto. Prova il backup manuale.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToDriveManual = () => {
    saveToHistory();
    const content = generateReportText(service, client, payment, calculations, currentQuoteId, true);
    const fileName = getDynamicFileName();
    
    navigator.clipboard.writeText(content).then(() => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      alert(`Testo copiato e file "${fileName}" scaricato! Caricalo manualmente su Drive.`);
      setTimeout(() => {
        window.open('https://drive.google.com/drive/folders/1o1s1GN7HY6JQyr--l2Hb5MtHrW9gs0Sc?usp=drive_link', '_blank');
      }, 500);
    });
  };

  const handleBackup = () => {
    const data = { service, client, payment, id: currentQuoteId, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ALFA_BACKUP_${currentQuoteId}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData.service) setService(importedData.service);
        if (importedData.client) setClient(importedData.client);
        if (importedData.payment) setPayment(importedData.payment);
        alert("Dati importati con successo!");
        setStep(Step.FINAL_PREVIEW);
      } catch (err) { alert("File di backup non valido."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const nextStep = () => {
    if (step === Step.SERVICE_DETAILS) setStep(Step.CLIENT_DETAILS);
    else if (step === Step.CLIENT_DETAILS) setStep(Step.PAYMENT_SUMMARY);
    else if (step === Step.PAYMENT_SUMMARY) setStep(Step.FINAL_PREVIEW);
  };

  const prevStep = () => {
    if (step === Step.CLIENT_DETAILS) setStep(Step.SERVICE_DETAILS);
    else if (step === Step.PAYMENT_SUMMARY) setStep(Step.CLIENT_DETAILS);
    else if (step === Step.FINAL_PREVIEW) setStep(Step.PAYMENT_SUMMARY);
  };

  const deleteFromHistory = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo preventivo dall'archivio?")) {
      const updatedHistory = quoteHistory.filter(q => q.id !== id);
      setQuoteHistory(updatedHistory);
      localStorage.setItem('preventivi_inviati', JSON.stringify(updatedHistory));
      if (selectedQuote && selectedQuote.id === id) {
        setSelectedQuote(null);
      }
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return quoteHistory;
    const q = searchQuery.toLowerCase();
    return quoteHistory.filter(item => 
      item.id.toLowerCase().includes(q) ||
      (item.service.eventName && item.service.eventName.toLowerCase().includes(q)) ||
      item.client.firstName.toLowerCase().includes(q) ||
      item.client.lastName.toLowerCase().includes(q) ||
      item.client.email.toLowerCase().includes(q) ||
      item.client.phone.includes(q) ||
      (item.client.companyName && item.client.companyName.toLowerCase().includes(q))
    );
  }, [quoteHistory, searchQuery]);

  const handleApplyDiscountToSelected = () => {
    if (!selectedQuote) return;
    const perc = parseFloat(discountInput) || 0;
    const preDiscountTotal = selectedQuote.calculations.totalExclVat + selectedQuote.calculations.vatAmount;
    const discAmt = preDiscountTotal * (perc / 100);
    const newTotal = preDiscountTotal - discAmt;

    const updated = {
      ...selectedQuote,
      total: newTotal,
      calculations: {
        ...selectedQuote.calculations,
        discountPercent: perc,
        discountAmount: discAmt,
        totalInclVat: newTotal
      }
    };
    setSelectedQuote(updated);
    
    // Aggiorna anche nel log se si desidera persistere
    const updatedHistory = quoteHistory.map(q => q.id === updated.id ? updated : q);
    setQuoteHistory(updatedHistory);
    localStorage.setItem('preventivi_inviati', JSON.stringify(updatedHistory));
    
    alert(`Sconto del ${perc}% applicato con successo.`);
  };

  const handleApplyDiscountMain = () => {
    const perc = parseFloat(discountInput) || 0;
    setAppliedDiscount(perc);
    alert(`Sconto del ${perc}% applicato al preventivo corrente.`);
  };

  const handleResendEmail = (q: any) => {
    const msg = generateReportText(q.service, q.client, q.payment, q.calculations, q.id, true);
    const subject = `Preventivo Alfa Security - ${q.id} - ${q.service.eventName || 'Richiesta Servizio'}`;
    window.location.href = `mailto:${q.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
  };

  const handleCopyTxt = (q: any) => {
    const text = generateReportText(q.service, q.client, q.payment, q.calculations, q.id, true);
    navigator.clipboard.writeText(text).then(() => {
      alert("Testo TXT copiato negli appunti!");
    });
  };

  const loadFromHistory = (q: any) => {
    setService({ ...q.service });
    setClient({ ...q.client });
    setPayment(q.payment);
    setAppliedDiscount(q.calculations.discountPercent || 0);
    setDiscountInput((q.calculations.discountPercent || 0).toString());
    setCurrentQuoteId(q.id);
    setSelectedQuote(null);
    setIsSearchOpen(false);
    setStep(Step.FINAL_PREVIEW);
  };

  const renderServiceStep = () => (
    <div className="space-y-4 step-transition">
      <div className="grid grid-cols-1 gap-3.5">
        <EliteInput label="Nome Evento" icon={FileText} placeholder="es. Gala Aziendale" value={service.eventName} onChange={(e: any) => setService({...service, eventName: e.target.value})} />
        <EliteInput label="Data" icon={Calendar} type="date" value={service.date} onChange={(e: any) => setService({...service, date: e.target.value})} />
        <EliteInput label="Venue / Luogo" icon={MapPin} placeholder="es. Grand Hotel Trento" value={service.location} onChange={(e: any) => {
          const val = e.target.value;
          setService(s => ({ ...s, location: val, isOutsideTrento: !val.toLowerCase().includes('trento') }));
        }} />
        <div className="grid grid-cols-2 gap-3.5">
          <EliteInput label="Inizio" icon={Clock} type="time" value={service.startTime} onChange={(e: any) => setService({...service, startTime: e.target.value})} />
          <EliteInput label="Fine" icon={Clock} type="time" value={service.endTime} onChange={(e: any) => setService({...service, endTime: e.target.value})} />
        </div>
        <EliteInput label="Note Evento" icon={StickyNote} placeholder="Dettagli aggiuntivi..." value={service.notes} onChange={(e: any) => setService({...service, notes: e.target.value})} />
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Ambito</label>
            <button onClick={() => setService(s => ({...s, isOutsideTrento: !s.isOutsideTrento}))} className={`w-full py-3.5 rounded-2xl border flex items-center justify-center gap-2 transition-all ${service.isOutsideTrento ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'}`}>
              <Car className="w-4 h-4" /> <span className="text-[11px] font-bold uppercase">{service.isOutsideTrento ? 'Extra' : 'Urbano'}</span>
            </button>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Divisa</label>
            <button onClick={() => handleInteraction(() => setService(s => ({...s, uniformType: s.uniformType === 'Security' ? 'Elegante' : 'Security'})))} className={`w-full py-3.5 rounded-2xl border flex items-center justify-center gap-2 transition-all ${service.uniformType === 'Elegante' ? 'border-[#1e40af]/50 bg-[#1e40af]/5 text-[#1e40af]' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
              <Shirt className="w-4 h-4" /> <span className="text-[11px] font-bold uppercase">{service.uniformType}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="liquid-glass p-4 rounded-3xl flex flex-col items-center border-b-2 border-[#1e40af]">
          <Shield className="w-4 h-4 text-[#1e40af] mb-2" />
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full justify-between">
            <button onClick={() => handleInteraction(() => setService(s => ({...s, securityOperators: Math.max(0, s.securityOperators - 1)})))} className="w-6 h-6 rounded-lg bg-white text-slate-600 shadow-sm">-</button>
            <span className="font-black text-slate-800">{service.securityOperators}</span>
            <button onClick={() => handleInteraction(() => setService(s => ({...s, securityOperators: s.securityOperators + 1})))} className="w-6 h-6 rounded-lg bg-[#1e40af] text-white shadow-sm">+</button>
          </div>
        </div>
        <div className="liquid-glass p-4 rounded-3xl flex flex-col items-center border-b-2 border-red-500">
          <Flame className="w-4 h-4 text-red-500 mb-2" />
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full justify-between">
            <button onClick={() => handleInteraction(() => setService(s => ({...s, fireOperators: Math.max(0, s.fireOperators - 1)})))} className="w-6 h-6 rounded-lg bg-white text-slate-600 shadow-sm">-</button>
            <span className="font-black text-slate-800">{service.fireOperators}</span>
            <button onClick={() => handleInteraction(() => setService(s => ({...s, fireOperators: s.fireOperators + 1})))} className="w-6 h-6 rounded-lg bg-red-500 text-white shadow-sm">+</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientStep = () => (
    <div className="space-y-4 step-transition">
      <div className="grid grid-cols-2 gap-3.5">
        <EliteInput label="Nome" placeholder="Marco" value={client.firstName} onChange={(e: any) => setClient({...client, firstName: e.target.value})} />
        <EliteInput label="Cognome" placeholder="Rossi" value={client.lastName} onChange={(e: any) => setClient({...client, lastName: e.target.value})} />
      </div>
      <EliteInput label="Email" icon={Mail} placeholder="email@cliente.it" value={client.email} onChange={(e: any) => setClient({...client, email: e.target.value})} />
      <EliteInput label="Cellulare" icon={Phone} placeholder="+39 ..." value={client.phone} onChange={(e: any) => setClient({...client, phone: e.target.value})} />
      <EliteInput label="Azienda / Ente" icon={Building} placeholder="Ragione Sociale" value={client.companyName} onChange={(e: any) => setClient({...client, companyName: e.target.value})} />
      <div className="grid grid-cols-2 gap-3.5">
        <EliteInput label="P.IVA / CF" value={client.vatNumber} onChange={(e: any) => setClient({...client, vatNumber: e.target.value})} />
        <EliteInput label="SDI / PEC" value={client.billingCode} onChange={(e: any) => setClient({...client, billingCode: e.target.value})} />
      </div>
    </div>
  );

  const renderSummaryStep = () => (
    <div className="space-y-6 step-transition">
      <div className="grid grid-cols-2 gap-3">
        {Object.values(PaymentOption).map((opt) => (
          <button key={opt} onClick={() => handleInteraction(() => setPayment(opt))} className={`p-4 rounded-2xl border text-[10px] font-black uppercase transition-all flex items-center justify-center text-center ${payment === opt ? 'border-[#1e40af] bg-[#1e40af]/5 text-[#1e40af]' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
            {opt}
          </button>
        ))}
      </div>
      <div className="p-5 rounded-3xl bg-[#1e40af]/5 border border-[#1e40af]/10 flex gap-4">
        <Info className="w-5 h-5 text-[#1e40af] shrink-0" />
        <p className="text-[12px] text-slate-500 italic leading-snug">{PAYMENT_DESCRIPTIONS[payment]}</p>
      </div>
      <button onClick={() => handleInteraction(nextStep)} className="w-full h-16 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-3xl font-black uppercase text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
        Riepilogo Finale <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderFinalPreviewStep = () => (
    <div className="space-y-4 step-transition">
      <div className="liquid-glass rounded-[2.5rem] p-7 border-[#1e40af]/20 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
           <LayoutList className="w-5 h-5 text-[#1e40af]" />
           <h2 className="text-sm font-black uppercase text-slate-900 tracking-widest">Dettagli Preventivo</h2>
        </div>
        
        <div className="space-y-4">
           <div className="px-4 py-3 bg-[#1e40af]/5 rounded-2xl border border-[#1e40af]/10">
              <p className="text-[9px] font-black text-[#1e40af] uppercase mb-1">Evento</p>
              <p className="text-sm font-black text-slate-900 uppercase italic">{service.eventName || 'Richiesta Standard'}</p>
           </div>
           
           <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Percent className="w-3 h-3 text-[#1e40af]" /> Effettua Sconto</p>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 text-sm focus:border-[#1e40af]/40 outline-none"
                  placeholder="Percentuale %"
                />
                <button 
                  onClick={() => handleInteraction(handleApplyDiscountMain)}
                  className="px-6 py-2 bg-[#1e40af] rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                >
                  Vai
                </button>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cliente</p>
                <p className="text-[12px] font-black text-slate-900 truncate">{client.firstName} {client.lastName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Codice ID</p>
                <p className="text-[12px] font-bold text-[#1e40af]">{currentQuoteId}</p>
              </div>
           </div>

           <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex justify-between text-[11px]">
                 <span className="text-slate-400 font-bold uppercase">Staff Operativo:</span>
                 <span className="text-slate-900 font-black">{service.securityOperators + service.fireOperators} Unità</span>
              </div>
              {calculations.discountPercent > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-600 font-bold italic">
                   <span>Sconto Applicato ({calculations.discountPercent}%):</span>
                   <span>- € {calculations.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black italic pt-2 border-t border-slate-100">
                 <span className="text-[#1e40af] uppercase tracking-tighter">Totale Ivato:</span>
                 <span className="text-slate-900 font-black">€ {calculations.totalInclVat.toFixed(2)}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="liquid-glass rounded-[2rem] p-6 border-slate-100 space-y-4 shadow-lg relative overflow-hidden">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] text-center border-b border-slate-50 pb-3">Strumenti Archiviazione</h3>
        
        <button 
          onClick={() => handleInteraction(handleCreatePDFMain)}
          className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-[#1e40af]/10 to-[#1e40af]/5 border border-[#1e40af]/30 text-[11px] font-black uppercase tracking-[0.2em] text-[#1e40af] flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-md active:scale-95"
        >
          <FileDown className="w-5 h-5" /> Crea PDF Professionale
        </button>

        <button 
          onClick={() => handleInteraction(handleDirectUploadToDrive)} 
          disabled={isUploading}
          className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
          Upload Diretto Drive
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleInteraction(handleBackup)} className="py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-400 flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Backup JSON</button>
          <button onClick={() => handleInteraction(() => fileInputRef.current?.click())} className="py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-400 flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Importa</button>
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-5 pt-6 select-none pb-12">
      <div className="w-full max-w-[1100px] space-y-10">
        <header className="text-center relative py-10 step-transition">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="relative inline-block px-10">
            <h1 className="text-5xl sm:text-7xl font-black italic text-white title-stroke tracking-tighter uppercase leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">ALFA SECURITY</h1>
            <p className="text-[12px] text-emerald-400 font-black tracking-[0.6em] mt-5 uppercase opacity-90">Office Portal V.1.0 • Professional Excellence</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <main className="lg:col-span-8 liquid-glass rounded-[3.5rem] p-10 border-white/20 relative shadow-2xl green-glow-effect">
            <nav className="flex items-center justify-center gap-16 mb-12 relative z-10">
              {[1, 2, 3].map(i => (
                <div key={i} className="relative flex items-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-2 transition-all duration-700 ${step + 1 >= i ? 'border-[#1e40af] text-[#1e40af] bg-[#1e40af]/5 shadow-[0_0_20px_rgba(30,64,175,0.1)]' : 'border-slate-100 text-slate-300 bg-slate-50'}`}>
                    {i}
                  </div>
                  {i < 3 && <div className={`absolute left-14 top-1/2 -translate-y-1/2 w-16 h-[2px] ${step + 1 > i ? 'bg-[#1e40af]' : 'bg-slate-100'} transition-all`}></div>}
                </div>
              ))}
            </nav>

            <div className="min-h-[400px]">
              {step === Step.SERVICE_DETAILS && renderServiceStep()}
              {step === Step.CLIENT_DETAILS && renderClientStep()}
              {step === Step.PAYMENT_SUMMARY && renderSummaryStep()}
              {step === Step.FINAL_PREVIEW && renderFinalPreviewStep()}
            </div>
            
            {step > Step.SERVICE_DETAILS && step < Step.FINAL_PREVIEW && (
              <button onClick={() => handleInteraction(prevStep)} className="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 hover:text-slate-600 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
            )}
          </main>

          <aside className="lg:col-span-4 space-y-6">
            <section className="liquid-glass border-white/20 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden green-glow-effect">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                 <Flame className="w-40 h-40 text-white" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic mb-2">Imponibile Parziale</p>
                  <p className="text-2xl font-black text-white/80 italic tracking-tighter">€ {calculations.totalExclVat.toFixed(2)}</p>
                </div>

                <div>
                  <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest italic mb-2">Totale Ivato</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] text-white/40 font-black">€</span>
                    <span className="text-5xl font-black italic text-white blue-text-elite title-stroke tracking-tighter">
                      {calculations.totalInclVat.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 italic">Durata Servizio</p>
                    <p className="text-3xl font-black text-white italic tracking-tighter">{calculations.hours.toFixed(1)} <span className="text-[14px] text-emerald-400 uppercase">Ore</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 italic">Operatori</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">{service.securityOperators + service.fireOperators}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="space-y-4">
              {step === Step.FINAL_PREVIEW ? (
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => handleInteraction(handleWhatsAppSubmit)} className="w-full h-18 py-5 rounded-[2.2rem] font-black uppercase tracking-[0.1em] text-[14px] flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg active:scale-95 border border-white/10">
                    Invia WhatsApp <Send className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleInteraction(handleEmailSubmit)} className="w-full h-18 py-5 rounded-[2.2rem] font-black uppercase tracking-[0.1em] text-[14px] flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg active:scale-95 border border-white/10">
                    Invia Email <Mail className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleInteraction(() => setIsSearchOpen(true))} className="w-full h-18 py-5 rounded-[2.2rem] font-black uppercase tracking-[0.1em] text-[14px] flex items-center justify-center gap-3 bg-white border border-[#1e40af]/30 text-[#1e40af] shadow-lg active:scale-95">
                    Ricerca Preventivi <Search className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => handleInteraction(nextStep)} className="w-full h-24 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[18px] flex items-center justify-center gap-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-xl active:scale-95 border-t border-white/20">
                    PROSEGUI <ArrowRight className="w-8 h-8" />
                  </button>
                  {step === Step.SERVICE_DETAILS && (
                    <button onClick={() => handleInteraction(() => setIsSearchOpen(true))} className="w-full h-16 rounded-[2rem] font-black uppercase tracking-[0.1em] text-[12px] flex items-center justify-center gap-3 bg-white/10 border border-white/20 text-white shadow-lg active:scale-95 hover:bg-white/20 transition-all">
                      Ricerca Preventivi <Search className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              
              {step === Step.FINAL_PREVIEW && (
                <button onClick={() => handleInteraction(resetConfiguration)} className="w-full text-center text-[11px] font-black text-white/30 uppercase tracking-[0.4em] py-4 hover:text-white/60 transition-colors">
                  Riavvia Configurazione
                </button>
              )}
            </div>
          </aside>
        </div>

        <footer className="text-center text-white/20 text-[11px] uppercase font-black tracking-[1.2em] select-none pt-10 pb-12">
          ALFA SECURITY GROUP • EXCELLENCE IN PROTECTION
        </footer>
      </div>

      {/* MODALE RICERCA PREVENTIVI */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => handleInteraction(() => setIsSearchOpen(false))}></div>
          <div className="relative w-full max-w-2xl liquid-glass rounded-[3rem] border-[#1e40af]/20 flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <header className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-[#1e40af]" />
                <h2 className="text-xl font-black uppercase blue-text-elite tracking-tighter">Archivio Preventivi ({quoteHistory.length})</h2>
              </div>
              <button onClick={() => handleInteraction(() => setIsSearchOpen(false))} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-6 h-6 text-slate-600" /></button>
            </header>
            <div className="px-8 py-6 shrink-0 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Cerca per ID, evento, cliente..." className="w-full h-16 bg-white border border-slate-200 rounded-3xl pl-14 pr-6 text-slate-800 text-lg focus:border-[#1e40af]/40 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-white">
              {filteredHistory.length > 0 ? filteredHistory.map((quote) => (
                <div key={quote.id} className="group relative">
                  <button onClick={() => handleInteraction(() => setSelectedQuote(quote))} className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-[#1e40af]/30 transition-all flex items-center justify-between text-left group-hover:bg-white">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#1e40af] uppercase">{quote.id}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(quote.timestamp).toLocaleDateString('it-IT')}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-800 uppercase italic leading-none">{quote.service.eventName || 'Richiesta Standard'}</h3>
                      <p className="text-xs text-slate-500">{quote.client.firstName} {quote.client.lastName} - {quote.client.email}</p>
                    </div>
                    <div className="text-right pr-10"><p className="text-xl font-black blue-text-elite italic">€ {quote.total.toFixed(2)}</p></div>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInteraction(() => deleteFromHistory(quote.id));
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                    title="Elimina"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )) : <div className="h-64 flex flex-col items-center justify-center opacity-40"><History className="w-10 h-10 mb-4" /><p className="text-xs font-black uppercase">Nessun log trovato</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* FINESTRA DETTAGLIO LOG PREVENTIVO */}
      {selectedQuote && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => handleInteraction(() => setSelectedQuote(null))}></div>
          <div className="relative w-full max-w-xl liquid-glass rounded-[3rem] border-[#1e40af]/30 flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-[#1e40af]" /><h3 className="text-sm font-black uppercase blue-text-elite tracking-widest">Riepilogo Log Preventivo</h3></div>
              <button onClick={() => handleInteraction(() => setSelectedQuote(null))} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-5 h-5 text-slate-600" /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white">
              <div className="bg-[#1e40af]/5 p-5 rounded-3xl border border-[#1e40af]/10"><p className="text-[10px] font-black text-[#1e40af] mb-1">ID</p><p className="text-xl font-black text-slate-800">{selectedQuote.id}</p></div>
              
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Percent className="w-3 h-3 text-[#1e40af]" /> Effettua Sconto</p>
                <div className="flex gap-2">
                  <input type="number" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 text-sm" placeholder="Sconto %" />
                  <button onClick={() => handleInteraction(handleApplyDiscountToSelected)} className="px-6 py-2 bg-emerald-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Vai</button>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase">Prospetto Economico</p>
                <div className="flex justify-between text-xs text-slate-500"><span>Imponibile:</span><span>€ {selectedQuote.calculations.totalExclVat.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-slate-500"><span>IVA (22%):</span><span>€ {selectedQuote.calculations.vatAmount.toFixed(2)}</span></div>
                {(selectedQuote.calculations.discountPercent || 0) > 0 && (
                   <div className="flex justify-between text-xs text-emerald-600 font-bold italic"><span>Sconto ({selectedQuote.calculations.discountPercent}%):</span><span>- € {(selectedQuote.calculations.discountAmount || 0).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-xl font-black pt-2 border-t border-slate-100"><span className="blue-text-elite uppercase">Totale Ivato:</span><span className="text-slate-800 italic">€ {selectedQuote.total.toFixed(2)}</span></div>
              </div>
            </div>
            <footer className="p-8 border-t border-slate-100 bg-slate-50 space-y-3">
              <button onClick={() => handleInteraction(() => generateQuotePDF(selectedQuote))} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 font-black uppercase text-[12px] text-white flex items-center justify-center gap-3 active:scale-95 shadow-md"><FileDown className="w-5 h-5" /> Crea PDF Professionale</button>
              <button onClick={() => handleInteraction(() => handleResendEmail(selectedQuote))} className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-black uppercase text-[12px] text-white flex items-center justify-center gap-3 shadow-md"><MailPlus className="w-5 h-5" /> Invia Nuovamente Email</button>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleInteraction(() => handleCopyTxt(selectedQuote))} className="py-4 rounded-2xl bg-white border border-slate-200 font-black uppercase text-[10px] text-slate-500 flex items-center justify-center gap-2 shadow-sm"><Copy className="w-4 h-4" /> Copia</button>
                <button onClick={() => handleInteraction(() => loadFromHistory(selectedQuote))} className="py-4 rounded-2xl bg-[#1e40af]/10 border border-[#1e40af]/20 font-black uppercase text-[10px] text-[#1e40af] flex items-center justify-center gap-2 shadow-sm"><ArrowRight className="w-4 h-4" /> Modifica</button>
                <button onClick={() => handleInteraction(() => deleteFromHistory(selectedQuote.id))} className="py-4 rounded-2xl bg-red-50 border border-red-100 font-black uppercase text-[10px] text-red-500 flex items-center justify-center gap-2 shadow-sm"><X className="w-4 h-4" /> Elimina</button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
