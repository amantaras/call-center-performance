import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Trash, PlayCircle, MinusCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { EvaluationCriterion } from '@/types/call';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';

interface RulesEditorDialogProps {
  onRulesUpdate?: (rules: EvaluationCriterion[]) => void;
}

export function RulesEditorDialog({ onRulesUpdate }: RulesEditorDialogProps) {
  const [customRules, setCustomRules] = useLocalStorage<EvaluationCriterion[]>(
    'evaluation-criteria-custom',
    []
  );

  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<EvaluationCriterion[]>(
    customRules && customRules.length > 0 ? customRules : EVALUATION_CRITERIA
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (customRules && customRules.length > 0) {
      setRules(customRules);
    }
  }, [customRules]);

  useEffect(() => {
    if (open) {
      setSelectedIndex((prev) => {
        if (prev !== null && prev < rules.length) {
          return prev;
        }
        return rules.length > 0 ? 0 : null;
      });
    } else {
      setSelectedIndex(null);
    }
  }, [open, rules.length]);

  const handleSave = () => {
    // Re-assign IDs in order
    const rulesWithIds = rules.map((rule, index) => ({
      ...rule,
      id: index + 1,
    }));
    
    setCustomRules(rulesWithIds);
    onRulesUpdate?.(rulesWithIds);
    toast.success('Evaluation rules saved successfully');
    setOpen(false);
  };

  const handleReset = () => {
    setRules([...EVALUATION_CRITERIA]);
    setSelectedIndex(EVALUATION_CRITERIA.length > 0 ? 0 : null);
    toast.info('Rules reset to defaults');
  };

  const handleAddRule = () => {
    const newRule: EvaluationCriterion = {
      id: rules.length + 1,
      type: 'Must Do',
      name: 'New Rule',
      definition: 'Define the rule here',
      evaluationCriteria: 'Describe how to evaluate this rule',
      scoringStandard: {
        passed: 10,
        failed: 0,
      },
      examples: ['Example 1'],
    };
    setRules([...rules, newRule]);
    setSelectedIndex(rules.length);
  };

  const handleDeleteRule = (index: number) => {
    if (rules.length <= 1) {
      toast.error('Cannot delete the last rule');
      return;
    }
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    const nextIndex = newRules.length > 0 ? Math.min(index, newRules.length - 1) : null;
    setSelectedIndex(nextIndex);
    toast.success('Rule deleted');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRules = [...rules];
    [newRules[index - 1], newRules[index]] = [newRules[index], newRules[index - 1]];
    setRules(newRules);
    setSelectedIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === rules.length - 1) return;
    const newRules = [...rules];
    [newRules[index], newRules[index + 1]] = [newRules[index + 1], newRules[index]];
    setRules(newRules);
    setSelectedIndex(index + 1);
  };

  const handleUpdateRule = (index: number, updates: Partial<EvaluationCriterion>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const selectedRule = selectedIndex !== null ? rules[selectedIndex] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2" size={18} />
          Edit Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[1280px] max-w-[96vw] min-w-[960px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Evaluation Rules</DialogTitle>
          <DialogDescription>
            Customize the quality criteria used to evaluate calls. Changes will apply to
            new evaluations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden pt-2" style={{ height: 'calc(90vh - 200px)' }}>
          <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full flex flex-col gap-3 pr-2 min-w-[360px]">
                <div className="flex items-center justify-between flex-shrink-0">
                  <h3 className="text-sm font-semibold">Rules ({rules.length})</h3>
                  <Button size="sm" variant="ghost" onClick={handleAddRule}>
                    <Plus size={16} />
                  </Button>
                </div>
                <div className="flex-1 border border-border rounded-lg overflow-y-scroll" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                  <div className="p-2 space-y-2">
                    {rules.map((rule, index) => (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-colors ${
                          selectedIndex === index
                            ? 'border-primary bg-accent/50'
                            : 'hover:bg-accent/30'
                        }`}
                        onClick={() => setSelectedIndex(index)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant={rule.type === 'Must Do' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {rule.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {rule.scoringStandard.passed} pts
                                </span>
                              </div>
                              <p className="text-sm font-medium break-words leading-tight">
                                {rule.name}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveUp(index);
                                }}
                                disabled={index === 0}
                              >
                                <PlayCircle size={12} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveDown(index);
                                }}
                                disabled={index === rules.length - 1}
                              >
                                <MinusCircle size={12} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border" />
            <ResizablePanel defaultSize={60} minSize={50}>
              <div className="h-full pl-1 min-w-[520px]">
                {selectedRule ? (
                  <ScrollArea className="h-full border border-border rounded-lg p-4 overflow-auto">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold">
                          Rule #{selectedIndex! + 1} Details
                        </h3>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRule(selectedIndex!)}
                        >
                          <Trash size={16} className="mr-2" />
                          Delete
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="rule-type">Type</Label>
                          <select
                            id="rule-type"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={selectedRule.type}
                            onChange={(e) =>
                              handleUpdateRule(selectedIndex!, {
                                type: e.target.value as 'Must Do' | 'Must Not Do',
                              })
                            }
                          >
                            <option value="Must Do">Must Do</option>
                            <option value="Must Not Do">Must Not Do</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rule-name">Rule Name</Label>
                          <Input
                            id="rule-name"
                            value={selectedRule.name}
                            onChange={(e) =>
                              handleUpdateRule(selectedIndex!, { name: e.target.value })
                            }
                            placeholder="Short, descriptive name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rule-definition">Definition</Label>
                          <Textarea
                            id="rule-definition"
                            value={selectedRule.definition}
                            onChange={(e) =>
                              handleUpdateRule(selectedIndex!, { definition: e.target.value })
                            }
                            placeholder="What does this rule mean?"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rule-criteria">Evaluation Criteria</Label>
                          <Textarea
                            id="rule-criteria"
                            value={selectedRule.evaluationCriteria}
                            onChange={(e) =>
                              handleUpdateRule(selectedIndex!, {
                                evaluationCriteria: e.target.value,
                              })
                            }
                            placeholder="How should this be evaluated?"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="rule-passed">Points (Passed)</Label>
                            <Input
                              id="rule-passed"
                              type="number"
                              min="0"
                              max="100"
                              value={selectedRule.scoringStandard.passed}
                              onChange={(e) =>
                                handleUpdateRule(selectedIndex!, {
                                  scoringStandard: {
                                    ...selectedRule.scoringStandard,
                                    passed: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rule-partial">Points (Partial)</Label>
                            <Input
                              id="rule-partial"
                              type="number"
                              min="0"
                              max="100"
                              value={selectedRule.scoringStandard.partial || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || undefined;
                                handleUpdateRule(selectedIndex!, {
                                  scoringStandard: {
                                    ...selectedRule.scoringStandard,
                                    partial: value && value > 0 ? value : undefined,
                                  },
                                });
                              }}
                              placeholder="Optional"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rule-failed">Points (Failed)</Label>
                            <Input
                              id="rule-failed"
                              type="number"
                              min="0"
                              max="100"
                              value={selectedRule.scoringStandard.failed}
                              onChange={(e) =>
                                handleUpdateRule(selectedIndex!, {
                                  scoringStandard: {
                                    ...selectedRule.scoringStandard,
                                    failed: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rule-examples">Examples (one per line)</Label>
                          <Textarea
                            id="rule-examples"
                            value={selectedRule.examples.join('\n')}
                            onChange={(e) =>
                              handleUpdateRule(selectedIndex!, {
                                examples: e.target.value
                                  .split('\n')
                                  .filter((line) => line.trim()),
                              })
                            }
                            placeholder="Example 1&#10;Example 2&#10;Example 3"
                            rows={5}
                          />
                          <p className="text-xs text-muted-foreground">
                            {selectedRule.examples.length} example(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center text-muted-foreground">
                      <Upload size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Select a rule from the list to edit</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="space-x-2">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <span className="text-sm text-muted-foreground">
              Total: {rules.reduce((sum, r) => sum + r.scoringStandard.passed, 0)} points
            </span>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Rules</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
