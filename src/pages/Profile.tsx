import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { User as UserIcon, Lock, Mail, Loader2, Save, AlertCircle } from 'lucide-react'; // Renomeei User para UserIcon para evitar conflito
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Profile() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const pendingEmail = user?.new_email;

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (user?.email) setNewEmail(user.email);
  }, [profile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('As novas senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (!user?.email) throw new Error("Email não encontrado");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        toast.error('A senha atual está incorreta.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail === user?.email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success(`E-mail de validação enviado para ${newEmail}`);
    } catch (error: any) {
      toast.error('Erro ao solicitar troca: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // OBSERVE: Removemos o <Layout> que envolvia tudo aqui
  return (
      <div className="max-w-4xl mx-auto pb-20 fade-in">
        <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground mb-8">Gerencie suas informações e segurança.</p>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Como você aparece no sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="btn-gradient-primary">
                    {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                    Salvar Alterações
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>E-mail de Acesso</CardTitle>
                <CardDescription>O endereço usado para fazer login no sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingEmail && (
                  <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validação Pendente</AlertTitle>
                    <AlertDescription>
                      Você solicitou a alteração para <strong>{pendingEmail}</strong>. 
                      Verifique sua caixa de entrada.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleChangeEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Endereço de E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        type="email" 
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        className="pl-10" 
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    variant="outline" 
                    disabled={loading || newEmail === user?.email}
                  >
                    {loading ? 'Enviando...' : (pendingEmail ? 'Reenviar Confirmação' : 'Atualizar E-mail')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Trocar Senha</CardTitle>
                <CardDescription>Digite a senha atual para confirmar.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Senha Atual</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nova Senha</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Senha</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" variant="destructive" disabled={loading}>
                    Redefinir Senha
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}