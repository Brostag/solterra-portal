"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  defaultValue: string;
  options: Option[];
  id?: string;
  placeholder?: string;
}

export function SelectField({
  name,
  defaultValue,
  options,
  id,
  placeholder,
}: SelectFieldProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={(v) => { if (v) setValue(v); }}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
