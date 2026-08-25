import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X } from "lucide-react";

export interface ComboBoxOption {
  value: string;
  label?: string;
  hint?: string;
}

export interface ComboBoxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | ComboBoxOption)[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  uppercase?: boolean;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  allowClear?: boolean;
}

export const ComboBox: React.FC<ComboBoxProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = "Selecione ou digite...",
  className = "",
  inputClassName = "",
  uppercase = true,
  required = false,
  disabled = false,
  name,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to { value, label, hint }
  const normalizedOptions = useMemo<ComboBoxOption[]>(() => {
    const list: ComboBoxOption[] = [];
    const seen = new Set<string>();

    options.forEach((opt) => {
      if (!opt) return;
      const val = typeof opt === "string" ? opt : opt.value;
      const label = typeof opt === "string" ? opt : (opt.label || opt.value);
      const hint = typeof opt === "string" ? undefined : opt.hint;

      if (val && !seen.has(val.toUpperCase())) {
        seen.add(val.toUpperCase());
        list.push({ value: val, label, hint });
      }
    });

    return list;
  }, [options]);

  // Filtered options:
  // If searchQuery is set (user is actively typing), filter by searchQuery.
  // If searchQuery is null (user clicked chevron / opened menu), show ALL options.
  const displayedOptions = useMemo(() => {
    if (searchQuery === null || searchQuery === "") {
      return normalizedOptions;
    }
    const cleanSearch = searchQuery.trim().toLowerCase();
    return normalizedOptions.filter((opt) => {
      const v = opt.value.toLowerCase();
      const l = (opt.label || "").toLowerCase();
      const h = (opt.hint || "").toLowerCase();
      return v.includes(cleanSearch) || l.includes(cleanSearch) || h.includes(cleanSearch);
    });
  }, [normalizedOptions, searchQuery]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (uppercase) val = val.toUpperCase();
    onChange(val);
    setSearchQuery(val);
    setIsOpen(true);
  };

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (!isOpen) {
      // Open with ALL options shown (searchQuery = null)
      setSearchQuery(null);
      setIsOpen(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setIsOpen(false);
      setSearchQuery(null);
    }
  };

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    setSearchQuery(null);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            // Do not immediately filter; let user see full list or keep typed query
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              setSearchQuery(null);
            } else if (e.key === "ArrowDown" && !isOpen) {
              e.preventDefault();
              setSearchQuery(null);
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pr-14 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors ${
            uppercase ? "uppercase" : ""
          } ${inputClassName}`}
        />

        <div className="absolute right-1 flex items-center gap-0.5">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Limpar campo"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleDropdown}
            disabled={disabled}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ${
              isOpen ? "text-emerald-400 bg-slate-800" : "hover:bg-slate-800/60"
            }`}
            title="Abrir lista de opções"
            tabIndex={-1}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-emerald-400" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {displayedOptions.length === 0 ? (
            <div className="p-3 text-center text-slate-400 text-[11px]">
              {searchQuery ? (
                <>
                  Nenhuma sugestão encontrada para &ldquo;<span className="text-white font-medium">{searchQuery}</span>&rdquo;.
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    O valor digitado será salvo normalmente.
                  </span>
                </>
              ) : (
                "Nenhuma opção cadastrada."
              )}
            </div>
          ) : (
            <div className="p-1 divide-y divide-slate-800/50">
              {displayedOptions.map((opt) => {
                const isSelected =
                  String(value || "").trim().toUpperCase() ===
                  String(opt.value || "").trim().toUpperCase();

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectOption(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/20"
                        : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex flex-col">
                      <span className="truncate">{opt.label || opt.value}</span>
                      {opt.hint && (
                        <span className="text-[10px] text-slate-500 truncate">{opt.hint}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
