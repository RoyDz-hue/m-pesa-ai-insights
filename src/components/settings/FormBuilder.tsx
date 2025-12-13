import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormFieldEditor } from "./FormFieldEditor";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  FileText, 
  Trash2, 
  Globe, 
  Copy,
  ExternalLink
} from "lucide-react";

interface FormSchema {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

interface FormRules {
  beneficiary_tiers?: { min_amount: number; max_beneficiaries: number }[];
  allow_tip?: boolean;
  beneficiary_fields?: FormSchema[];
}

interface PublicForm {
  id: string;
  title: string;
  description: string | null;
  charge_price: number;
  schema_json: FormSchema[];
  rules_json: FormRules;
  status: "draft" | "published";
  public_slug: string | null;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  form?: PublicForm;
}

export function FormBuilder() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I can help you create payment confirmation forms. Describe the form you need, including:\n\n• What the payment is for\n• The cost (in Ksh)\n• Any beneficiary rules (optional)\n• Whether tips are allowed\n\nFor example: \"Create a form for attachment letter payment. Cost is Ksh 20. If someone pays Ksh 50, they can add 1 beneficiary.\""
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from("public_forms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Type assertion since DB returns Json type
      setForms((data || []).map(f => ({
        ...f,
        schema_json: f.schema_json as unknown as FormSchema[],
        rules_json: f.rules_json as unknown as FormRules,
        status: f.status as "draft" | "published"
      })));
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoadingForms(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-form-builder", {
        body: { message: userMessage }
      });

      if (error) throw error;

      const form = data.form as PublicForm;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message || "Form created successfully!",
        form: {
          ...form,
          schema_json: form.schema_json as unknown as FormSchema[],
          rules_json: form.rules_json as unknown as FormRules
        }
      }]);

      await fetchForms();
    } catch (error: any) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const publishForm = async (formId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("publish-form", {
        body: { formId, action: "publish" }
      });

      if (error) throw error;

      toast.success("Form published!", {
        description: `Public link: ${window.location.origin}${data.publicUrl}`
      });
      await fetchForms();
    } catch (error: any) {
      toast.error("Failed to publish form", { description: error.message });
    }
  };

  const deleteForm = async (formId: string) => {
    try {
      const { error } = await supabase.functions.invoke("publish-form", {
        body: { formId, action: "delete" }
      });

      if (error) throw error;

      toast.success("Form deleted");
      await fetchForms();
    } catch (error: any) {
      toast.error("Failed to delete form", { description: error.message });
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* AI Chat */}
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Form Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 pt-0">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "order-first" : ""}`}>
                    <div className={`rounded-lg px-4 py-2 ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.form && (
                      <Card className="border-primary/20">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{msg.form.title}</span>
                            <Badge variant={msg.form.status === "published" ? "default" : "secondary"}>
                              {msg.form.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Charge: Ksh {msg.form.charge_price}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {msg.form.schema_json?.map((field, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {field.label}
                              </Badge>
                            ))}
                          </div>
                          {msg.form.rules_json?.beneficiary_tiers?.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Beneficiary tiers: {msg.form.rules_json.beneficiary_tiers.length}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm text-muted-foreground">Creating your form...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Describe your form..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={isLoading}
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forms List */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-4 pt-0">
          <ScrollArea className="h-full">
            {loadingForms ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No forms yet. Use the AI chat to create one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => (
                  <Card key={form.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{form.title}</h4>
                            <Badge variant={form.status === "published" ? "default" : "secondary"} className="flex-shrink-0">
                              {form.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Ksh {form.charge_price}
                          </p>
                          {form.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {form.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {form.status === "draft" && (
                            <FormFieldEditor
                              formId={form.id}
                              formTitle={form.title}
                              fields={form.schema_json}
                              chargePrice={form.charge_price}
                              onUpdate={fetchForms}
                            />
                          )}
                          {form.status === "draft" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => publishForm(form.id)}
                            >
                              <Globe className="h-4 w-4 mr-1" />
                              Publish
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => copyLink(form.public_slug!)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                asChild
                              >
                                <a href={`/form/${form.public_slug}`} target="_blank">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteForm(form.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
