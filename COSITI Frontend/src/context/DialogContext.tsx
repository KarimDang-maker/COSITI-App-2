import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  X,
  Trash2,
  ShieldAlert,
  Check,
} from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'primary';

export interface DialogDetailItem {
  label: string;
  value: string | number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  icon?: 'trash' | 'alert' | 'warning' | 'shield' | 'question' | 'check';
  details?: DialogDetailItem[];
}

export interface AlertDialogOptions {
  title: string;
  message: string | ReactNode;
  buttonText?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export interface PromptDialogOptions {
  title: string;
  message: string | ReactNode;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: 'text' | 'textarea' | 'number' | 'password';
  required?: boolean;
}

interface DialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
  prompt: (options: PromptDialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // État du dialogue Confirm
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // État du dialogue Alert
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertDialogOptions;
    resolve: () => void;
  } | null>(null);

  // État du dialogue Prompt
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    options: PromptDialogOptions;
    value: string;
    resolve: (value: string | null) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        options,
        value: options.defaultValue || '',
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  const handlePromptClose = (result: string | null) => {
    if (promptState) {
      promptState.resolve(result);
      setPromptState(null);
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      {/* BOÎTE DE DIALOGUE : CONFIRM */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    confirmState.options.variant === 'danger'
                      ? 'bg-rose-100 text-rose-600'
                      : confirmState.options.variant === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : confirmState.options.variant === 'success'
                      ? 'bg-emerald-100 text-emerald-600'
                      : confirmState.options.variant === 'primary'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {confirmState.options.icon === 'trash' ? (
                    <Trash2 className="w-5 h-5" />
                  ) : confirmState.options.icon === 'shield' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : confirmState.options.icon === 'check' ? (
                    <Check className="w-5 h-5" />
                  ) : confirmState.options.variant === 'danger' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : confirmState.options.variant === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : confirmState.options.variant === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <HelpCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {confirmState.options.title}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {confirmState.options.message}
                  </div>
                </div>
              </div>

              {/* Détails récapitulatifs éventuels */}
              {confirmState.options.details && confirmState.options.details.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  {confirmState.options.details.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-500 font-medium">{item.label} :</span>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {confirmState.options.cancelText || 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    confirmState.options.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : confirmState.options.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : confirmState.options.variant === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-700 hover:bg-indigo-800'
                  }`}
                >
                  <span>{confirmState.options.confirmText || 'Confirmer'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOÎTE DE DIALOGUE : ALERT */}
      {alertState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    alertState.options.variant === 'error'
                      ? 'bg-rose-100 text-rose-600'
                      : alertState.options.variant === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : alertState.options.variant === 'success'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {alertState.options.variant === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : alertState.options.variant === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : alertState.options.variant === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {alertState.options.title}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {alertState.options.message}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  autoFocus
                  onClick={handleAlertClose}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${
                    alertState.options.variant === 'error'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : alertState.options.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : alertState.options.variant === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-700 hover:bg-indigo-800'
                  }`}
                >
                  {alertState.options.buttonText || 'Compris'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOÎTE DE DIALOGUE : PROMPT / SAISIE RAPIDE */}
      {promptState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePromptClose(promptState.value);
              }}
              className="p-6"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {promptState.options.title}
                </h3>
                <button
                  type="button"
                  onClick={() => handlePromptClose(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {promptState.options.message}
              </div>

              <div className="mt-4">
                {promptState.options.inputType === 'textarea' ? (
                  <textarea
                    autoFocus
                    required={promptState.options.required !== false}
                    rows={3}
                    value={promptState.value}
                    onChange={(e) =>
                      setPromptState({ ...promptState, value: e.target.value })
                    }
                    placeholder={promptState.options.placeholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                ) : (
                  <input
                    type={promptState.options.inputType || 'text'}
                    autoFocus
                    required={promptState.options.required !== false}
                    value={promptState.value}
                    onChange={(e) =>
                      setPromptState({ ...promptState, value: e.target.value })
                    }
                    placeholder={promptState.options.placeholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                )}
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => handlePromptClose(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {promptState.options.cancelText || 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {promptState.options.confirmText || 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
