/**
 * Schema Template Selector Component
 * Compact template selector with list and preview
 */

import React, { useState } from 'react';
import { 
  getAllTemplates, 
  getCustomTemplates, 
  deleteCustomTemplate,
  createSchemaFromTemplate,
  SchemaTemplate,
} from '@/lib/schema-templates';
import { SchemaDefinition, SchemaEvaluationRule } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Building2, 
  HeadphonesIcon, 
  TrendingUp, 
  Stethoscope, 
  Star,
  Trash2,
  Check,
  FileText,
  Scale,
  Tag,
  Info,
  Plane,
  Phone
} from 'lucide-react';

interface SchemaTemplateSelectorProps {
  onSelectTemplate: (
    schema: SchemaDefinition, 
    rules: Omit<SchemaEvaluationRule, 'id'>[],
    templateName: string
  ) => void;
  onCancel: () => void;
  currentTemplateId?: string;
}

export function SchemaTemplateSelector({ 
  onSelectTemplate, 
  currentTemplateId 
}: SchemaTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SchemaTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom'>('builtin');
  
  const builtinTemplates = getAllTemplates().filter(t => !t.isCustom);
  const customTemplates = getCustomTemplates();
  
  const getTemplateIcon = (template: SchemaTemplate) => {
    switch (template.industry) {
      case 'debt-collection':
        return <Building2 className="h-5 w-5" />;
      case 'customer-support':
        return <HeadphonesIcon className="h-5 w-5" />;
      case 'sales':
        return <TrendingUp className="h-5 w-5" />;
      case 'healthcare':
        return <Stethoscope className="h-5 w-5" />;
      case 'airline':
        return <Plane className="h-5 w-5" />;
      case 'telecom':
        return <Phone className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };
  
  const handleSelectTemplate = () => {
    if (!selectedTemplate) return;
    const schema = createSchemaFromTemplate(selectedTemplate);
    onSelectTemplate(schema, selectedTemplate.evaluationRules, selectedTemplate.name);
  };
  
  const handleDeleteCustomTemplate = (templateId: string) => {
    deleteCustomTemplate(templateId);
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
    setActiveTab('builtin');
    setTimeout(() => setActiveTab('custom'), 0);
  };

  // Compact template list item
  const TemplateItem = ({ template, isSelected, onClick }: { 
    template: SchemaTemplate; 
    isSelected: boolean; 
    onClick: () => void;
  }) => (
    <div 
      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all ${
        isSelected 
          ? 'bg-primary/10 border border-primary' 
          : 'hover:bg-muted border border-transparent'
      }`}
      onClick={onClick}
    >
      <div className={`p-1.5 rounded shrink-0 ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
        {getTemplateIcon(template)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>{template.icon}</span>
          <span className="font-medium text-sm">{template.name}</span>
          <span className="text-[10px] text-muted-foreground">v{template.version}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{template.description}</p>
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </div>
  );
  
  // Preview panel content
  const TemplatePreview = ({ template }: { template: SchemaTemplate }) => (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{template.icon}</span>
        <h3 className="font-semibold">{template.name}</h3>
        <Badge variant="outline" className="text-[10px]">v{template.version}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{template.previewDescription}</p>
      
      {/* Business Context */}
      <div>
        <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
          <Info className="h-3 w-3" /> Business Context
        </h4>
        <p className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded">
          {template.schema.businessContext}
        </p>
      </div>
      
      {/* Fields */}
      <div>
        <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
          <FileText className="h-3 w-3" /> Fields ({template.schema.fields.length})
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {template.schema.fields.slice(0, 6).map(field => (
            <div key={field.id} className="text-[11px] bg-muted/50 rounded px-1.5 py-0.5 flex justify-between">
              <span className="truncate">{field.displayName}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">{field.type}</Badge>
            </div>
          ))}
        </div>
        {template.schema.fields.length > 6 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">+{template.schema.fields.length - 6} more...</p>
        )}
      </div>
      
      {/* Rules */}
      <div>
        <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
          <Scale className="h-3 w-3" /> Evaluation Rules ({template.evaluationRules.length})
        </h4>
        <div className="space-y-0.5">
          {template.evaluationRules.slice(0, 4).map((rule, idx) => (
            <div key={idx} className="text-[11px] bg-muted/50 rounded px-1.5 py-0.5 flex items-center gap-1">
              <Badge variant={rule.type === 'Must Do' ? 'default' : 'destructive'} className="text-[8px] px-1 py-0">
                {rule.type}
              </Badge>
              <span className="truncate">{rule.name}</span>
            </div>
          ))}
        </div>
        {template.evaluationRules.length > 4 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">+{template.evaluationRules.length - 4} more...</p>
        )}
      </div>
      
      {/* Topics */}
      {template.schema.topicTaxonomy && template.schema.topicTaxonomy.length > 0 && (
        <div>
          <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Topic Taxonomy ({template.schema.topicTaxonomy.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {template.schema.topicTaxonomy.slice(0, 5).map(topic => (
              <Badge key={topic.id} variant="outline" className="text-[10px] px-1.5 py-0" 
                style={{ borderColor: topic.color, color: topic.color }}>
                {topic.name}
              </Badge>
            ))}
            {template.schema.topicTaxonomy.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{template.schema.topicTaxonomy.length - 5}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex gap-3 h-[380px]">
      {/* Left: Template List */}
      <div className="w-[320px] shrink-0 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'builtin' | 'custom')} className="flex-1 flex flex-col">
          <TabsList className="w-full h-7 mb-2">
            <TabsTrigger value="builtin" className="flex-1 text-[10px] h-6">Industry Templates</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1 text-[10px] h-6">My Templates ({customTemplates.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="builtin" className="flex-1 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1 pr-2">
                {builtinTemplates.map(template => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onClick={() => setSelectedTemplate(template)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="custom" className="flex-1 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-[300px]">
              {customTemplates.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Star className="h-5 w-5 mx-auto mb-1 opacity-50" />
                  <p className="text-[11px]">No custom templates</p>
                </div>
              ) : (
                <div className="space-y-1 pr-2">
                  {customTemplates.map(template => (
                    <div key={template.id} className="relative group">
                      <TemplateItem
                        template={template}
                        isSelected={selectedTemplate?.id === template.id}
                        onClick={() => setSelectedTemplate(template)}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" 
                            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{template.name}"?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCustomTemplate(template.id)} className="bg-destructive">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <Button onClick={handleSelectTemplate} disabled={!selectedTemplate} size="sm" className="mt-2">
          Apply Template
        </Button>
      </div>
      
      {/* Right: Preview */}
      <div className="flex-1 border-l pl-3 overflow-hidden">
        {selectedTemplate ? (
          <ScrollArea className="h-full pr-2">
            <TemplatePreview template={selectedTemplate} />
          </ScrollArea>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p className="text-xs">Select a template to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
