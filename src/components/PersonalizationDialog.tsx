/**
 * Personalization Dialog Component
 * Allows users to customize theme, branding, and appearance
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Palette,
  Image,
  TextAa,
  Moon,
  Sun,
  Check,
  Trash,
  Upload,
  Eye,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  PersonalizationSettings,
  ColorPalette,
  COLOR_PALETTES,
  loadPersonalizationSettings,
  savePersonalizationSettings,
  loadSchemaPersonalization,
  saveSchemaPersonalization,
  getSchemaPersonalizationDefaults,
  applyColorPalette,
  applyDarkMode,
  getColorPalette,
  fileToBase64,
} from '@/lib/personalization';
import { SchemaDefinition } from '@/types/schema';

interface PersonalizationDialogProps {
  activeSchema?: SchemaDefinition | null;
  onSettingsChange?: (settings: PersonalizationSettings) => void;
}

export function PersonalizationDialog({ activeSchema, onSettingsChange }: PersonalizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<PersonalizationSettings>(() => 
    activeSchema 
      ? loadSchemaPersonalization(activeSchema.id, activeSchema.name)
      : loadPersonalizationSettings()
  );
  const [previewSettings, setPreviewSettings] = useState<PersonalizationSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload settings when schema changes
  useEffect(() => {
    if (activeSchema) {
      const loaded = loadSchemaPersonalization(activeSchema.id, activeSchema.name);
      setSettings(loaded);
      setPreviewSettings(loaded);
    } else {
      const loaded = loadPersonalizationSettings();
      setSettings(loaded);
      setPreviewSettings(loaded);
    }
  }, [activeSchema?.id]);

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      const loaded = activeSchema 
        ? loadSchemaPersonalization(activeSchema.id, activeSchema.name)
        : loadPersonalizationSettings();
      setSettings(loaded);
      setPreviewSettings(loaded);
    }
  }, [open, activeSchema?.id]);

  // Preview changes in real-time
  useEffect(() => {
    if (open) {
      const palette = getColorPalette(previewSettings.colorPaletteId);
      if (palette) {
        applyColorPalette(palette);
      }
      applyDarkMode(previewSettings.darkMode);
    }
  }, [open, previewSettings.colorPaletteId, previewSettings.darkMode]);

  const handleSave = () => {
    // Save to schema-specific storage if schema is active
    if (activeSchema) {
      saveSchemaPersonalization(activeSchema.id, previewSettings);
    } else {
      savePersonalizationSettings(previewSettings);
    }
    setSettings(previewSettings);
    onSettingsChange?.(previewSettings);
    toast.success(activeSchema 
      ? `Personalization saved for ${activeSchema.name}`
      : 'Personalization settings saved'
    );
    setOpen(false);
  };

  const handleCancel = () => {
    // Restore original settings
    const palette = getColorPalette(settings.colorPaletteId);
    if (palette) {
      applyColorPalette(palette);
    }
    applyDarkMode(settings.darkMode);
    setPreviewSettings(settings);
    setOpen(false);
  };

  const handleReset = () => {
    // Reset to schema-specific defaults if available
    const schemaDefaults = activeSchema 
      ? getSchemaPersonalizationDefaults(activeSchema.id, activeSchema.name)
      : {};
    
    const defaultSettings: PersonalizationSettings = {
      appTitle: schemaDefaults.appTitle || 'Call Center QA Platform',
      appSubtitle: schemaDefaults.appSubtitle || 'AI-powered call quality evaluation and analytics',
      logoUrl: null,
      logoBase64: null,
      colorPaletteId: schemaDefaults.colorPaletteId || 'ocean-blue',
      darkMode: false,
      compactMode: false,
    };
    setPreviewSettings(defaultSettings);
    toast.info(activeSchema 
      ? `Settings reset to ${activeSchema.name} defaults`
      : 'Settings reset to defaults'
    );
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setPreviewSettings(prev => ({
        ...prev,
        logoBase64: base64,
        logoUrl: null,
      }));
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error('Failed to upload logo');
      console.error(error);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewSettings(prev => ({
      ...prev,
      logoBase64: null,
      logoUrl: null,
    }));
  };

  const PaletteCard = ({ palette, isSelected, onClick }: { 
    palette: ColorPalette; 
    isSelected: boolean; 
    onClick: () => void;
  }) => (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Color preview swatches */}
          <div className="flex gap-1">
            <div
              className="w-6 h-6 rounded-full border border-border"
              style={{ backgroundColor: palette.preview.primary }}
            />
            <div
              className="w-6 h-6 rounded-full border border-border"
              style={{ backgroundColor: palette.preview.secondary }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{palette.name}</span>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </div>
            <span className="text-xs text-muted-foreground">{palette.description}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleCancel();
      } else {
        setOpen(true);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Personalization">
          <Palette className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personalization
            {activeSchema && (
              <Badge variant="outline" className="ml-2 font-normal">
                {activeSchema.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {activeSchema 
              ? `Customize theme and branding for the "${activeSchema.name}" schema`
              : 'Customize the appearance and branding of your application'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <TextAa className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="logo" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Logo
            </TabsTrigger>
          </TabsList>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Dark Mode Toggle */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {previewSettings.darkMode ? (
                        <Moon className="h-5 w-5" />
                      ) : (
                        <Sun className="h-5 w-5" />
                      )}
                      <div>
                        <Label className="font-medium">Dark Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Switch between light and dark themes
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={previewSettings.darkMode}
                      onCheckedChange={(checked) =>
                        setPreviewSettings(prev => ({ ...prev, darkMode: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Color Palettes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color Palette</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose a color scheme that matches your brand
                </p>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="grid grid-cols-2 gap-3">
                    {COLOR_PALETTES.map(palette => (
                      <PaletteCard
                        key={palette.id}
                        palette={palette}
                        isSelected={previewSettings.colorPaletteId === palette.id}
                        onClick={() =>
                          setPreviewSettings(prev => ({ ...prev, colorPaletteId: palette.id }))
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appTitle">Application Title</Label>
                <Input
                  id="appTitle"
                  value={previewSettings.appTitle}
                  onChange={(e) =>
                    setPreviewSettings(prev => ({ ...prev, appTitle: e.target.value }))
                  }
                  placeholder="My Application"
                />
                <p className="text-xs text-muted-foreground">
                  The main title shown in the header
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appSubtitle">Subtitle / Tagline</Label>
                <Input
                  id="appSubtitle"
                  value={previewSettings.appSubtitle}
                  onChange={(e) =>
                    setPreviewSettings(prev => ({ ...prev, appSubtitle: e.target.value }))
                  }
                  placeholder="Your tagline here"
                />
                <p className="text-xs text-muted-foreground">
                  A short description shown below the title
                </p>
              </div>

              <Separator />

              {/* Preview */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Label>
                <Card className="bg-card border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {(previewSettings.logoBase64 || previewSettings.logoUrl) && (
                        <img
                          src={previewSettings.logoBase64 || previewSettings.logoUrl || ''}
                          alt="Logo"
                          className="h-12 w-auto object-contain"
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-bold">
                          {previewSettings.appTitle || 'Application Title'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {previewSettings.appSubtitle || 'Your subtitle here'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Logo Tab */}
          <TabsContent value="logo" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Logo Image</Label>
                <p className="text-xs text-muted-foreground">
                  Upload a logo to display in the header (PNG, JPG, or SVG recommended)
                </p>
              </div>

              {/* Current Logo Preview */}
              {(previewSettings.logoBase64 || previewSettings.logoUrl) ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <img
                            src={previewSettings.logoBase64 || previewSettings.logoUrl || ''}
                            alt="Current logo"
                            className="h-16 w-auto object-contain max-w-[200px]"
                          />
                        </div>
                        <div>
                          <p className="font-medium">Current Logo</p>
                          <p className="text-xs text-muted-foreground">
                            Click "Remove" to delete
                          </p>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={handleRemoveLogo}>
                        <Trash className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="p-4 bg-muted rounded-full mb-4">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium mb-1">No logo uploaded</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload an image to display your brand
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />

              {(previewSettings.logoBase64 || previewSettings.logoUrl) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace Logo
                </Button>
              )}

              <Separator />

              {/* URL Input Alternative */}
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Or enter a URL</Label>
                <Input
                  id="logoUrl"
                  value={previewSettings.logoUrl || ''}
                  onChange={(e) =>
                    setPreviewSettings(prev => ({
                      ...prev,
                      logoUrl: e.target.value || null,
                      logoBase64: e.target.value ? null : prev.logoBase64,
                    }))
                  }
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a direct link to your logo image
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
