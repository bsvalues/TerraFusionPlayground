import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  badgeClassName?: string;
  disabled?: boolean;
  maxItems?: number;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  badgeClassName,
  disabled = false,
  maxItems
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Filter options that aren't already selected
  const filteredOptions = React.useMemo(() => {
    if (!maxItems || selected.length < maxItems) {
      return options.filter(option => !selected.includes(option.value));
    }
    return [];
  }, [options, selected, maxItems]);

  // Map selected values to their corresponding labels
  const selectedLabels = React.useMemo(() => {
    return selected.map(value => {
      const option = options.find(opt => opt.value === value);
      return option ? option.label : value;
    });
  }, [selected, options]);

  // Handle selecting an item
  const handleSelect = React.useCallback(
    (value: string) => {
      if (selected.includes(value)) {
        onChange(selected.filter(item => item !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [onChange, selected]
  );

  // Handle removing an item
  const handleRemove = React.useCallback(
    (value: string) => {
      onChange(selected.filter(item => item !== value));
    },
    [onChange, selected]
  );

  // Handle clearing all selected items
  const handleClear = React.useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "justify-between w-full min-h-10 h-auto",
              disabled && "opacity-70 cursor-not-allowed"
            )}
            onClick={() => !disabled && setOpen(!open)}
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1.5 py-1.5">
              {selected.length === 0 && (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              {selected.length > 0 && (
                <>
                  {selectedLabels.map((label, index) => (
                    <Badge
                      key={selected[index]}
                      variant="secondary"
                      className={cn(
                        "py-1 pl-2 pr-1 flex items-center gap-1",
                        badgeClassName
                      )}
                    >
                      {label}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(selected[index]);
                        }}
                        className="h-4 w-4 p-0 rounded-full"
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </Badge>
                  ))}
                </>
              )}
            </div>
            <div className="flex items-center self-start">
              {selected.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="h-4 w-4 p-0 mr-1 rounded-full opacity-70 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredOptions.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    handleSelect(option.value);
                    // We don't close the popover when selecting so users can select multiple options
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {filteredOptions.length === 0 && selected.length > 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {maxItems && selected.length >= maxItems
                    ? `Maximum of ${maxItems} items selected.`
                    : "All options selected."}
                </div>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}