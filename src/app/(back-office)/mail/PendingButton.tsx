"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  pendingLabel,
  className,
}: {
  children: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
