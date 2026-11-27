import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import AssistedSteps from './assisted/AssistedSteps';
import ImageUploadCard from './assisted/ImageUploadCard';
import XmlUploadCard from './assisted/XmlUploadCard';
import ProductReviewCard from './assisted/ProductReviewCard';
import NewReferenceDialog from './assisted/NewReferenceDialog';
import { buildProductPayload, computeCosts } from '@/lib/assistedPricing';
import { findXmlMatch, xmlValues } from '@/lib/assistedMatching';

let sequence = 0;
const nextId = () => `item-${(sequence += 1)}`;

const today = () => new Date().toISOString().split('T')[0];

const BRL = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AssistedRegistrationTab({ onSaved }) {
  const [step, setStep] = useState('fotos');
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState([]);
  const [nota, setNota] = useState(null);
  const [parsingXml, setParsingXml] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedProducts, setSavedProducts] = useState([]);
  const [duplicates, setDuplicates] = useState({});
  const [billingCfg, setBillingCfg] = useState(null);
  const [referenceTarget, setReferenceTarget] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await base44.entities.AppSettings.list();
      const record = settings.find((row) => row.setting_key === 'billing_config');
      if (record?.setting_value) setBillingCfg(record.setting_value);
    };
    loadSettings().catch(() => {});
  }, []);

  const serialKey = items.map((item) => item.serial_number || '').join('|');
  useEffect(() => {
    const serials = items.map((item) => item.serial_number?.trim()).filter(Boolean);
    if (!serials.length) {
      setDuplicates({});
      return;
    }
    const timer = setTimeout(async () => {
      const found = await base44.entities.Product.filter({
        stock_type: 'serializado',
        serial_number: { $in: serials },
      });
      const map = {};
      found.forEach((product) => {
        map[product.serial_number] = product;
      });
      setDuplicates(map);
    }, 500);
    return () => clearTimeout(timer);
  }, [serialKey]);

  const xmlItems = nota?.items || [];

  const toItem = (product) => {
    const reference = product.matched_reference || null;
    return {
      id: nextId(),
      selected: true,
      expanded: !reference || !product.serial_number,
      product_name: product.product_name || reference?.name || '',
      reference: product.reference || reference?.reference || '',
      serial_number: product.serial_number || '',
      brand: product.brand || reference?.brand || '',
      model: product.model || '',
      barcode: product.barcode || '',
      qr_code: product.qr_code || '',
      matched_reference: reference,
      category: 'aparelho_auditivo',
      markup_category: reference?.category || '',
      warranty_years: reference?.warranty_years ?? 2,
      power_type: reference?.power_type || 'bateria_recarregavel',
      include_fixed_cost: reference?.include_fixed_cost !== false,
      product_cost: Number(reference?.cost || 0),
      icms: 0,
      ipi: 0,
      sale_price: 0,
      nota_fiscal_entrada: '',
      entry_date: today(),
      xml_index: null,
    };
  };

  const handleAddImages = (files) => {
    const accepted = files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({ id: nextId(), file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...accepted]);
  };

  const handleRemoveImage = (id) => {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((image) => image.id !== id);
    });
  };

  const handleAnalyze = async () => {
    if (!images.length) return;
    setAnalyzing(true);
    try {
      const uris = [];
      for (const image of images) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: image.file });
        uris.push(file_uri);
      }
      const response = await base44.functions.invoke('analisarImagemProdutos', { image_uris: uris });
      const found = response.data?.products || [];
      if (!found.length) {
        toast.error('Nenhum produto identificado nas imagens');
        return;
      }
      setItems(found.map(toItem));
      setStep('nota');
      toast.success(`${found.length} produto(s) identificado(s)`);
    } catch (error) {
      toast.error('Não foi possível analisar as imagens');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyNota = (item, notaData, allItems) => {
    const used = new Set(
      allItems
        .filter((other) => other.id !== item.id)
        .map((other) => other.xml_index)
        .filter((value) => value !== null && value !== undefined)
    );
    const matchIndex = findXmlMatch(item, notaData.items, used);
    const entryDate = notaData.issue_date ? notaData.issue_date.slice(0, 10) : item.entry_date;
    if (matchIndex === null) {
      return { ...item, nota_fiscal_entrada: notaData.number || '', entry_date: entryDate };
    }
    return {
      ...item,
      xml_index: matchIndex,
      ...xmlValues(notaData.items[matchIndex]),
      nota_fiscal_entrada: notaData.number || '',
      entry_date: entryDate,
    };
  };

  const handleXml = async (text, fileName) => {
    setParsingXml(true);
    try {
      const response = await base44.functions.invoke('extrairXmlNfe', { xml: text });
      const data = response.data;
      if (!data?.items?.length) {
        toast.error('Não foi possível ler a nota fiscal');
        return;
      }
      const notaData = { ...data, file_name: fileName };
      setNota(notaData);
      setItems((prev) => prev.map((item) => applyNota(item, notaData, prev)));
      toast.success(`Nota ${data.number || ''} lida com ${data.items.length} item(ns)`);
    } catch (error) {
      toast.error('Erro ao ler o XML da nota');
    } finally {
      setParsingXml(false);
    }
  };

  const handleClearNota = () => {
    setNota(null);
    setItems((prev) =>
      prev.map((item) => ({ ...item, xml_index: null, nota_fiscal_entrada: '' }))
    );
  };

  const handleChangeItem = (id, patch) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleReferenceCreated = (reference) => {
    if (!referenceTarget) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === referenceTarget.id
          ? {
              ...item,
              matched_reference: reference,
              reference: reference.reference,
              product_cost: Number(item.product_cost) || Number(reference.cost || 0),
              product_name: item.product_name || reference.name,
              brand: item.brand || reference.brand || '',
              markup_category: reference.category || item.markup_category,
              warranty_years: reference.warranty_years ?? item.warranty_years,
              power_type: reference.power_type || item.power_type,
              include_fixed_cost: reference.include_fixed_cost !== false,
            }
          : item
      )
    );
    setReferenceTarget(null);
  };

  const selectedItems = items.filter((item) => item.selected);
  const totals = useMemo(() => {
    const sale = selectedItems.reduce((sum, item) => sum + Number(item.sale_price || 0), 0);
    const cost = selectedItems.reduce(
      (sum, item) => sum + computeCosts(item, billingCfg?.fixed_cost).total,
      0
    );
    return { sale, cost };
  }, [selectedItems, billingCfg]);

  const handleConfirm = async () => {
    if (!selectedItems.length) {
      toast.error('Selecione ao menos um produto');
      return;
    }
    const incomplete = selectedItems.find(
      (item) => !item.product_name?.trim() || !item.serial_number?.trim()
    );
    if (incomplete) {
      toast.error('Informe nome e número de série de todos os produtos selecionados');
      return;
    }
    const duplicated = selectedItems.find((item) => duplicates[item.serial_number.trim()]);
    if (duplicated) {
      toast.error(`Nº de série ${duplicated.serial_number} já está cadastrado`);
      return;
    }
    if (!billingCfg) {
      toast.error('Configuração de custos não carregada');
      return;
    }
    setSaving(true);
    try {
      const payloads = selectedItems.map((item) => buildProductPayload(item, billingCfg));
      const created = await base44.entities.Product.bulkCreate(payloads);
      await base44.entities.StockMovement.bulkCreate(
        created.map((product, index) => ({
          product_id: product.id,
          product_name: product.name,
          type: 'entrada',
          quantity: 1,
          reason: `Entrada NF: ${selectedItems[index].nota_fiscal_entrada || 'Sem NF'}`,
        }))
      );
      setSavedProducts(created);
      setItems((prev) => prev.filter((item) => !item.selected));
      setImages([]);
      setStep('concluido');
      toast.success(`${created.length} produto(s) cadastrado(s)`);
      if (onSaved) onSaved();
    } catch (error) {
      toast.error('Erro ao cadastrar os produtos');
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    setSavedProducts([]);
    setNota(null);
    setStep('fotos');
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
            <ScanLine className="h-5 w-5 text-[#6B3FA0]" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Cadastro assistido por imagem</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              A IA lê as caixas, confronta com os produtos de referência e usa o XML da nota para os
              valores de compra, ICMS e IPI.
            </p>
          </div>
        </div>
        <AssistedSteps current={step} />
      </Card>

      {step === 'fotos' && (
        <ImageUploadCard
          images={images}
          onAdd={handleAddImages}
          onRemove={handleRemoveImage}
          onAnalyze={handleAnalyze}
          analyzing={analyzing}
        />
      )}

      {step === 'nota' && (
        <div className="space-y-4">
          <XmlUploadCard
            nota={nota}
            parsing={parsingXml}
            onXml={handleXml}
            onClear={handleClearNota}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setStep('fotos')} className="sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às fotos
            </Button>
            <Button
              onClick={() => setStep('revisao')}
              className="flex-1 bg-[#6B3FA0] hover:bg-[#834CB8]"
            >
              {nota ? 'Revisar produtos' : 'Continuar sem nota fiscal'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'revisao' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedItems.length} de {items.length} selecionado(s)
              </p>
              <p className="text-xs text-slate-500">
                Custo {BRL(totals.cost)} • Venda prevista {BRL(totals.sale)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('nota')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Nota
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={saving || !selectedItems.length}
                className="bg-[#2f7d4f] hover:bg-[#276a43]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                Confirmar cadastro
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <ProductReviewCard
                key={item.id}
                item={item}
                index={index}
                billingCfg={billingCfg}
                xmlItems={xmlItems}
                duplicateSerial={item.serial_number ? duplicates[item.serial_number.trim()] : null}
                onChange={handleChangeItem}
                onRequestReference={(target) =>
                  setReferenceTarget({
                    id: target.id,
                    draft: {
                      reference: target.reference || '',
                      name: target.product_name || '',
                      brand: target.brand || '',
                      cost: target.product_cost || 0,
                      warranty_years: target.warranty_years ?? 2,
                      power_type: target.power_type || 'bateria_recarregavel',
                    },
                  })
                }
              />
            ))}
          </div>

          {items.length > 0 && (
            <Card className="p-4 border-dashed">
              <p className="text-xs text-slate-500">
                Nenhum produto é gravado até você confirmar. Itens desmarcados são descartados.
              </p>
            </Card>
          )}
        </div>
      )}

      {step === 'concluido' && (
        <Card className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {savedProducts.length} produto(s) cadastrado(s)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Entrada registrada no estoque e movimentação criada.
            </p>
          </div>
          <div className="text-left rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {savedProducts.map((product) => (
              <div key={product.id} className="p-3">
                <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                <p className="text-[11px] text-slate-500">
                  NS {product.serial_number} • Venda {BRL(product.sale_price)}
                </p>
              </div>
            ))}
          </div>
          <Button onClick={handleRestart} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
            <Sparkles className="h-4 w-4 mr-2" />
            Cadastrar mais produtos
          </Button>
        </Card>
      )}

      <NewReferenceDialog
        open={Boolean(referenceTarget)}
        onOpenChange={(open) => {
          if (!open) setReferenceTarget(null);
        }}
        draft={referenceTarget?.draft}
        onCreated={handleReferenceCreated}
      />
    </div>
  );
}