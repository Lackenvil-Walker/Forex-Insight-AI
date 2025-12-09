import React, { useState, useEffect } from 'react';
import { useLocation, Switch, Route } from 'wouter';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChartUploader } from '@/components/ChartUploader';
import { AnalysisResult } from '@/components/AnalysisResult';
import { Layout } from '@/components/Layout';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { History, Clock, ArrowRight, Lock, Settings, Bell, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch as SwitchUI } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { isUnauthorizedError } from '@/lib/authUtils';
import { formatDistanceToNow } from 'date-fns';

function DashboardHome() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Unauthorized", {
        description: "You are logged out. Logging in again...",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading]);

  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const imageData = await base64Promise;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('LIMIT_REACHED');
        }
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to analyze chart');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisData(data.result);
      toast.success("Analysis Complete", {
        description: "Your chart has been analyzed successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error) || error.message === 'UNAUTHORIZED') {
        window.location.href = "/api/login";
        return;
      }
      if (error.message === 'LIMIT_REACHED') {
        setShowSubscriptionModal(true);
        toast.error("Daily Limit Reached", {
          description: "You've used your free analysis for today. Upgrade to continue.",
        });
        return;
      }
      toast.error("Analysis Failed", {
        description: error.message || "Failed to analyze chart. Please try again.",
      });
    }
  });

  const handleAnalyze = async (file: File) => {
    setAnalysisData(null);
    setShowSubscriptionModal(false);
    analyzeMutation.mutate(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      <SubscriptionModal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Analysis</h1>
          <p className="text-muted-foreground">Upload your chart to get AI-powered trading insights.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          System Online: GPT-4o Model Active
        </div>
      </div>

      <ChartUploader onAnalyze={handleAnalyze} isAnalyzing={analyzeMutation.isPending} />
      
      <AnalysisResult data={analysisData} />

      {!analysisData && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Analyses
            </h2>
            <Button variant="link" className="text-primary">View All</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">GBP/JPY</CardTitle>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 2h ago
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-500">BEARISH SIGNAL</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardHistory() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Unauthorized", {
        description: "You are logged out. Logging in again...",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading]);

  const { data: analyses, isLoading: analysesLoading, error } = useQuery({
    queryKey: ['analyses'],
    queryFn: async () => {
      const response = await fetch('/api/analyses', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to fetch analyses');
      }

      return response.json();
    },
    enabled: isAuthenticated && !isLoading,
  });

  if (error) {
    if (error.message === 'UNAUTHORIZED') {
      return null;
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground">Review your past AI-generated signals and performance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signals</CardTitle>
          <CardDescription>Your past trading analysis activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {analysesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading your analyses...</div>
            </div>
          ) : !analyses || analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No analyses yet</p>
              <p className="text-sm text-muted-foreground">Upload a chart to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis: any) => {
                const trend = analysis.result?.trend || 'neutral';
                const symbol = analysis.result?.symbol || 'Unknown';
                const timeAgo = formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true });
                
                return (
                  <div key={analysis.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-colors" data-testid={`analysis-${analysis.id}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        trend === 'bullish' ? 'bg-green-500/10 text-green-500' : 
                        trend === 'bearish' ? 'bg-red-500/10 text-red-500' : 
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {trend === 'bullish' ? <ArrowRight className="w-4 h-4 -rotate-45" /> : 
                         trend === 'bearish' ? <ArrowRight className="w-4 h-4 rotate-45" /> : 
                         <ArrowRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold" data-testid={`text-symbol-${analysis.id}`}>{symbol}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-time-${analysis.id}`}>{timeAgo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm font-medium uppercase" data-testid={`text-trend-${analysis.id}`}>{trend}</p>
                        <p className="text-xs text-muted-foreground">Signal</p>
                      </div>
                      {analysis.result?.confidence && (
                        <div className="text-right hidden md:block">
                          <p className="text-sm font-bold text-primary" data-testid={`text-confidence-${analysis.id}`}>{analysis.result.confidence}%</p>
                          <p className="text-xs text-muted-foreground">Confidence</p>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" data-testid={`button-details-${analysis.id}`}>Details</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSettings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and notifications.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" defaultValue="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" defaultValue="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue="john.doe@example.com" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive daily summaries of your analyses.</p>
              </div>
              <SwitchUI defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">New Feature Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified about new AI models.</p>
              </div>
              <SwitchUI />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your password and security settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <Input id="new" type="password" />
            </div>
            <Button variant="outline">Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={DashboardHome} />
        <Route path="/dashboard/history" component={DashboardHistory} />
        <Route path="/dashboard/settings" component={DashboardSettings} />
      </Switch>
    </Layout>
  );
}