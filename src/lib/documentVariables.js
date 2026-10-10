// Variáveis dinâmicas disponíveis nos modelos de documento/prontuário.
// São gravadas no conteúdo como tokens {{ variavel }} e preenchidas depois
// com os dados do cliente, da clínica, do profissional e do atendimento.
export const VARIABLE_GROUPS = [
  {
    group: 'Data & Hora',
    items: [
      { token: '{{ data_atual }}', label: 'Data atual' },
      { token: '{{ data_atual_extenso }}', label: 'Data por extenso' },
      { token: '{{ hora_atual }}', label: 'Hora atual' },
      { token: '{{ dia_semana }}', label: 'Dia da semana' },
    ],
  },
  {
    group: 'Clínica',
    items: [
      { token: '{{ clinica_nome }}', label: 'Nome da clínica' },
      { token: '{{ clinica_cnpj }}', label: 'CNPJ' },
      { token: '{{ clinica_endereco }}', label: 'Endereço' },
      { token: '{{ clinica_telefone }}', label: 'Telefone' },
      { token: '{{ clinica_email }}', label: 'E-mail' },
    ],
  },
  {
    group: 'Unidade',
    items: [
      { token: '{{ unidade_nome }}', label: 'Nome da unidade' },
      { token: '{{ unidade_endereco }}', label: 'Endereço da unidade' },
      { token: '{{ unidade_telefone }}', label: 'Telefone da unidade' },
    ],
  },
  {
    group: 'Profissional',
    items: [
      { token: '{{ profissional_nome_completo }}', label: 'Nome do profissional' },
      { token: '{{ profissional_especialidade }}', label: 'Especialidade' },
      { token: '{{ profissional_registro }}', label: 'Registro profissional' },
    ],
  },
  {
    group: 'Usuário',
    items: [
      { token: '{{ usuario_nome }}', label: 'Nome do usuário' },
      { token: '{{ usuario_cargo }}', label: 'Cargo do usuário' },
    ],
  },
  {
    group: 'Paciente',
    items: [
      { token: '{{ paciente_nome_completo }}', label: 'Nome completo' },
      { token: '{{ paciente_cpf }}', label: 'CPF' },
      { token: '{{ paciente_rg }}', label: 'RG' },
      { token: '{{ paciente_nascimento }}', label: 'Data de nascimento' },
      { token: '{{ paciente_telefone }}', label: 'Telefone' },
      { token: '{{ paciente_email }}', label: 'E-mail' },
      { token: '{{ paciente_endereco }}', label: 'Endereço' },
    ],
  },
  {
    group: 'Responsável',
    items: [
      { token: '{{ responsavel_nome }}', label: 'Nome do responsável' },
      { token: '{{ responsavel_cpf }}', label: 'CPF do responsável' },
      { token: '{{ responsavel_parentesco }}', label: 'Parentesco' },
      { token: '{{ responsavel_telefone }}', label: 'Telefone do responsável' },
    ],
  },
];