import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import AssistedSteps from './assisted/AssistedSteps';
import ImageUploadCard from './assisted/ImageUploadCard';
import XmlUploadCard from './assisted/XmlUploadCard';
import ProductReviewCard from './assisted/ProductReviewCard';
import NewReferenceDialog from './assisted/NewReferenceDialog';
import { buildProductPayload, priceOptions } from '@/lib/assistedPricing';
import { findReferenceByCode, normalizeText } from '@/lib/assistedMatching';

let sequence = 0;
const nextId = () => `item-${(sequence += 1)}`;

const today = () => new Date().toISOString().split('T')[0];

const BRL = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PRICE_FIELDS = ['product_cost', 'icms', 'ipi', 'include_fixed_cost', 'markup_category'];

export default function AssistedRegistrationTab({ onSaved }) {
  const [step, setStep] = useState('nota');
  const [nota, setNota] = useState(null);
  const [parsingXml, setParsingXml] = useState(false);
  const [items, setItems] = useState([]);
  const [references, setReferences] = useState([]);
  const [billingCfg, setBillingCfg] = useState(null);
  const [duplicates, setDuplicates] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedProducts, setSavedProducts] = useState([]);
  const [referenceTarget, setReferenceTarget] = useState(null);
  const [showPhotos, setShowPhotos] = useState(false);
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  const ensureBase = async () => {
    if (billingCfg && references.length) return { cfg: billingCfg, refs: references };
    const [settings, refs] = await Promise.all([
      base44.entities.AppSettings.list(),
      base44.entities.ReferenceProduct.list(),
    ]);
    const record = settings.find((row) => row.setting_key === 'billing_config');
    const cfg = record?.setting_value || null;
    setBillingCfg(cfg);
    setReferences(refs);
    return { cfg, refs };
  };

  useEffect(() => {
    ensureBase().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const withPrice = (item, reference, cfg) => {
    const options = priceOptions(item, reference ?? item.matched_reference, cfg);
    return { ...item, sale_price: options.best ?? item.sale_price };
  };

  const buildItemsFromNota = (notaData, refs, cfg) => {
    const built = [];
    notaData.items.forEach((xml, xmlIndex) => {
      const reference = findReferenceByCode(refs, xml.code, xml.description);
      const units = Math.max(1, Math.round(Number(xml.quantity) || 1));
      const serials = Array.isArray(xml.serial_numbers) ? xml.serial_numbers : [];
      const unitCost = Number((Number(xml.total || 0) / units).toFixed(2));
      const unitIcms = Number((Number(xml.icms || 0) / units).toFixed(2));
      const unitIpi = Number((Number(xml.ipi || 0) / units).toFixed(2));

      for (let unit = 0; unit < units; unit += 1) {
        const base = {
          id: nextId(),
          selected: true,
          expanded: !reference || !serials[unit],
          product_name: reference?.name || xml.description || '',
          reference: xml.code || reference?.reference || '',
          serial_number: serials[unit] || '',
          brand: reference?.brand || '',
          model: '',
          barcode: xml.barcode || '',
          qr_code: '',
          matched_reference: reference,
          category: 'aparelho_auditivo',
          markup_category: reference?.category || '',
          warranty_years: reference?.warranty_years ?? 2,
          power_type: reference?.power_type || 'bateria_recarregavel',
          include_fixed_cost: reference?.include_fixed_cost !== false,
          product_cost: unitCost,
          icms: unitIcms,
          ipi: unitIpi,
          sale_price: 0,
          nota_fiscal_entrada: notaData.number || '',
          entry_date: notaData.issue_date ? notaData.issue_date.slice(0, 10) : today(),
          xml_index: xmlIndex,
        };
        built.push(withPrice(base, reference, cfg));
      }
    });
    return built;
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
      const { cfg, refs } = await ensureBase();
      const notaData = { ...data, file_name: fileName };
      setNota(notaData);
      setItems(buildItemsFromNota(notaData, refs, cfg));
      setStep('revisao');
      toast.success(`Nota ${data.number || ''} lida: ${data.items.length} item(ns)`);
    } catch (error) {
      toast.error('Erro ao ler o XML da nota');
    } finally {
      setParsingXml(false);
    }
  };

  const handleClearNota = () => {
    setNota(null);
    setItems([]);
    setSavedProducts([]);
    setStep('nota');
  };

  const handleChangeItem = (id, patch) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (!PRICE_FIELDS.some((field) => field in patch)) return next;
        return withPrice(next, next.matched_reference, billingCfg);
      })
    );
  };

  const handleReferenceCreated = (reference) => {
    if (!referenceTarget) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== referenceTarget.id) return item;
        const next = {
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
        };
        return withPrice(next, reference, billingCfg);
      })
    );
    setReferences((prev) => [...prev, reference]);
    setReferenceTarget(null);
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

  const handleAnalyzePhotos = async () => {
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
        toast.error('Nenhum produto identificado nas fotos');
        return;
      }

      let filled = 0;
      setItems((prev) => {
        const next = prev.map((item) => ({ ...item }));
        found.forEach((product) => {
          const serial = (product.serial_number || '').trim();
          const reference = normalizeText(product.reference);
          const target = next.find(
            (item) =>
              !item.serial_number &&
              reference &&
              normalizeText(item.reference) === reference
          );
          if (target && serial) {
            target.serial_number = serial;
            target.model = target.model || product.model || '';
            filled += 1;
          }
        });
        return next;
      });

      if (filled) {
        toast.success(`${filled} nº(s) de série preenchido(s) pelas fotos`);
      } else {
        toast.info('As fotos não trouxeram séries novas para os itens da nota');
      }
      setImages([]);
    } catch (error) {
      toast.error('Não foi possível analisar as fotos');
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedItems = items.filter((item) => item.selected);
  const totals = useMemo(() => {
    const sale = selectedItems.reduce(
      (sum, item) =>
        sum + Number(item.sale_price || priceOptions(item, item.matched_reference, billingCfg).best || 0),
      0
    );
    const cost = selectedItems.reduce(
      (sum, item) => sum + priceOptions(item, item.matched_reference, billingCfg).total,
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
    const missingPrice = selectedItems.find(
      (item) =>
        !(Number(item.sale_price) > 0) &&
        priceOptions(item, item.matched_reference, billingCfg).best === null
    );
    if (missingPrice) {
      toast.error(
        `Defina o nível de tecnologia de ${missingPrice.product_name || 'um produto'} para calcular a venda`
      );
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
    setItems([]);
    setImages([]);
    setShowPhotos(false);
    setStep('nota');
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
            <ScanLine className="h-5 w-5 text-[#6B3FA0]" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Cadastro assistido pela nota fiscal</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              A nota abre um produto serializado por unidade: a referência carrega os dados do
              cadastro de referência e o preço de venda fica no maior valor.
            </p>
          </div>
        </div>
        <AssistedSteps current={step} />
      </Card>

      {step === 'nota' && (
        <div className="space-y-4">
          <XmlUploadCard
            nota={nota}
            parsing={parsingXml}
            onXml={handleXml}
            onClear={handleClearNota}
          />
          <Card className="p-4 bg-slate-50 border-dashed">
            <p className="text-xs text-slate-500">
              O XML traz código de referência, séries, quantidade, valores, ICMS e IPI. Cada unidade
              da nota vira um produto serializado para revisão.
            </p>
          </Card>
        </div>
      )}

      {step === 'revisao' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                NF {nota?.number || '—'} • {selectedItems.length} de {items.length} selecionado(s)
              </p>
              <p className="text-xs text-slate-500">
                Custo {BRL(totals.cost)} • Venda prevista {BRL(totals.sale)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearNota}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Trocar nota
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

          {!showPhotos ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-slate-600"
              onClick={() => setShowPhotos(true)}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Conferir séries com fotos das caixas (opcional)
            </Button>
          ) : (
            <ImageUploadCard
              images={images}
              onAdd={handleAddImages}
              onRemove={handleRemoveImage}
              onAnalyze={handleAnalyzePhotos}
              analyzing={analyzing}
            />
          )}

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
            Cadastrar outra nota
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