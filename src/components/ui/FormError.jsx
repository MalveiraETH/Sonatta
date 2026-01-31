import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FormErrorSummary({ errors, className }) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className={cn("bg-red-50 border border-red-200 rounded-lg p-4 mb-6", className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-2">
            Corrija os campos abaixo para continuar
          </h3>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, required, error, children, className }) {
  const fieldRef = React.useRef(null);

  useEffect(() => {
    if (error && fieldRef.current) {
      const firstError = document.querySelector('[data-error="true"]');
      if (firstError === fieldRef.current) {
        fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [error]);

  return (
    <div className={cn("space-y-2", className)} ref={fieldRef} data-error={!!error}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={cn(error && "has-error")}>
        {children}
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

export function useFormValidation() {
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const validate = (fieldName, value, rules) => {
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rules.requiredMessage || 'Este campo é obrigatório';
    }

    if (rules.min && Number(value) < rules.min) {
      return rules.minMessage || `Valor mínimo: ${rules.min}`;
    }

    if (rules.max && Number(value) > rules.max) {
      return rules.maxMessage || `Valor máximo: ${rules.max}`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.patternMessage || 'Formato inválido';
    }

    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  };

  const validateField = (fieldName, value, rules) => {
    const error = validate(fieldName, value, rules);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    return !error;
  };

  const validateAll = (values, validationRules) => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName], validationRules[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const clearError = (fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearAllErrors = () => {
    setErrors({});
    setTouched({});
  };

  const markTouched = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  const getErrorMessages = () => {
    return Object.values(errors).filter(Boolean);
  };

  return {
    errors,
    touched,
    validateField,
    validateAll,
    clearError,
    clearAllErrors,
    markTouched,
    getErrorMessages,
    hasErrors: Object.values(errors).some(Boolean)
  };
}