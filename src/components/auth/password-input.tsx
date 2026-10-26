"use client";

import { useId, useState, type ComponentProps } from "react";
import { EyeIcon, EyeClosedIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PasswordInput({
  id,
  disabled,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";
  const Icon = visible ? EyeClosedIcon : EyeIcon;

  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        id={inputId}
        type={visible ? "text" : "password"}
        disabled={disabled}
      />
      <InputGroupAddon>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={label}
                aria-controls={inputId}
                aria-pressed={visible}
                disabled={disabled}
                onClick={() => setVisible(!visible)}
              />
            }
          >
            <Icon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
}
