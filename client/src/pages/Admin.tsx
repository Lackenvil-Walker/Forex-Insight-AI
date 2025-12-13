import React, { useState, useEffect, useRef } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
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
import { Users, DollarSign, Activity, AlertCircle, Save, CheckCircle2, XCircle, Loader2, Key, Plus, Minus, Coins, Pencil, Smartphone, Clock, Eye, Check, X } from 'lucide-react';
import { toast } from "sonner";
import { formatDistanceToNow, format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MobilePayment {
  id: string;
  userId: string;
  packageId: string | null;
  amount: number;
  credits: number;
  phoneNumber: string;
  screenshotUrl: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  processedAt: string | null;
}

function AdminHome() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [creditsAmount, setCreditsAmount] = useState<string>('5');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creditsAction, setCreditsAction] = useState<'add' | 'remove'>('add');
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    plan: 'free',
    credits: 0,
    newPassword: '',
    emailVerified: false,
  });

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<MobilePayment | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

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

  const creditsMutation = useMutation({
    mutationFn: async ({ userId, amount, action }: { userId: string; amount: number; action: 'add' | 'remove' }) => {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, action }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update credits');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDialogOpen(false);
      setSelectedUser(null);
      setCreditsAmount('5');
      toast.success("Credits Updated", {
        description: `Successfully ${creditsAction === 'add' ? 'added' : 'removed'} credits.`
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to Update Credits", {
        description: error.message
      });
    }
  });

  const handleCreditsSubmit = () => {
    if (!selectedUser) return;
    const amount = parseInt(creditsAmount) || 0;
    if (amount <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a positive number." });
      return;
    }
    creditsMutation.mutate({ userId: selectedUser.id, amount, action: creditsAction });
  };

  const openCreditsDialog = (user: any, action: 'add' | 'remove') => {
    setSelectedUser(user);
    setCreditsAction(action);
    setCreditsAmount('5');
    setDialogOpen(true);
  };

  const editUserMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: any }) => {
      const response = await fetch(`/api/admin/users/${data.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates),
        credentials: 'include'
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update user');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditDialogOpen(false);
      setEditUser(null);
      toast.success("User Updated", {
        description: "User details have been updated successfully."
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to Update User", {
        description: error.message
      });
    }
  });

  const openEditDialog = (user: any) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'user',
      plan: user.plan || 'free',
      credits: user.credits || 0,
      newPassword: '',
      emailVerified: user.emailVerified || false,
    });
    setEditDialogOpen(true);
  };

  const { data: pendingPayments, isLoading: paymentsLoading } = useQuery<MobilePayment[]>({
    queryKey: ['admin-mobile-payments'],
    queryFn: async () => {
      const response = await fetch('/api/admin/mobile-payments', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const response = await fetch(`/api/admin/mobile-payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update payment');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-mobile-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
      setAdminNotes('');
      toast.success(variables.status === 'approved' ? "Payment Approved" : "Payment Rejected", {
        description: variables.status === 'approved' ? "Credits have been added to the user's account." : "Payment has been rejected."
      });
    },
    onError: (error: Error) => {
      toast.error("Failed", { description: error.message });
    }
  });

  const openPaymentDialog = (payment: MobilePayment) => {
    setSelectedPayment(payment);
    setAdminNotes('');
    setPaymentDialogOpen(true);
  };

  const handlePaymentAction = (status: 'approved' | 'rejected') => {
    if (!selectedPayment) return;
    approvePaymentMutation.mutate({ id: selectedPayment.id, status, adminNotes });
  };

  const formatPriceZAR = (priceInCents: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(priceInCents / 100);
  };

  const handleEditSubmit = () => {
    if (!editUser) return;
    const creditsValue = typeof editForm.credits === 'string' 
      ? parseInt(editForm.credits, 10) || 0 
      : editForm.credits || 0;
    const updates: any = {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      role: editForm.role,
      plan: editForm.plan,
      credits: creditsValue,
      emailVerified: editForm.emailVerified,
    };
    if (editForm.newPassword) {
      updates.newPassword = editForm.newPassword;
    }
    editUserMutation.mutate({ userId: editUser.id, updates });
  };

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
            <>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{creditsAction === 'add' ? 'Add' : 'Remove'} Credits</DialogTitle>
                    <DialogDescription>
                      {creditsAction === 'add' ? 'Add' : 'Remove'} credits for {selectedUser?.firstName} {selectedUser?.lastName} ({selectedUser?.email})
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="credits-amount">Number of Credits</Label>
                    <Input
                      id="credits-amount"
                      type="number"
                      min="1"
                      value={creditsAmount}
                      onChange={(e) => setCreditsAmount(e.target.value)}
                      className="mt-2"
                      data-testid="input-credits-amount"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-credits">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreditsSubmit} 
                      disabled={creditsMutation.isPending}
                      data-testid="button-confirm-credits"
                    >
                      {creditsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {creditsAction === 'add' ? 'Add' : 'Remove'} Credits
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                      Update details for {editUser?.firstName} {editUser?.lastName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-firstName">First Name</Label>
                        <Input
                          id="edit-firstName"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          data-testid="input-edit-firstname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-lastName">Last Name</Label>
                        <Input
                          id="edit-lastName"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          data-testid="input-edit-lastname"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        data-testid="input-edit-email"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                          <SelectTrigger data-testid="select-edit-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Plan</Label>
                        <Select value={editForm.plan} onValueChange={(v) => setEditForm({ ...editForm, plan: v })}>
                          <SelectTrigger data-testid="select-edit-plan">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-credits">Credits</Label>
                      <Input
                        id="edit-credits"
                        type="number"
                        min="0"
                        value={editForm.credits}
                        onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                        data-testid="input-edit-credits"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                      <Input
                        id="edit-password"
                        type="password"
                        value={editForm.newPassword}
                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                        placeholder="At least 8 characters"
                        data-testid="input-edit-password"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-0.5">
                        <Label>Email Verified</Label>
                        <p className="text-xs text-muted-foreground">Mark user's email as verified</p>
                      </div>
                      <SwitchUI 
                        checked={editForm.emailVerified}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, emailVerified: checked })}
                        data-testid="switch-edit-email-verified"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleEditSubmit} 
                      disabled={editUserMutation.isPending}
                      data-testid="button-save-edit"
                    >
                      {editUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credits</TableHead>
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1" data-testid={`badge-credits-${user.id}`}>
                            <Coins className="w-3 h-3" />
                            {user.credits || 0}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => openCreditsDialog(user, 'add')}
                            data-testid={`button-add-credits-${user.id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => openCreditsDialog(user, 'remove')}
                            data-testid={`button-remove-credits-${user.id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditDialog(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Mobile Payments */}
      <Card className="col-span-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-red-500" />
            <CardTitle>Pending Mobile Payments</CardTitle>
          </div>
          <CardDescription>
            Approve or reject Airtel Money payments. Credits are typically processed at 10am, 12pm, and 4pm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pendingPayments || pendingPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No pending payments</p>
            </div>
          ) : (
            <>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Review Payment</DialogTitle>
                    <DialogDescription>
                      Review and approve or reject this mobile payment
                    </DialogDescription>
                  </DialogHeader>
                  {selectedPayment && (
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Amount</Label>
                          <p className="font-medium text-lg">{formatPriceZAR(selectedPayment.amount)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Credits</Label>
                          <p className="font-medium text-lg">{selectedPayment.credits}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Phone Number</Label>
                          <p className="font-medium">{selectedPayment.phoneNumber}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Submitted</Label>
                          <p className="font-medium">{format(new Date(selectedPayment.createdAt), 'MMM d, yyyy h:mm a')}</p>
                        </div>
                      </div>
                      
                      {selectedPayment.screenshotUrl && (
                        <div>
                          <Label className="text-muted-foreground">Payment Screenshot</Label>
                          <img 
                            src={selectedPayment.screenshotUrl} 
                            alt="Payment screenshot" 
                            className="mt-2 w-full rounded-lg border max-h-64 object-contain"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Admin Notes (optional)</Label>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes about this payment..."
                          className="h-20"
                          data-testid="input-admin-notes"
                        />
                      </div>
                    </div>
                  )}
                  <DialogFooter className="gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => handlePaymentAction('rejected')}
                      disabled={approvePaymentMutation.isPending}
                      data-testid="button-reject-payment"
                    >
                      {approvePaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                      Reject
                    </Button>
                    <Button 
                      onClick={() => handlePaymentAction('approved')}
                      disabled={approvePaymentMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-approve-payment"
                    >
                      {approvePaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      Approve
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Screenshot</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium">{payment.phoneNumber}</TableCell>
                      <TableCell>{formatPriceZAR(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Coins className="w-3 h-3" />
                          {payment.credits}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.screenshotUrl ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Eye className="w-3 h-3" />
                            Attached
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => openPaymentDialog(payment)}
                          data-testid={`button-review-${payment.id}`}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
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
  const { isAdmin, isLoading, isGuest } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    if (!isLoading) {
      if (isGuest) {
        navigate('/login');
        return;
      }
      if (!isAdmin) {
        navigate('/dashboard');
      }
    }
  }, [isAdmin, isLoading, isGuest, navigate]);
  
  if (isLoading) {
    return (
      <Layout isAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <Layout isAdminLayout>
      <Switch>
        <Route path="/admin" component={AdminHome} />
        <Route path="/admin/settings" component={AdminSettings} />
      </Switch>
    </Layout>
  );
}