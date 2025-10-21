"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

type FormSubmitButtonProps = ButtonProps & {
  pendingLabel: string;
};

export function FormSubmitButton({
  className,
  pendingLabel,
  disabled,
  children,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button className={className} disabled={pending || disabled} {...props}>
      {pending ? (
        <React.Fragment>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingLabel}
        </React.Fragment>
      ) : (
        children
      )}
    </Button>
  );
}
