import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  CreditCard,
  Users,
  Gift
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

interface PublicFormData {
  id: string;
  title: string;
  description: string | null;
  charge_price: number;
  schema_json: FormSchema[];
  rules_json: FormRules;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  transactionId?: string;
  amount?: number;
  chargePrice?: number;
  excessAmount?: number;
  maxBeneficiaries?: number;
  allowTip?: boolean;
  beneficiaryFields?: FormSchema[];
}

interface Beneficiary {
  beneficiary_name: string;
  beneficiary_admission: string;
}

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<PublicFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [markAsTip, setMarkAsTip] = useState(false);
  
  // Validation state
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchForm();
  }, [slug]);

  const fetchForm = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("public_forms")
        .select("id, title, description, charge_price, schema_json, rules_json")
        .eq("public_slug", slug)
        .eq("status", "published")
        .single();

      if (fetchError || !data) {
        setError("Form not found or no longer available.");
        return;
      }

      setForm({
        ...data,
        schema_json: data.schema_json as unknown as FormSchema[],
        rules_json: data.rules_json as unknown as FormRules
      });
    } catch (e) {
      setError("Failed to load form.");
    } finally {
      setLoading(false);
    }
  };

  const validateMpesaCode = async () => {
    if (!mpesaCode.trim() || !form) return;

    setValidating(true);
    setValidation(null);

    try {
      const { data, error: valError } = await supabase.functions.invoke("validate-mpesa-code", {
        body: { mpesaCode: mpesaCode.trim(), formId: form.id }
      });

      if (valError) throw valError;

      setValidation(data);
      
      if (data.valid) {
        toast.success("Transaction verified!", {
          description: `Amount: Ksh ${data.amount}`
        });
      } else {
        toast.error("Validation failed", {
          description: data.error
        });
      }
    } catch (e: any) {
      setValidation({ valid: false, error: e.message });
      toast.error("Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const addBeneficiary = () => {
    if (!validation || beneficiaries.length >= (validation.maxBeneficiaries || 0)) return;
    setBeneficiaries([...beneficiaries, { beneficiary_name: "", beneficiary_admission: "" }]);
  };

  const removeBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
    const updated = [...beneficiaries];
    updated[index][field] = value;
    setBeneficiaries(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !validation?.valid) return;

    // Validate beneficiaries
    for (const ben of beneficiaries) {
      if (!ben.beneficiary_name.trim() || !ben.beneficiary_admission.trim()) {
        toast.error("Please fill all beneficiary fields");
        return;
      }
    }

    setSubmitting(true);

    try {
      const tipAmount = markAsTip && validation.excessAmount ? validation.excessAmount : 0;

      const { data, error: submitError } = await supabase.functions.invoke("submit-public-form", {
        body: {
          formId: form.id,
          name: name.trim(),
          admissionNumber: admissionNumber.trim(),
          mpesaCode: mpesaCode.trim(),
          beneficiaries,
          tipAmount
        }
      });

      if (submitError) throw submitError;

      if (data.success) {
        setSubmitted(true);
        setSuccessMessage(data.message);
      } else {
        toast.error("Submission failed", { description: data.error });
      }
    } catch (e: any) {
      toast.error("Submission failed", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">{error || "This form is no longer available."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Submission Successful!</h2>
            <p className="text-muted-foreground">{successMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{form.title}</CardTitle>
            {form.description && (
              <CardDescription>{form.description}</CardDescription>
            )}
            <div className="flex items-center justify-center gap-2 mt-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-lg font-semibold text-primary">
                Ksh {form.charge_price}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admission">Admission Number *</Label>
                  <Input
                    id="admission"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="Enter your admission number"
                    required
                  />
                </div>
              </div>

              <Separator />

              {/* M-PESA Verification */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mpesa">M-PESA Transaction Code *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mpesa"
                      value={mpesaCode}
                      onChange={(e) => {
                        setMpesaCode(e.target.value.toUpperCase());
                        setValidation(null);
                      }}
                      placeholder="e.g., RBK1234567"
                      className="flex-1"
                      required
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={validateMpesaCode}
                      disabled={validating || !mpesaCode.trim()}
                    >
                      {validating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </div>

                {validation && (
                  <div className={`p-3 rounded-lg ${
                    validation.valid 
                      ? "bg-green-500/10 border border-green-500/20" 
                      : "bg-destructive/10 border border-destructive/20"
                  }`}>
                    {validation.valid ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">Transaction Verified</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>Amount Paid: <strong>Ksh {validation.amount}</strong></p>
                          {validation.excessAmount! > 0 && (
                            <p className="text-muted-foreground">
                              Excess: Ksh {validation.excessAmount}
                            </p>
                          )}
                          {validation.maxBeneficiaries! > 0 && (
                            <p className="text-muted-foreground">
                              You can add up to {validation.maxBeneficiaries} beneficiaries
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validation.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Beneficiaries Section */}
              {validation?.valid && validation.maxBeneficiaries! > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <Label>Beneficiaries (Optional)</Label>
                      </div>
                      {beneficiaries.length < validation.maxBeneficiaries! && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addBeneficiary}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>

                    {beneficiaries.map((ben, index) => (
                      <Card key={index} className="border-dashed">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder="Beneficiary name"
                                value={ben.beneficiary_name}
                                onChange={(e) => updateBeneficiary(index, "beneficiary_name", e.target.value)}
                              />
                              <Input
                                placeholder="Beneficiary admission number"
                                value={ben.beneficiary_admission}
                                onChange={(e) => updateBeneficiary(index, "beneficiary_admission", e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => removeBeneficiary(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {beneficiaries.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">
                        You can add beneficiaries who will also benefit from this payment.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Tip Option */}
              {validation?.valid && validation.allowTip && validation.excessAmount! > 0 && beneficiaries.length === 0 && (
                <>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tip"
                      checked={markAsTip}
                      onCheckedChange={(checked) => setMarkAsTip(checked === true)}
                    />
                    <Label htmlFor="tip" className="flex items-center gap-2 cursor-pointer">
                      <Gift className="h-4 w-4 text-primary" />
                      Mark excess (Ksh {validation.excessAmount}) as a tip
                    </Label>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!validation?.valid || submitting || !name || !admissionNumber}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
