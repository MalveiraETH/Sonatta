import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

import { base44 } from '@/api/base44Client';

const DEFAULT_CFG = {
  logo_url: 'https://media.base44.com/images/public/694e93aa7609bf14847de917/073de81ba_SONATTA_CARDS-10.png',
  document_title: 'PROPOSTA COMERCIAL',
  validity_days: 30,
  address: 'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Manaus – AM',
  phone: '(92) 98464-5343',
  email: 'atendimento@sonatta.store',
  website: 'sonatta.store',
  instagram: '@sonatta.store',
  signer_name: 'Fabio Malveira',
  signer_role: 'Comercial Sonatta',
  conditions: [
    'Parcelamento em até 18× no cartão de crédito',
    'Pagamento à vista (Dinheiro ou PIX) com desconto incluso na proposta',
    'PIX Parcelado: condições a combinar',
    'Garantia: 2 a 4 anos conforme fabricante',
    'Validade desta proposta: {validity_days} dias',
  ].join('\n'),
};

// ── Palette ──────────────────────────────────────────────────────────────────
const P = {
  purple:   [98,  42, 126],
  green:    [136, 188,  7],
  textMain: [32,  31,  28],
  textSub:  [66,  63,  51],
  white:    [255, 255, 255],
  pageBg:   [255, 255, 255],
  divider:  [220, 214, 230],
};

const BRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDate = (raw) => {
  if (!raw) return '—';
  try {
    const s = String(raw);
    const d = s.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(d.getTime())) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  } catch { return '—'; }
};

const loadB64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

async function loadCfg() {
  try {
    const all = await base44.entities.AppSettings.list();
    const rec = all.find((r) => r.setting_key === 'quote_pdf_config');
    if (rec && rec.setting_value) return { ...DEFAULT_CFG, ...rec.setting_value };
  } catch (e) {
    console.warn('Usando config padrão do PDF:', e.message);
  }
  return DEFAULT_CFG;
}

async function buildPDF(quote, cfg) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
  const PAGE_W = 210, PAGE_H = 297, ML = 20, MR = 20;
  const CW = PAGE_W - ML - MR;

  const setFill   = (rgb) => doc.setFillColor(...rgb);
  const setStroke = (rgb) => doc.setDrawColor(...rgb);
  const setTxt    = (rgb) => doc.setTextColor(...rgb);
  const setFont   = (w, sz) => { doc.setFont('helvetica', w); doc.setFontSize(sz); };
  const rule = (x, y, w, color = P.divider, h = 0.35) => { setFill(color); doc.rect(x, y, w, h, 'F'); };

  // BG
  setFill(P.pageBg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Logo
  const LOGO_MAX_H = 22, LOGO_MAX_W = 70;
  const logoB64 = await loadB64(cfg.logo_url);
  if (logoB64) {
    const tmpImg = new Image();
    await new Promise((r) => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = logoB64; });
    const ratio = tmpImg.naturalWidth / tmpImg.naturalHeight;
    let lw = LOGO_MAX_H * ratio, lh = LOGO_MAX_H;
    if (lw > LOGO_MAX_W) { lw = LOGO_MAX_W; lh = lw / ratio; }
    doc.addImage(logoB64, 'PNG', ML, 8, lw, lh, undefined, 'NONE');
  } else {
    setFont('bold', 20); setTxt(P.purple);
    doc.text('SONATTA', ML, 22);
  }

  const RX = PAGE_W - MR;
  setFont('bold', 14); setTxt(P.purple);
  doc.text(cfg.document_title || 'PROPOSTA COMERCIAL', RX, 12, { align: 'right' });
  setFont('normal', 9); setTxt(P.textSub);
  doc.text('Nº ' + (quote.quote_number || '—'), RX, 19, { align: 'right' });
  doc.text('Data: ' + fmtDate(quote.created_date), RX, 25, { align: 'right' });

  const validDays = quote.validity_days || cfg.validity_days || 30;
  const vd = new Date();
  vd.setDate(vd.getDate() + validDays);
  const validUntil = String(vd.getDate()).padStart(2,'0') + '/' + String(vd.getMonth()+1).padStart(2,'0') + '/' + vd.getFullYear();
  doc.text('Válida até: ' + validUntil, RX, 31, { align: 'right' });

  setFill(P.green); doc.rect(ML, 36, CW, 1.0, 'F');
  let Y = 43;

  const sectionHead = (label) => {
    setFill([246, 241, 251]); doc.rect(ML, Y, CW, 6.5, 'F');
    setFill(P.purple); doc.rect(ML, Y, 2, 6.5, 'F');
    setFont('bold', 11); setTxt(P.purple);
    doc.text(label, ML + 5, Y + 4.6);
    Y += 9;
  };

  // SECTION 1 — CLIENTE
  sectionHead('DADOS DO CLIENTE');
  Y += 3;
  const COL_A_LBL = ML + 3, COL_A_VAL = ML + 29;
  const COL_B_LBL = ML + CW / 2 + 3, COL_B_VAL = ML + CW / 2 + 29;
  const HALF_VAL_W = CW / 2 - 32;

  [
    [['Nome', quote.client_name || '—'], ['CPF', quote.client_cpf || '—']],
    [['Telefone', quote.client_phone || '—'], ['E-mail', quote.client_email || '—']],
  ].forEach(([left, right]) => {
    setFont('bold', 8.5); setTxt(P.textSub);
    doc.text(left[0] + ':', COL_A_LBL, Y);
    doc.text(right[0] + ':', COL_B_LBL, Y);
    setFont('normal', 9.5); setTxt(P.textMain);
    doc.text(doc.splitTextToSize(left[1], HALF_VAL_W)[0], COL_A_VAL, Y);
    doc.text(doc.splitTextToSize(right[1], HALF_VAL_W)[0], COL_B_VAL, Y);
    Y += 7;
  });
  rule(ML, Y, CW, P.divider, 0.3); Y += 9;

  // SECTION 2 — ITENS
  sectionHead('ITENS DO ORÇAMENTO');
  const TC = { desc: { x: ML, w: 100 }, qty: { x: ML+102, w: 14 }, unit: { x: ML+118, w: 28 } };
  const TR = PAGE_W - MR, TH = 7.5;

  const drawTableHeader = (sy) => {
    setFill(P.purple); doc.rect(ML, sy, CW, TH, 'F');
    setFont('bold', 9); setTxt(P.white);
    doc.text('Descrição', TC.desc.x + 2, sy + 5.2);
    doc.text('Qtd', TC.qty.x + TC.qty.w/2, sy + 5.2, { align: 'center' });
    doc.text('Valor Unit.', TC.unit.x + TC.unit.w - 1, sy + 5.2, { align: 'right' });
    doc.text('Total', TR - 1, sy + 5.2, { align: 'right' });
    return sy + TH;
  };

  Y = drawTableHeader(Y);
  let zebra = false;
  (quote.items || []).forEach((item) => {
    const nameLines = doc.splitTextToSize(item.product_name || '—', TC.desc.w - 3);
    const rowH = Math.max(7.5, nameLines.length * 5.5 + 3);
    if (Y + rowH > PAGE_H - 30) {
      doc.addPage(); setFill(P.pageBg); doc.rect(0,0,PAGE_W,PAGE_H,'F');
      Y = ML; Y = drawTableHeader(Y); zebra = false;
    }
    if (zebra) { setFill([245,243,248]); doc.rect(ML,Y,CW,rowH,'F'); }
    setFont('normal', 9.5); setTxt(P.textMain);
    doc.text(nameLines, TC.desc.x + 2, Y + 5);
    doc.text(String(item.quantity || 1), TC.qty.x + TC.qty.w/2, Y + 5, { align: 'center' });
    doc.text(BRL(item.unit_price), TC.unit.x + TC.unit.w - 1, Y + 5, { align: 'right' });
    doc.text(BRL(item.total), TR - 1, Y + 5, { align: 'right' });
    setFill([220,215,230]); doc.rect(ML, Y + rowH - 0.3, CW, 0.3, 'F');
    Y += rowH; zebra = !zebra;
  });

  setFill(P.purple); doc.rect(ML, Y, CW, 0.5, 'F'); Y += 7;

  // SECTION 3 — RESUMO FINANCEIRO
  const hasDsc = (quote.discount || 0) > 0;
  const totalAVista = quote.total;
  const inst18 = (quote.subtotal > 0 ? quote.subtotal : quote.total) / 18;
  const OPT_W = CW/2 - 3, OPT_X1 = ML, OPT_X2 = ML + OPT_W + 6, OPT_H = 32;

  // Option A
  setFill(P.green); doc.roundedRect(OPT_X1, Y, OPT_W, 8, 2, 2, 'F');
  setFont('bold', 9); setTxt(P.white);
  doc.text('À VISTA  (Dinheiro ou PIX)', OPT_X1 + OPT_W/2, Y + 5.5, { align: 'center' });
  setFill([250,252,243]); setStroke([180,210,60]); doc.setLineWidth(0.35);
  doc.roundedRect(OPT_X1, Y+7, OPT_W, OPT_H-7, 2, 2, 'FD');
  const AX = OPT_X1 + OPT_W - 5; let AY = Y + 14;
  setFont('normal', 8.5); setTxt(P.textSub); doc.text('Subtotal:', OPT_X1+5, AY);
  setFont('normal', 8.5); setTxt(P.textMain); doc.text(BRL(quote.subtotal), AX, AY, { align: 'right' });
  AY += 6.5;
  if (hasDsc) {
    const pct = quote.subtotal > 0 ? ((quote.discount/quote.subtotal)*100).toFixed(1)+'%' : '';
    setFont('normal', 8.5); setTxt(P.textSub); doc.text('Desconto '+(pct?'('+pct+')':'')+':',OPT_X1+5,AY);
    setFont('bold', 8.5); setTxt([80,140,0]); doc.text('- '+BRL(quote.discount),AX,AY,{align:'right'});
    AY += 6.5;
  }
  setFill([180,210,60]); doc.rect(OPT_X1+3, AY-1, OPT_W-6, 0.3, 'F'); AY += 3;
  setFont('bold', 12); setTxt([60,110,0]); doc.text(BRL(totalAVista), OPT_X1+OPT_W/2, AY, { align: 'center' });

  // Option B
  setFill(P.purple); doc.roundedRect(OPT_X2, Y, OPT_W, 8, 2, 2, 'F');
  setFont('bold', 9); setTxt(P.white);
  doc.text('PARCELADO  (Cartão de Crédito)', OPT_X2+OPT_W/2, Y+5.5, { align: 'center' });
  setFill([250,247,254]); setStroke([210,200,225]); doc.setLineWidth(0.35);
  doc.roundedRect(OPT_X2, Y+7, OPT_W, OPT_H-7, 2, 2, 'FD');
  const BX = OPT_X2+OPT_W-5; let BY = Y+14;
  setFont('normal', 8.5); setTxt(P.textSub); doc.text('Valor total:', OPT_X2+5, BY);
  setFont('normal', 8.5); setTxt(P.textMain); doc.text(BRL(quote.subtotal), BX, BY, { align: 'right' });
  BY += 6.5;
  setFont('normal', 8.5); setTxt(P.textSub); doc.text('Parcelamento em até 18×:', OPT_X2+5, BY);
  BY += 6.5;
  setFill([210,200,225]); doc.rect(OPT_X2+3, BY-1, OPT_W-6, 0.3, 'F'); BY += 3;
  setFont('bold', 12); setTxt(P.purple); doc.text(BRL(inst18)+'/mês', OPT_X2+OPT_W/2, BY, { align: 'center' });

  Y += OPT_H + 10;

  // SECTION 4 — CONDIÇÕES COMERCIAIS
  sectionHead('CONDIÇÕES COMERCIAIS');
  const conds = (cfg.conditions || '')
    .split('\n')
    .map((l) => l.trim().replace('{validity_days}', validDays))
    .filter(Boolean);

  Y += 3;
  setFont('normal', 9.5); setTxt(P.textMain);
  conds.forEach((line) => {
    if (Y > PAGE_H - 60) { doc.addPage(); setFill(P.pageBg); doc.rect(0,0,PAGE_W,PAGE_H,'F'); Y = ML + 10; }
    setFill(P.green); doc.rect(ML+1, Y-2.2, 1.8, 1.8, 'F');
    const wrapped = doc.splitTextToSize(line, CW-8);
    doc.text(wrapped, ML+6, Y);
    Y += wrapped.length * 6.8;
  });

  if (quote.notes) {
    Y += 5;
    setFont('bold', 9.5); setTxt(P.purple); doc.text('Observações:', ML, Y); Y += 6;
    setFont('normal', 9); setTxt(P.textMain);
    const obs = doc.splitTextToSize(quote.notes, CW);
    doc.text(obs, ML, Y); Y += obs.length * 5.5 + 4;
  }

  // SECTION 5 — GARANTIA
  Y += 4;
  if (Y > PAGE_H - 80) { doc.addPage(); setFill(P.pageBg); doc.rect(0,0,PAGE_W,PAGE_H,'F'); Y = ML + 10; }
  sectionHead('PRAZOS DE GARANTIA');
  Y += 1;

  // Garantia de Fábrica
  setFont('bold', 9.5); setTxt(P.purple); doc.text('Garantia de Fábrica', ML+3, Y); Y += 6;
  setFont('normal', 9); setTxt(P.textMain);
  const gf = doc.splitTextToSize(
    'Cobre defeitos de fabricação conforme padrão do fabricante para o modelo adquirido (reparos ou substituição de componentes com falhas eletrônicas ou mecânicas de origem fabril, mediante uso conforme normas técnicas).',
    CW - 6
  );
  doc.text(gf, ML+3, Y); Y += gf.length * 5.5 + 5;

  // Garantia de Adaptação
  setFont('bold', 9.5); setTxt(P.purple); doc.text('Garantia de Adaptação e Acompanhamento', ML+3, Y); Y += 6;
  setFont('normal', 9); setTxt(P.textMain);
  const ga = doc.splitTextToSize(
    'A Sonatta oferece acompanhamento técnico inicial para ajustes finos e suporte à adaptação, assegurando que o ganho auditivo esteja em conformidade com as necessidades clínicas do paciente.',
    CW - 6
  );
  doc.text(ga, ML+3, Y); Y += ga.length * 5.5 + 8;

  // SECTION 6 — CRONOGRAMA VIP
  if (Y > PAGE_H - 80) { doc.addPage(); setFill(P.pageBg); doc.rect(0,0,PAGE_W,PAGE_H,'F'); Y = ML + 10; }
  sectionHead('ACOMPANHAMENTO VIP VITALÍCIO');
  Y += 1;

  setFont('normal', 9); setTxt(P.textMain);
  const vip = doc.splitTextToSize(
    'Todas as revisões abaixo são TOTALMENTE GRATUITAS para clientes Sonatta, garantindo que a tecnologia esteja sempre calibrada para o seu estilo de vida:',
    CW - 6
  );
  doc.text(vip, ML+3, Y); Y += vip.length * 5.5 + 4;

  const revisoes = [
    { label: '1ª Revisão', desc: '3 meses após a compra' },
    { label: '2ª Revisão', desc: '9 meses após a compra' },
    { label: 'Revisões Subsequentes', desc: 'A cada 12 meses (anualmente)' },
  ];
  revisoes.forEach(({ label, desc }) => {
    setFill(P.green); doc.rect(ML+3, Y-2.2, 1.8, 1.8, 'F');
    setFont('bold', 9); setTxt(P.textMain); doc.text(label + ': ', ML+8, Y);
    const lw = doc.getTextWidth(label + ': ');
    setFont('normal', 9); doc.text(desc, ML+8+lw, Y);
    Y += 6.5;
  });

  Y += 3;
  setFont('normal', 8.5); setTxt(P.textSub);
  const extra = doc.splitTextToSize(
    'Caso detecte qualquer dificuldade fora dos períodos programados, o cliente pode agendar consulta extra — também coberta pelo atendimento Sonatta.',
    CW - 6
  );
  doc.text(extra, ML+3, Y); Y += extra.length * 5.5 + 4;

  // ASSINATURA
  const SIG_Y = PAGE_H - 44, SIG_X = ML + CW/2 - 30, SIG_W = 60;
  setFill(P.textSub); doc.rect(SIG_X, SIG_Y, SIG_W, 0.4, 'F');
  setFont('bold', 9.5); setTxt(P.textMain);
  doc.text(cfg.signer_name || 'Fabio Malveira', SIG_X+SIG_W/2, SIG_Y+5.5, { align: 'center' });
  setFont('normal', 8.5); setTxt(P.textSub);
  doc.text(cfg.signer_role || 'Comercial Sonatta', SIG_X+SIG_W/2, SIG_Y+11, { align: 'center' });

  // FOOTER
  const FY = PAGE_H - 20;
  setFill(P.green); doc.rect(ML, FY, CW, 0.8, 'F');
  const FL = FY + 6;
  setFont('normal', 8); setTxt(P.textSub);
  doc.text(cfg.address || '', ML, FL);
  doc.text((cfg.phone || '') + '  ·  ' + (cfg.email || ''), ML, FL+5);
  setFont('normal', 8); setTxt(P.purple);
  doc.text((cfg.website || '') + '  ·  ' + (cfg.instagram || ''), PAGE_W-MR, FL, { align: 'right' });

  return doc;
}

export default function QuotePDFButton({ quote, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!quote.client_phone) { toast.error('Cliente sem telefone cadastrado'); return; }
    setLoading(true);
    try {
      const cfg = await loadCfg();
      const doc = await buildPDF(quote, cfg);
      const name = 'Orcamento_' + (quote.quote_number || 'Sonatta') + '.pdf';
      doc.save(name);
      toast.success('PDF gerado com sucesso!');
    } catch (e) {
      console.error(e); toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm" variant="outline"
      className="border-[#622A7E] text-[#622A7E] hover:bg-[#622A7E] hover:text-white"
      onClick={handle} disabled={loading}
      title="Gerar PDF e enviar pelo WhatsApp"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}