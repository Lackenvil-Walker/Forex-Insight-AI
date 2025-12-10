import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Brain, BarChart3, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import generatedImage from '@assets/generated_images/dark_abstract_digital_financial_data_visualization_background.png';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-md fixed top-0 w-full z-50 bg-background/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-mono font-bold">F</div>
             <span className="text-xl font-bold tracking-tight">FOREX<span className="text-primary">AI</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <Button variant="ghost" className="hidden md:inline-flex" data-testid="button-pricing">Pricing</Button>
            </Link>
            <Link href="/dashboard">
              <Button data-testid="button-getstarted">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={generatedImage} 
            alt="Background" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-6">
              <Brain className="w-4 h-4" />
              <span>AI-Powered Analysis 2.0 Now Live</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter mb-6 max-w-4xl mx-auto leading-tight">
              Trade Smarter with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300 text-glow">Institutional Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload your chart. Our AI analyzes market structure, price action, and indicators to give you institutional-grade trading setups in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full" data-testid="button-start-analyzing">
                  Start Analyzing Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5" data-testid="button-demo">
                  View Live Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Technical Analysis</CardTitle>
                <CardDescription>Instant detection of support/resistance, trendlines, and chart patterns.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <Brain className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Sentiment Analysis</CardTitle>
                <CardDescription>AI cross-references price action with global market sentiment.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <Lock className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>Get precise Stop Loss and Take Profit levels based on volatility.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg">Choose the plan that fits your trading journey.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="relative overflow-hidden border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <div className="text-4xl font-bold mt-2">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <CardDescription>For beginners learning the ropes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 1 analysis per day</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Basic pattern recognition</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Standard support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/pricing" className="w-full">
                  <Button className="w-full" variant="outline" data-testid="button-starter-plan">Get Started</Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="relative overflow-hidden border-primary shadow-[0_0_40px_rgba(0,227,150,0.1)]">
              <div className="absolute top-0 right-0 bg-primary text-black text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
              <CardHeader>
                <CardTitle className="text-2xl">Pro Trader</CardTitle>
                <div className="text-4xl font-bold mt-2 text-primary">$29<span className="text-lg font-normal text-muted-foreground text-white">/mo</span></div>
                <CardDescription>For serious traders needing an edge.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited analysis</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Advanced entry/exit signals</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Multi-timeframe analysis</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Priority processing</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/pricing" className="w-full">
                  <Button className="w-full h-12 text-md" data-testid="button-pro-trial">Start Pro Trial</Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Institutional Plan */}
            <Card className="relative overflow-hidden border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl">Institutional</CardTitle>
                <div className="text-4xl font-bold mt-2">$99<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <CardDescription>For funds and prop firms.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> API Access</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Custom AI model training</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Dedicated account manager</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/pricing" className="w-full">
                  <Button className="w-full" variant="outline" data-testid="button-institutional-plan">Contact Sales</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 text-center text-muted-foreground text-sm">
        <div className="container mx-auto px-4">
          <p className="mb-4">&copy; 2025 ForexAI Inc. All rights reserved.</p>
          <p className="max-w-xl mx-auto text-xs opacity-60">
            Disclaimer: Trading forex and CFDs carries a high level of risk and may not be suitable for all investors. The AI analysis provided is for informational purposes only and does not constitute financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}