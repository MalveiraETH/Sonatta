import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ status: 'erro', message: 'Sessão expirada. Entre novamente.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const cep = String((body && body.cep) || '').replace(/\D/g, '');

    if (cep.length !== 8) {
      return Response.json({ status: 'invalido', message: 'O CEP deve ter 8 dígitos.' });
    }

    const timeout = 7000;
    const headers = { 'Accept': 'application/json', 'User-Agent': 'Sonatta-CRM/1.0' };

    let viaCepEncontrado = false;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        headers,
        signal: AbortSignal.timeout(timeout)
      });
      console.log('viacep status', res.status);
      if (res.ok) {
        const data = await res.json();
        if (data.erro) {
          viaCepEncontrado = true;
        } else {
          return Response.json({
            status: 'ok',
            cep: data.cep || cep,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          });
        }
      }
    } catch (e) {
      console.log('viacep falhou', e.message);
    }

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
        headers,
        signal: AbortSignal.timeout(timeout)
      });
      console.log('brasilapi status', res.status);
      if (res.ok) {
        const data = await res.json();
        if (!data.city && !data.street) {
          return Response.json({
            status: 'nao_encontrado',
            message: 'CEP não encontrado. Confira o número ou salve assim mesmo.'
          });
        }
        return Response.json({
          status: 'ok',
          cep: data.cep || cep,
          street: data.street || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || ''
        });
      }
    } catch (e) {
      console.log('brasilapi falhou', e.message);
    }

    if (viaCepEncontrado) {
      return Response.json({
        status: 'nao_encontrado',
        message: 'CEP não encontrado. Confira o número ou salve assim mesmo.'
      });
    }

    return Response.json({
      status: 'indisponivel',
      message: 'Não foi possível consultar o CEP agora. Confira o endereço e salve normalmente.'
    });
  } catch (error) {
    return Response.json({ status: 'erro', message: error.message }, { status: 500 });
  }
}