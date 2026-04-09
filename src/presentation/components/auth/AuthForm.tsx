import { useState, useEffect } from "react";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Label } from "@/presentation/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/presentation/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/ui/select";
import { Checkbox } from "@/presentation/ui/checkbox";
import { Alert, AlertDescription } from "@/presentation/ui/alert";
import { ThemeToggle } from "@/presentation/shared/ThemeToggle";
import { ForgotPasswordDialog } from "@/presentation/components/auth/ForgotPasswordDialog";
import { Logo } from "@/presentation/layout/Logo";
import { api } from "@/infrastructure/api";
import { PrivacyPolicy } from "@/presentation/components/legal/PrivacyPolicy";
import { TermsOfService } from "@/presentation/components/legal/TermsOfService";

const countries = [
  "Angola",
  "Botswana",
  "DRC (Congo)",
  "Eswatini",
  "Ethiopia",
  "Ghana",
  "Kenya",
  "Lesotho",
  "Malawi",
  "Mozambique",
  "Namibia",
  "Nigeria",
  "Rwanda",
  "South Africa",
  "Tanzania",
  "Uganda",
  "Zambia",
  "Zimbabwe",
  "Other",
];

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Load remembered email on mount (sessionStorage — scoped to browser tab)
  useEffect(() => {
    const rememberedEmail = sessionStorage.getItem("rememberedEmail");
    const shouldRemember = sessionStorage.getItem("rememberMe") === "true";

    if (rememberedEmail && shouldRemember) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = { ...fieldErrors };
    if (name === "email") {
      if (!value) errors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = "Enter a valid email address";
      else delete errors.email;
    }
    if (name === "password") {
      if (!value) errors.password = "Password is required";
      else if (value.length < 12) errors.password = "Password must be at least 12 characters";
      else delete errors.password;
    }
    if (name === "fullName") {
      if (!value.trim()) errors.fullName = "First name is required";
      else delete errors.fullName;
    }
    if (name === "surname") {
      if (!value.trim()) errors.surname = "Surname is required";
      else delete errors.surname;
    }
    if (name === "country") {
      if (!value) errors.country = "Please select your country";
      else delete errors.country;
    }
    setFieldErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        const errors: Record<string, string> = {};
        if (!fullName.trim()) errors.fullName = "First name is required";
        if (!surname.trim()) errors.surname = "Surname is required";
        if (!country) errors.country = "Please select your country";
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
        if (password.length < 12) errors.password = "Password must be at least 12 characters";
        if (!consentGiven) errors.consent = "You must agree to data processing to continue";
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          setLoading(false);
          return;
        }
        await api.signup({
          email,
          password,
          fullName,
          surname,
          country,
          phone: phone.trim() || undefined,
        });
        // Auto sign in after signup
        await api.signin({ email, password });
      } else {
        await api.signin({ email, password });
      }

      // Handle remember me (sessionStorage — scoped to tab, not persisted)
      if (rememberMe) {
        sessionStorage.setItem("rememberedEmail", email);
        sessionStorage.setItem("rememberMe", "true");
      } else {
        sessionStorage.removeItem("rememberedEmail");
        sessionStorage.removeItem("rememberMe");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:bg-transparent dark:bg-none dark:from-transparent dark:to-transparent p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo showText={false} />
          </div>
          <CardTitle>
            {isSignup ? "Create Account" : "Welcome to Stokpile"}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "Join your group and start managing contributions"
              : "Transparent Group Savings & Payouts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">First Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); validateField("fullName", e.target.value); }}
                    onBlur={(e) => validateField("fullName", e.target.value)}
                    required
                    aria-required="true"
                    disabled={loading}
                    className={fieldErrors.fullName ? "border-destructive" : ""}
                  />
                  {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surname">Surname <span className="text-destructive">*</span></Label>
                  <Input
                    id="surname"
                    value={surname}
                    onChange={(e) => { setSurname(e.target.value); validateField("surname", e.target.value); }}
                    onBlur={(e) => validateField("surname", e.target.value)}
                    required
                    disabled={loading}
                    className={fieldErrors.surname ? "border-destructive" : ""}
                  />
                  {fieldErrors.surname && <p className="text-xs text-destructive">{fieldErrors.surname}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                  <Select
                    value={country}
                    onValueChange={(v) => { setCountry(v); validateField("country", v); }}
                    required
                    disabled={loading}
                  >
                    <SelectTrigger className={fieldErrors.country ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.country && <p className="text-xs text-destructive">{fieldErrors.country}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp / Cell Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    placeholder="+27 82 123 4567"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional — used for contribution and payout notifications
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateField("email", e.target.value); }}
                onBlur={(e) => validateField("email", e.target.value)}
                required
                aria-required="true"
                disabled={loading}
                className={fieldErrors.email ? "border-destructive" : ""}
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                {!isSignup && <ForgotPasswordDialog />}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); validateField("password", e.target.value); }}
                onBlur={(e) => validateField("password", e.target.value)}
                required
                aria-required="true"
                disabled={loading}
                minLength={12}
                className={fieldErrors.password ? "border-destructive" : ""}
              />
              {isSignup && password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => {
                      const strength = Math.min(4, Math.floor(
                        (password.length >= 12 ? 1 : 0) +
                        (/[A-Z]/.test(password) ? 1 : 0) +
                        (/[0-9]/.test(password) ? 1 : 0) +
                        (/[^A-Za-z0-9]/.test(password) ? 1 : 0)
                      ));
                      const colors = ['bg-destructive','bg-orange-400','bg-yellow-400','bg-green-500'];
                      return <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength-1] : 'bg-muted'}`} />;
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const tips = [];
                      if (password.length < 12) tips.push('12+ chars');
                      if (!/[A-Z]/.test(password)) tips.push('uppercase');
                      if (!/[0-9]/.test(password)) tips.push('number');
                      if (!/[^A-Za-z0-9]/.test(password)) tips.push('symbol');
                      return tips.length === 0 ? '✓ Strong password' : `Add: ${tips.join(', ')}`;
                    })()}
                  </p>
                </div>
              )}
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>

            {!isSignup && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked: boolean) =>
                    setRememberMe(checked as boolean)
                  }
                />
                <Label
                  htmlFor="remember"
                  className="text-sm cursor-pointer select-none"
                >
                  Remember me
                </Label>
              </div>
            )}

            {isSignup && (
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={(checked: boolean) => {
                      setConsentGiven(checked as boolean);
                      if (checked) {
                        const { consent: _, ...rest } = fieldErrors;
                        setFieldErrors(rest);
                      }
                    }}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="consent"
                    className="text-xs leading-relaxed cursor-pointer select-none text-muted-foreground"
                  >
                    I agree that Stokpile may process my data to provide the service, and I accept the{' '}
                    <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-primary underline hover:no-underline">Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-primary underline hover:no-underline">Privacy Policy</button>. <span className="text-destructive">*</span>
                  </Label>
                </div>
                {fieldErrors.consent && <p className="text-xs text-destructive">{fieldErrors.consent}</p>}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || (isSignup && !consentGiven)}>
              {loading ? "Please wait..." : isSignup ? "Sign Up" : "Sign In"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setFieldErrors({});
              }}
              className="w-full text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {isSignup
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </form>
        </CardContent>
      </Card>

      <PrivacyPolicy open={showPrivacy} onOpenChange={setShowPrivacy} />
      <TermsOfService open={showTerms} onOpenChange={setShowTerms} />
    </div>
  );
}