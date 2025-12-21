import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Auth() {
  const { login } = useAuth();
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth
    setTimeout(() => {
      setIsLoading(false);
      login(email || 'trader@example.com', 'user');
    }, 1500);
  };

  const handleAdminLogin = () => {
     // For demo purposes, we'll auto-login as admin
     setIsLoading(true);
     setTimeout(() => {
       setIsLoading(false);
       login('admin@forexedge.co.za', 'admin');
     }, 1000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />

      <Card className="w-full max-w-md border-white/10 bg-black/50 backdrop-blur-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-black font-mono font-bold text-xl mb-4">F</div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access the terminal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="trader@example.com" 
                    required 
                    className="bg-white/5 border-white/10" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required className="bg-white/5 border-white/10" />
                </div>
                <Button className="w-full mt-4" type="submit" disabled={isLoading}>
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" required className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-reg">Email</Label>
                  <Input id="email-reg" type="email" placeholder="trader@example.com" required className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-reg">Password</Label>
                  <Input id="password-reg" type="password" required className="bg-white/5 border-white/10" />
                </div>
                <Button className="w-full mt-4" type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
            <p className="text-xs text-center text-muted-foreground">
                By clicking continue, you agree to our Terms of Service and Privacy Policy.
            </p>
            <Button variant="link" className="text-xs text-muted-foreground h-auto p-0" onClick={handleAdminLogin}>
                Access Admin Panel (Demo Only)
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}