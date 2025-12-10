import React, { useState, useEffect, useRef } from 'react';
import { Switch, Route } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { formatDistanceToNow } from 'date-fns';

function AdminHome() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('FORBIDDEN');
        }
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to fetch users');
      }

      return response.json();
    },
  });

  if (error) {
    if (error.message === 'FORBIDDEN') {
      toast.error("Access Denied", {
        description: "You do not have permission to access this resource.",
      });
    }
  }

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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => {
                  const fullName = `${user.firstName} ${user.lastName}`.trim() || 'Unknown';
                  const joinedDate = formatDistanceToNow(new Date(user.createdAt), { addSuffix: true });
                  
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${user.id}`}>{fullName}</TableCell>
                      <TableCell data-testid={`text-email-${user.id}`}>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.plan === 'pro' ? 'border-primary text-primary' : ''} data-testid={`badge-plan-${user.id}`}>
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} data-testid={`badge-role-${user.id}`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-joined-${user.id}`}>{joinedDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" data-testid={`button-edit-${user.id}`}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSettings() {
  const [provider, setProvider] = useState("openai");
  const [modelId, setModelId] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [useCustomApi, setUseCustomApi] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const prevProviderRef = useRef<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/config', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('FORBIDDEN');
        }
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to fetch config');
      }

      return response.json();
    },
  });

  useEffect(() => {
    if (config) {
      setProvider(config.provider || "openai");
      setModelId(config.modelId || "");
      setEndpointUrl(config.endpointUrl || "");
      setSystemPrompt(config.systemPrompt || "");
      setUseCustomApi(config.useCustomApi === "true");
      prevProviderRef.current = config.provider || "openai";
    }
  }, [config]);

  useEffect(() => {
    if (prevProviderRef.current !== null && prevProviderRef.current !== provider) {
      if (provider === 'groq') {
        setModelId('meta-llama/llama-4-scout-17b-16e-instruct');
      } else {
        setModelId('gpt-4o');
      }
    }
    prevProviderRef.current = provider;
  }, [provider]);

  const saveMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('FORBIDDEN');
        }
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to save configuration');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Configuration Saved", {
        description: "Your AI settings have been updated successfully."
      });
    },
    onError: (error: Error) => {
      if (error.message === 'FORBIDDEN') {
        toast.error("Access Denied", {
          description: "You do not have permission to update configuration.",
        });
      } else {
        toast.error("Save Failed", {
          description: error.message || "Failed to save configuration.",
        });
      }
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      provider,
      modelId,
      endpointUrl,
      systemPrompt,
      useCustomApi: useCustomApi ? "true" : "false"
    });
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
                    <SelectItem value="replit">Replit AI (Built-in)</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model ID</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {provider === 'groq' && (
                      <>
                        <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout (Vision)</SelectItem>
                        <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick (Vision)</SelectItem>
                      </>
                    )}
                    {provider === 'openai' && (
                      <>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      </>
                    )}
                    {provider === 'replit' && (
                      <>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {provider === 'groq' && (
              <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Setup:</strong> Add your Groq API key as <code className="bg-black/20 px-1 rounded">GROQ_API_KEY</code> in the Secrets tab.
                  </p>
                </div>
              </div>
            )}

            {provider === 'openai' && (
              <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Setup:</strong> Add your OpenAI API key as <code className="bg-black/20 px-1 rounded">CUSTOM_OPENAI_API_KEY</code> in the Secrets tab.
                  </p>
                </div>
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
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : config ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {isLoading ? 'Loading...' : config ? 'Configuration Loaded' : 'No Configuration'}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t border-border py-4">
             <Button className="ml-auto gap-2" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-config">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
  return (
    <Layout isAdminLayout>
      <Switch>
        <Route path="/admin" component={AdminHome} />
        <Route path="/admin/settings" component={AdminSettings} />
      </Switch>
    </Layout>
  );
}