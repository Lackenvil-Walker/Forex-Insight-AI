import React, { useState } from 'react';
import { useLocation, Switch, Route } from 'wouter';
import { motion } from 'framer-motion';
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

function DashboardHome() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);

  const handleAnalyze = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisData(null);
    setShowSubscriptionModal(false);
    
    setTimeout(() => {
      setIsAnalyzing(false);
      const newCount = analysisCount + 1;
      setAnalysisCount(newCount);

      if (newCount > 1) {
        setAnalysisData({
             symbol: 'LOCKED',
             timeframe: 'LOCKED',
             trend: 'neutral',
             confidence: 0,
             entry: '---',
             stopLoss: '---',
             takeProfit: ['---'],
             reasoning: ['Upgrade to Pro to view reasoning...']
        });
        setShowSubscriptionModal(true);
      } else {
        setAnalysisData({
          symbol: 'EUR/USD',
          timeframe: '4H',
          trend: 'bullish',
          confidence: 87,
          entry: '1.0845',
          stopLoss: '1.0810',
          takeProfit: ['1.0890', '1.0950'],
          reasoning: [
            'Double bottom formation detected on 4H timeframe indicating reversal.',
            'RSI showing bullish divergence at oversold levels.',
            'Price action rejected from key support zone at 1.0820.',
            'Moving Average cross (EMA 20/50) impending.',
          ]
        });
      }
    }, 3000);
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

      {analysisCount >= 1 && !isAnalyzing && !analysisData && (
           <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-center gap-3 text-yellow-500 mb-4">
               <Lock className="w-4 h-4" />
               <span className="text-sm font-medium">You have used your 1 free daily analysis. Upgrade for unlimited access.</span>
           </div>
      )}

      <ChartUploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
      
      {analysisData && analysisCount > 1 ? (
           <div className="relative blur-md select-none pointer-events-none opacity-50 transition-all duration-500">
               <AnalysisResult data={{
                  symbol: 'EUR/USD',
                  timeframe: '4H',
                  trend: 'bullish',
                  confidence: 87,
                  entry: '1.0845',
                  stopLoss: '1.0810',
                  takeProfit: ['1.0890', '1.0950'],
                  reasoning: ['Analysis hidden due to plan limits.']
               }} />
           </div>
      ) : (
           <AnalysisResult data={analysisData} />
      )}

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
  const history = [
    { id: 1, pair: 'GBP/JPY', date: '2 hours ago', signal: 'BEARISH', result: 'Win', pips: '+45' },
    { id: 2, pair: 'EUR/USD', date: '5 hours ago', signal: 'BULLISH', result: 'Loss', pips: '-20' },
    { id: 3, pair: 'XAU/USD', date: '1 day ago', signal: 'BULLISH', result: 'Win', pips: '+120' },
    { id: 4, pair: 'BTC/USD', date: '2 days ago', signal: 'NEUTRAL', result: 'Skipped', pips: '0' },
    { id: 5, pair: 'USD/CAD', date: '3 days ago', signal: 'BEARISH', result: 'Win', pips: '+30' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground">Review your past AI-generated signals and performance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signals</CardTitle>
          <CardDescription>Your last 30 days of trading analysis activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${item.signal === 'BULLISH' ? 'bg-green-500/10 text-green-500' : item.signal === 'BEARISH' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {item.signal === 'BULLISH' ? <ArrowRight className="w-4 h-4 -rotate-45" /> : item.signal === 'BEARISH' ? <ArrowRight className="w-4 h-4 rotate-45" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-bold">{item.pair}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                     <p className="text-sm font-medium">{item.signal}</p>
                     <p className="text-xs text-muted-foreground">Signal</p>
                  </div>
                  <div className="text-right hidden md:block">
                     <p className={`text-sm font-bold ${item.pips.startsWith('+') ? 'text-green-500' : item.pips === '0' ? 'text-muted-foreground' : 'text-red-500'}`}>{item.pips} pips</p>
                     <p className="text-xs text-muted-foreground">Outcome</p>
                  </div>
                  <Button variant="ghost" size="sm">Details</Button>
                </div>
              </div>
            ))}
          </div>
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