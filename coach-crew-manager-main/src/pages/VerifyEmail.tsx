import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get email from navigation state
  const email = location.state?.email || "";
  const teamName = location.state?.teamName || "Your Team";
  const adminName = location.state?.adminName || "User";
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address provided",
        variant: "destructive"
      });
      navigate("/register");
    }
  }, [email, navigate, toast]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || verified) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, verified]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle code input
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    
    // Auto-submit when 6 digits entered
    if (value.length === 6) {
      handleVerify(value);
    }
  };

  // Verify code
  const handleVerify = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code;
    
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/verification/verify", {
        email,
        code: verificationCode
      });

      setVerified(true);
      toast({
        title: "Success!",
        description: "Your account has been verified",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Invalid verification code";
      toast({
        title: "Verification Failed",
        description: message,
        variant: "destructive"
      });
      setCode("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/api/verification/resend", { email });
      
      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your email"
      });
      
      setTimeLeft(900); // Reset timer
      setCode("");
      inputRef.current?.focus();
    } catch (err: any) {
      toast({
        title: "Failed to Resend",
        description: err?.response?.data?.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-600 dark:text-green-400">
              Verified!
            </CardTitle>
            <CardDescription>
              Your account has been successfully verified
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Redirecting to login page...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary mb-2">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Verify Your Email
          </CardTitle>
          <CardDescription>
            We've sent a 6-digit code to
            <br />
            <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-bold"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          {timeLeft > 0 ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Code expires in{" "}
                <span className="font-semibold text-foreground">
                  {formatTime(timeLeft)}
                </span>
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-destructive font-semibold">
                Code expired. Please request a new one.
              </p>
            </div>
          )}

          <Button
            onClick={() => handleVerify()}
            disabled={loading || code.length !== 6}
            className="w-full bg-gradient-primary shadow-primary hover:shadow-hover"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resending || timeLeft > 840} // Can resend after 1 minute
              className="w-full"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
            {timeLeft > 840 && (
              <p className="text-xs text-muted-foreground">
                You can resend in {formatTime(timeLeft - 840)}
              </p>
            )}
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate("/login")}
              className="text-sm"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
