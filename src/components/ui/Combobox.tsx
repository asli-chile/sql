'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  theme?: 'dark' | 'light';
  allowCustomValue?: boolean; // Nueva prop para permitir valores personalizados
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className = '',
  disabled = false,
  required = false,
  theme = 'dark',
  allowCustomValue = false, // Por defecto false para mantener comportamiento existente
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar inputValue con value cuando cambia externamente
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filtrar opciones cuando cambia el input
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [inputValue, options]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Si allowCustomValue es false y el inputValue no coincide con ninguna opción válida, restaurar el value
        // Si allowCustomValue es true, aceptar el valor personalizado
        if (!allowCustomValue && inputValue && !options.includes(inputValue)) {
          setInputValue(value);
        } else if (allowCustomValue && inputValue) {
          // Aceptar el valor personalizado
          onChange(inputValue);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inputValue, value, options, allowCustomValue, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleSelectOption = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Esperar un tick para permitir clic en opciones antes de cerrar
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && isOpen) {
        // Si hay opciones filtradas, seleccionar la primera
        handleSelectOption(filteredOptions[0]);
      } else if (allowCustomValue && inputValue.trim()) {
        // Si se permiten valores personalizados y hay un valor, aceptarlo
        onChange(inputValue.trim());
        setIsOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Tab' && allowCustomValue && inputValue.trim()) {
      // Al presionar Tab, si se permiten valores personalizados, aceptar el valor actual
      onChange(inputValue.trim());
    }
  };

  const baseStyles =
    theme === 'dark'
      ? 'w-full border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30'
      : 'w-full border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30';

  const dropdownStyles =
    theme === 'dark'
      ? 'absolute z-50 mt-1 w-full border border-slate-800/60 bg-slate-900/95 backdrop-blur-xl max-h-60 overflow-auto'
      : 'absolute z-50 mt-1 w-full border border-gray-300 bg-white max-h-60 overflow-auto';

  const optionStyles =
    theme === 'dark'
      ? 'px-4 py-2 text-base text-slate-200 hover:bg-slate-800/80 cursor-pointer transition-colors'
      : 'px-4 py-2 text-base text-gray-900 hover:bg-gray-100 cursor-pointer transition-colors';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={baseStyles}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-700/50 transition-colors"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className={dropdownStyles}>
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              onMouseDown={(e) => {
                // onBlur del input se dispara antes que onClick; usar onMouseDown
                // garantiza seleccionar la opción antes de que el dropdown se cierre.
                e.preventDefault();
                handleSelectOption(option);
              }}
              className={optionStyles}
              role="option"
              aria-selected={option === value}
            >
              {option}
            </div>
          ))}
        </div>
      )}

      {isOpen && !disabled && filteredOptions.length === 0 && inputValue.trim() !== '' && (
        <div className={dropdownStyles}>
          <div className={`px-4 py-2 text-base ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            {allowCustomValue ? (
              <>
                <span className={theme === 'dark' ? 'text-sky-400' : 'text-blue-600'}>✓</span> Presiona Enter o Tab para usar "<span className="font-semibold">{inputValue}</span>"
              </>
            ) : (
              'No se encontraron resultados'
            )}
          </div>
        </div>
      )}
    </div>
  );
}
