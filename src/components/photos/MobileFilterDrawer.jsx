import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

export default function MobileFilterDrawer({ filters, activeFilter, onFilterChange }) {
  const [open, setOpen] = React.useState(false);

  const activeLabel = filters.find(f => f.value === activeFilter)?.label || "All";

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 md:hidden">
          <Filter className="w-4 h-4" />
          {activeLabel}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter Photos</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                onFilterChange(filter.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                activeFilter === filter.value
                  ? "bg-purple-100 text-purple-700 font-semibold"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <filter.icon className="w-5 h-5" />
              <span>{filter.label}</span>
              {activeFilter === filter.value && (
                <span className="ml-auto text-purple-600">✓</span>
              )}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}