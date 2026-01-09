import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import forexEdgeLogo from '@/assets/forex-edge-logo-full.png';

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { verifyEmail, isVerifying, verifyError } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed');
      });
  }, [verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src={forexEdgeLogo} alt="Forex Edge - Trade Smart" className="h-20 mx-auto object-contain" />
          </Link>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center">
              {status === 'loading' && (
                <>
                  <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">Verifying your email...</h2>
                  <p className="text-muted-foreground">Please wait a moment</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">Email Verified!</h2>
                  <p className="text-muted-foreground mb-6">{message}</p>
                  <Button
                    onClick={() => navigate('/login')}
                    data-testid="button-go-to-login"
                  >
                    Continue to Login
                  </Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">Verification Failed</h2>
                  <p className="text-muted-foreground mb-6">{message}</p>
                  <div className="space-y-3">
                    <Button
                      onClick={() => navigate('/login')}
                      className="w-full"
                    >
                      Go to Login
                    </Button>
                    <Link href="/resend-verification">
                      <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-muted">
                        Resend Verification Email
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
