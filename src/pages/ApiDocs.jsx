import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Sonatta SaaS API',
    version: '1.0.0',
    description: 'API completa para gerenciamento de clínicas auditivas',
    contact: {
      name: 'Sonatta Support',
      email: 'support@sonatta.com.br'
    },
    license: {
      name: 'MIT'
    }
  },
  servers: [
    {
      url: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      description: 'Production'
    }
  ],
  paths: {
    '/api/functions/backupDatabase': {
      post: {
        summary: 'Criar backup completo',
        tags: ['Backup'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Backup criado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string' },
                    entities: { type: 'object' }
                  }
                }
              }
            }
          },
          403: { description: 'Admin access required' },
          500: { description: 'Backup failed' }
        }
      }
    },
    '/api/functions/restoreDatabase': {
      post: {
        summary: 'Restaurar dados de um backup',
        tags: ['Backup'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  backup_file: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Restauração completa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    restored: { type: 'number' },
                    errors: { type: 'number' }
                  }
                }
              }
            }
          },
          403: { description: 'Admin access required' },
          500: { description: 'Restore failed' }
        }
      }
    },
    '/api/functions/checkPlanLimits': {
      post: {
        summary: 'Verifica limites do plano',
        tags: ['Plans'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Limites do plano',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    plan: { type: 'string' },
                    limits: { type: 'object' },
                    usage: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/functions/sendNotificationEmail': {
      post: {
        summary: 'Envia email de notificação',
        tags: ['Email'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  to: { type: 'string' },
                  subject: { type: 'string' },
                  template: { type: 'string' },
                  data: { type: 'object' }
                },
                required: ['to', 'subject', 'template']
              }
            }
          }
        },
        responses: {
          200: { description: 'Email enviado' },
          400: { description: 'Invalid parameters' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 mb-4 border-b bg-blue-50">
        <h1 className="text-2xl font-bold text-blue-900">API Documentation</h1>
        <p className="text-blue-700">Documentação completa da API REST do Sonatta</p>
      </div>
      <SwaggerUI spec={swaggerSpec} />
    </div>
  );
}