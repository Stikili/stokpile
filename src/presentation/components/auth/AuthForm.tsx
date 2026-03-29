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

const countries = [
  "South Africa",
  "Zimbabwe",
  "Botswana",
  "Namibia",
  "Lesotho",
  "Swaziland",
  "Kenya",
  "Nigeria",
  "Ghana",
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    const shouldRemember = localStorage.getItem("rememberMe") === "true";

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
      else if (value.length < 6) errors.password = "Password must be at least 6 characters";
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
        if (password.length < 6) errors.password = "Password must be at least 6 characters";
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
        });
        // Auto sign in after signup
        await api.signin({ email, password });
      } else {
        await api.signin({ email, password });
      }

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
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
                  <Label htmlFor="fullName">First Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); validateField("fullName", e.target.value); }}
                    onBlur={(e) => validateField("fullName", e.target.value)}
                    required
                    disabled={loading}
                    className={fieldErrors.fullName ? "border-destructive" : ""}
                  />
                  {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
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
                  <Label htmlFor="country">Country</Label>
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateField("email", e.target.value); }}
                onBlur={(e) => validateField("email", e.target.value)}
                required
                disabled={loading}
                className={fieldErrors.email ? "border-destructive" : ""}
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignup && <ForgotPasswordDialog />}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); validateField("password", e.target.value); }}
                onBlur={(e) => validateField("password", e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className={fieldErrors.password ? "border-destructive" : ""}
              />
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

            <Button type="submit" className="w-full" disabled={loading}>
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
    </div>
  );
}