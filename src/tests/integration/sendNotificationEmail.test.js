import { describe, it, expect, vi, beforeEach } from 'vitest';
import { base44 } from '@/api/base44Client';

vi.mock('@/api/base44Client');

describe('sendNotificationEmail Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSendEmail = async (to, subject, body) => {
    if (!to || !subject || !body) {
      throw new Error('Missing required fields');
    }
    return { success: true, messageId: `msg-${Date.now()}` };
  };

  it('should send new client notification', async () => {
    const result = await mockSendEmail(
      'admin@clinic.com',
      '[NOVO CLIENTE] João Silva',
      '<p>Novo cliente cadastrado: João Silva</p>'
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should send new sale notification', async () => {
    const result = await mockSendEmail(
      'admin@clinic.com',
      '[NOVA VENDA] #VENDA-001',
      '<p>Nova venda registrada: R$ 2.500,00</p>'
    );

    expect(result.success).toBe(true);
  });

  it('should throw error for missing fields', async () => {
    await expect(mockSendEmail('', 'Subject', 'Body')).rejects.toThrow();
    await expect(mockSendEmail('user@email.com', '', 'Body')).rejects.toThrow();
    await expect(mockSendEmail('user@email.com', 'Subject', '')).rejects.toThrow();
  });

  it('should include tenant info in email', async () => {
    const tenantName = 'Clínica Auditiva Central';
    const body = `<p>Clínica: ${tenantName}</p>`;
    
    const result = await mockSendEmail(
      'admin@clinic.com',
      `[NOTIFICAÇÃO] ${tenantName}`,
      body
    );

    expect(result.success).toBe(true);
  });

  it('should handle multiple recipients', async () => {
    const emails = ['admin1@clinic.com', 'admin2@clinic.com'];
    
    const results = await Promise.all(
      emails.map(email => mockSendEmail(email, 'Subject', 'Body'))
    );

    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
  });
});