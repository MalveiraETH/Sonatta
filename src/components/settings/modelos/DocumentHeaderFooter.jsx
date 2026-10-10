import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LayoutTemplate, Loader2, Save } from 'lucide-react';
import HeaderLayoutEditor from './HeaderLayoutEditor';
import FooterLayoutEditor from './FooterLayoutEditor';

const SETTING_KEY = 'document_header_footer';

export default function DocumentHeaderFooter({ canEdit }) {
  const [headerImage, setHeaderImage] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    base44.entities.AppSettings.filter({ setting_key: SETTING_KEY })
      .then((res) => {
        const record = (res.items || [])[0];
        if (!active || !record) return;

        const saved = record.setting_value || {};
        setRecordId(record.id);
        setHeaderImage(
          saved.header_image_url || (typeof saved.header === 'object' ? saved.header?.image_url : '') || ''
        );
        setHeaderText(typeof saved.header === 'string' ? saved.header : saved.header?.text || '');
        setFooterText(typeof saved.footer === 'string' ? saved.footer : saved.footer?.text || '');
      })
      .catch(() => toast.error('Erro ao carregar o cabeçalho e o rodapé'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const setting_value = {
        header_image_url: headerImage,
        header_text: headerText,
        footer_text: footerText,
      };
      if (recordId) {
        await base44.entities.AppSettings.update(recordId, { setting_value });
      } else {
        const created = await base44.entities.AppSettings.create({
          setting_key: SETTING_KEY,
          setting_value,
          description: 'Cabeçalho e rodapé padrão dos documentos e prontuários',
        });
        setRecordId(created?.id || null);
      }
      toast.success('Cabeçalho e rodapé salvos');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <style>{`
        .doc-layout-editor .ql-toolbar.ql-snow {
          border: 1px solid #e2e8f0;
          border-radius: 10px 10px 0 0;
          background: #f8fafc;
        }
        .doc-layout-editor .ql-container.ql-snow {
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 10px 10px;
          background: #fff;
          font-family: 'Helvetica', 'Arial', sans-serif;
        }
        .doc-layout-editor .ql-editor {
          min-height: 130px;
          padding: 14px 18px;
          font-size: 14px;
          line-height: 1.6;
          color: #1f2937;
        }
        .doc-layout-editor .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
        }
        .doc-layout-editor .ql-editor img {
          max-width: 100%;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-[#6B3FA0]" />
            Cabeçalho e Rodapé
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Formate o cabeçalho e o rodapé usados em todos os documentos e prontuários gerados pelo
            sistema.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#A4D233] hover:bg-[#B8E047] text-slate-900 font-semibold flex-shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        )}
      </div>

      {!canEdit && (
        <p className="text-sm text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          Somente administradores podem alterar o cabeçalho e o rodapé.
        </p>
      )}

      <HeaderLayoutEditor
        imageUrl={headerImage}
        onImageChange={setHeaderImage}
        text={headerText}
        onTextChange={setHeaderText}
        canEdit={canEdit}
      />

      <FooterLayoutEditor text={footerText} onTextChange={setFooterText} canEdit={canEdit} />
    </div>
  );
}