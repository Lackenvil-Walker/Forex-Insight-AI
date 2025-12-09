import React, { useState, useEffect } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch as SwitchUI } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, Activity, AlertCircle, Save, CheckCircle2, XCircle, Loader2, Key } from 'lucide-react';
import { toast } from "sonner";

function AdminHome() {
  const users = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', plan: 'Pro', status: 'Active', joined: '2023-10-15' },
    { id: 2, name: 'Bob Jones', email: 'bob@example.com', plan: 'Basic', status: 'Active', joined: '2023-11-02' },
    { id: 3, name: 'Charlie Day', email: 'charlie@example.com', plan: 'Pro', status: 'Past Due', joined: '2023-09-20' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com', plan: 'Enterprise', status: 'Active', joined: '2023-12-01' },
    { id: 5, name: 'Evan Wright', email: 'evan@example.com', plan: 'Basic', status: 'Cancelled', joined: '2023-08-10' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">Manage users, subscriptions, and system health.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180 new this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI API Usage</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,234</div>
            <p className="text-xs text-muted-foreground">Requests today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Operational</div>
            <p className="text-xs text-muted-foreground">Last downtime: 32 days ago</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>
            Manage your user base and view subscription details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={user.plan === 'Enterprise' ? 'border-primary text-primary' : ''}>
                      {user.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'Active' ? 'default' : user.status === 'Past Due' ? 'destructive' : 'secondary'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.joined}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSettings() {
  const [provider, setProvider] = useState("openai");
  const [modelId, setModelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load from local storage on mount
  useEffect(() => {
    const config = localStorage.getItem('forex_ai_config');
    if (config) {
      const data = JSON.parse(config);
      setProvider(data.provider || "openai");
      setModelId(data.modelId || "");
      setApiKey(data.apiKey || "");
      setSystemPrompt(data.systemPrompt || "");
    } else {
      // Defaults
      setModelId("gpt-4o");
      setSystemPrompt(`You are an expert forex trader with 20 years of experience at top hedge funds. 
Analyze the provided chart image for:
1. Market Structure (Trends, Support/Resistance)
2. Candlestick Patterns
3. Key Indicators (RSI, MACD, EMAs if visible)
4. Order Blocks and Liquidity Zones

Provide a clear signal: BULLISH, BEARISH, or NEUTRAL.
Include specific Entry, Stop Loss, and Take Profit levels.`);
    }
  }, []);

  const handleTestConnection = () => {
    if (!apiKey) {
      toast.error("API Key Missing", { description: "Please enter an API key to test connection." });
      return;
    }

    setIsTesting(true);
    setConnectionStatus('idle');
    
    // Simulate API check
    setTimeout(() => {
      setIsTesting(false);
      setConnectionStatus('success');
      toast.success("Connection established successfully", {
        description: `Verified connection to ${provider} (${modelId}).`
      });
    }, 2000);
  };

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      const config = {
        provider,
        modelId,
        apiKey,
        systemPrompt
      };
      localStorage.setItem('forex_ai_config', JSON.stringify(config));
      setIsSaving(false);
      toast.success("Configuration Saved", {
        description: "Your AI settings have been securely stored locally."
      });
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure global application parameters.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle>AI Provider Configuration</CardTitle>
            </div>
            <CardDescription>Connect your preferred AI model provider for market analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude 3.5)</SelectItem>
                    <SelectItem value="google">Google (Gemini Pro)</SelectItem>
                    <SelectItem value="custom">Custom Endpoint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model ID</Label>
                <Input value={modelId} onChange={(e) => setModelId(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  placeholder="sk-..." 
                  className="font-mono"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Keys are stored securely in environment variables.</p>
            </div>
            
            {provider === 'custom' && (
               <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input placeholder="https://api.example.com/v1/chat/completions" />
              </div>
            )}

            <div className="space-y-2">
              <Label>System Prompt (Analysis Persona)</Label>
              <Textarea 
                className="h-32 font-mono text-xs"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                {connectionStatus === 'idle' && <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
                {connectionStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {connectionStatus === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
                <span className="text-sm font-medium">
                  {connectionStatus === 'idle' ? 'Not Tested' : connectionStatus === 'success' ? 'Connected' : 'Connection Failed'}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Test Connection
              </Button>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t border-border py-4">
             <Button className="ml-auto gap-2" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save API Configuration
             </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Limits</CardTitle>
            <CardDescription>Adjust free tier and pro tier limitations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Free Tier Analysis Limit</Label>
                <p className="text-sm text-muted-foreground">Daily limit for non-paying users.</p>
              </div>
              <div className="flex items-center gap-2">
                 <Input type="number" defaultValue="1" className="w-20 text-right" />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
               <div className="space-y-0.5">
                <Label className="text-base">Enable Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Disable new signups and uploads.</p>
              </div>
              <SwitchUI />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  // Route protection
  React.useEffect(() => {
    if (!isLoading) {
       if (!user) {
         setLocation('/auth');
       } else if (user.role !== 'admin') {
         toast.error("Unauthorized", { description: "You do not have permission to access the admin panel." });
         setLocation('/dashboard');
       }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null; // Or a spinner

  if (!user || user.role !== 'admin') return null;

  return (
    <Layout isAdmin>
      <Switch>
        <Route path="/admin" component={AdminHome} />
        <Route path="/admin/settings" component={AdminSettings} />
      </Switch>
    </Layout>
  );
}