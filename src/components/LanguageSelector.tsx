import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  SPEECH_TO_TEXT_LANGUAGES,
  POPULAR_LANGUAGES,
  DEFAULT_CALL_CENTER_LANGUAGES,
} from '@/lib/speech-languages';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
}

export function LanguageSelector({
  selectedLanguages,
  onLanguagesChange,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get display names for selected languages
  const selectedLanguageNames = useMemo(() => {
    return selectedLanguages
      .map((locale) => {
        const lang = SPEECH_TO_TEXT_LANGUAGES.find((l) => l.locale === locale);
        return lang ? { locale, name: lang.name } : null;
      })
      .filter((l): l is { locale: string; name: string } => l !== null);
  }, [selectedLanguages]);

  // Filter languages based on search
  const filteredLanguages = useMemo(() => {
    if (!searchQuery) return SPEECH_TO_TEXT_LANGUAGES;
    const query = searchQuery.toLowerCase();
    return SPEECH_TO_TEXT_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.locale.toLowerCase().includes(query) ||
        (lang.nativeName && lang.nativeName.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Group languages by popularity
  const popularLanguagesData = useMemo(() => {
    return POPULAR_LANGUAGES.map((locale) =>
      SPEECH_TO_TEXT_LANGUAGES.find((l) => l.locale === locale)
    ).filter((l) => l !== undefined);
  }, []);

  const toggleLanguage = (locale: string) => {
    if (selectedLanguages.includes(locale)) {
      onLanguagesChange(selectedLanguages.filter((l) => l !== locale));
    } else {
      onLanguagesChange([...selectedLanguages, locale]);
    }
  };

  const removeLanguage = (locale: string) => {
    onLanguagesChange(selectedLanguages.filter((l) => l !== locale));
  };

  const setDefaultLanguages = () => {
    onLanguagesChange([...DEFAULT_CALL_CENTER_LANGUAGES]);
  };

  const clearAll = () => {
    onLanguagesChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Transcription Languages
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setDefaultLanguages}
            className="text-xs h-7"
          >
            Use Defaults
          </Button>
          {selectedLanguages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs h-7 text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Selected Languages Display */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
          {selectedLanguageNames.map(({ locale, name }) => (
            <Badge
              key={locale}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-xs">{name}</span>
              <button
                type="button"
                onClick={() => removeLanguage(locale)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Language Picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="text-sm text-gray-600">
              {selectedLanguages.length === 0
                ? 'Select languages...'
                : `${selectedLanguages.length} language${selectedLanguages.length !== 1 ? 's' : ''} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search languages..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>

              {/* Popular Languages */}
              {!searchQuery && (
                <CommandGroup heading="Popular Languages">
                  {popularLanguagesData.map((lang) => {
                    if (!lang) return null;
                    const isSelected = selectedLanguages.includes(lang.locale);
                    return (
                      <CommandItem
                        key={lang.locale}
                        value={lang.locale}
                        onSelect={() => toggleLanguage(lang.locale)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <span>{lang.name}</span>
                          {lang.nativeName && (
                            <span className="text-xs text-gray-500">
                              ({lang.nativeName})
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* All Languages */}
              <CommandGroup
                heading={searchQuery ? 'Search Results' : 'All Languages'}
              >
                {filteredLanguages.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang.locale);
                  return (
                    <CommandItem
                      key={lang.locale}
                      value={lang.locale}
                      onSelect={() => toggleLanguage(lang.locale)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{lang.name}</span>
                        {lang.nativeName && (
                          <span className="text-xs text-gray-500">
                            ({lang.nativeName})
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {lang.locale}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Info Text */}
      <p className="text-xs text-gray-500">
        Select languages for automatic detection during transcription. The more
        languages selected, the longer transcription may take.
      </p>
    </div>
  );
}
