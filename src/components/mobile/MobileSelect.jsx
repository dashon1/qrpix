import React, { useState, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/**
 * MobileSelect - renders as a bottom drawer on mobile, regular Select on desktop.
 * 
 * Props:
 *  - value: current value
 *  - onValueChange: callback when value changes
 *  - placeholder: placeholder text
 *  - label: optional label for the drawer header
 *  - options: array of { value, label } objects
 *  - className: optional className for trigger
 *  - triggerClassName: optional className for trigger button
 */
export default function MobileSelect({ value, onValueChange, placeholder, label, options = [], className, triggerClassName }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedOption = options.find(o => o.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("tap-target", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerTrigger asChild>
        <button
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm tap-target",
            !selectedOption && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="line-clamp-1">{selectedOption?.label || placeholder || "Select..."}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{label || placeholder || "Select an option"}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto">
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => {
                onValueChange(option.value);
                setDrawerOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 rounded-lg text-left tap-target transition-colors",
                value === option.value
                  ? "bg-purple-100 text-purple-900 font-medium"
                  : "hover:bg-gray-100 active:bg-gray-200"
              )}
            >
              <span className="text-base">{option.label}</span>
              {value === option.value && (
                <Check className="h-5 w-5 text-purple-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}