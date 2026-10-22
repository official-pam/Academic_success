'use client';
import { useFormStatus } from 'react-dom';
import { useHydrated } from '@/components/useHydrated';

export function SubmitButton({ children, pendingLabel = 'Saving…', className = 'btn btn-primary', name, value, ...rest }) {
  const { pending } = useFormStatus();
  // Until the page is interactive a tap would bypass validation messages, so wait for hydration.
  const ready = useHydrated();
  const disabled = pending || !ready;
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-disabled={disabled}
      className={className}
      // A submitter's name/value can be dropped on a fast double tap, so copy it into a hidden
      // field on the form first; every submission then carries the same intent.
      onClick={name ? (e) => {
        const form = e.currentTarget.form;
        let field = form?.querySelector(`input[type=hidden][name="${name}"]`);
        if (form && !field) {
          field = document.createElement('input');
          field.type = 'hidden';
          field.name = name;
          form.appendChild(field);
        }
        if (field) field.value = value;
      } : undefined}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state }) {
  if (!state?.message) return <div aria-live="polite" />;
  const tone = state.ok ? 'bg-sage-wash text-sage-ink' : 'bg-danger-wash text-danger';
  return (
    <div aria-live="polite" role={state.ok ? 'status' : 'alert'} className={`rounded-md px-3 py-2 text-sm ${tone}`}>
      {state.message}
    </div>
  );
}

export function FieldError({ state, name }) {
  const msg = state?.errors?.[name];
  if (!msg) return null;
  return <p id={`${name}-error`} className="field-error">{msg}</p>;
}

export const invalid = (state, name) =>
  state?.errors?.[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {};
