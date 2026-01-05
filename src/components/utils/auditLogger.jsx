import { base44 } from '@/api/base44Client';

export const logAudit = async (entityType, action, description, entityId = null, details = {}) => {
  try {
    await base44.entities.AuditLog.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      description,
      details
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
};

export const logCreation = (entityType, description, entityId = null) => 
  logAudit(entityType, 'criacao', description, entityId);

export const logEdit = (entityType, description, entityId = null) => 
  logAudit(entityType, 'edicao', description, entityId);

export const logDeletion = (entityType, description, entityId = null) => 
  logAudit(entityType, 'exclusao', description, entityId);

export const logWhatsApp = (entityType, description, entityId = null) => 
  logAudit(entityType, 'whatsapp', description, entityId);