import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  GripVertical,
  Save,
  X,
  Settings2
} from "lucide-react";

interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormFieldEditorProps {
  formId: string;
  formTitle: string;
  fields: FormField[];
  chargePrice: number;
  onUpdate: () => void;
}

export function FormFieldEditor({ formId, formTitle, fields: initialFields, chargePrice, onUpdate }: FormFieldEditorProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editField, setEditField] = useState<FormField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown" },
    { value: "textarea", label: "Long Text" },
    { value: "checkbox", label: "Checkbox" },
  ];

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditField({ ...fields[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditField(null);
  };

  const saveFieldEdit = () => {
    if (!editField || editingIndex === null) return;
    const updated = [...fields];
    updated[editingIndex] = editField;
    setFields(updated);
    cancelEditing();
  };

  const deleteField = (index: number) => {
    if (fields[index].name === "mpesa_code") {
      toast.error("Cannot delete M-Pesa code field - it's required");
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  const addField = () => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      placeholder: ""
    };
    setFields([...fields, newField]);
    setEditingIndex(fields.length);
    setEditField(newField);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= fields.length) return;
    if (fields[fromIndex].name === "mpesa_code" || fields[toIndex].name === "mpesa_code") {
      toast.error("M-Pesa code must remain the first field");
      return;
    }
    const updated = [...fields];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFields(updated);
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("public_forms")
        .update({ 
          schema_json: fields as unknown as any,
          updated_at: new Date().toISOString()
        })
        .eq("id", formId);

      if (error) throw error;
      
      toast.success("Form fields updated");
      onUpdate();
      setIsOpen(false);
    } catch (error: any) {
      toast.error("Failed to save", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Form: {formTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">
            Charge: Ksh {chargePrice} • {fields.length} fields
          </span>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" />
            Add Field
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2 py-2">
            {fields.map((field, index) => (
              <Card 
                key={`${field.name}-${index}`} 
                className={`border ${field.name === "mpesa_code" ? "border-primary/50 bg-primary/5" : "border-border/50"}`}
              >
                <CardContent className="p-3">
                  {editingIndex === index && editField ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={editField.label}
                            onChange={(e) => setEditField({ ...editField, label: e.target.value })}
                            placeholder="Field label"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Field Name</Label>
                          <Input
                            value={editField.name}
                            onChange={(e) => setEditField({ ...editField, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                            placeholder="field_name"
                            disabled={field.name === "mpesa_code"}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={editField.type}
                            onValueChange={(v) => setEditField({ ...editField, type: v })}
                            disabled={field.name === "mpesa_code"}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypes.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={editField.placeholder || ""}
                            onChange={(e) => setEditField({ ...editField, placeholder: e.target.value })}
                            placeholder="Placeholder text"
                          />
                        </div>
                      </div>
                      {editField.type === "select" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Options (comma-separated)</Label>
                          <Input
                            value={editField.options?.join(", ") || ""}
                            onChange={(e) => setEditField({ 
                              ...editField, 
                              options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) 
                            })}
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editField.required}
                            onCheckedChange={(v) => setEditField({ ...editField, required: v })}
                            disabled={field.name === "mpesa_code"}
                          />
                          <Label className="text-xs">Required</Label>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={saveFieldEdit}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{field.label}</span>
                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                          {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                          {field.name === "mpesa_code" && <Badge className="text-xs">System</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{field.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {index > 1 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveField(index, index - 1)}>
                            ↑
                          </Button>
                        )}
                        {index < fields.length - 1 && index > 0 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveField(index, index + 1)}>
                            ↓
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditing(index)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {field.name !== "mpesa_code" && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteField(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={saveAllChanges} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
