"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  pendingLabel,
  className,
  formAction,
}: {
  children: string;
  pendingLabel: string;
  className: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} formAction={formAction}>
      {pending ? pendingLabel : children}
    </button>
  );
}
