import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Mail, FileText, Loader2, Trash2, User, Search, Pencil, Save } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Team() {
  const { role, user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados do Formulário de Cadastro
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('funcionario');

  // Estados de Edição
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('funcionario');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e: any) { toast.error("Erro ao carregar equipe"); } 
    finally { setLoading(false); }
  };

  // --- CADASTRAR ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'supervisor' && newRole === 'administrador') return toast.error("Supervisor não pode criar Administrador.");
    
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (existing) throw new Error("E-mail já cadastrado.");

      const { error } = await supabase.from('profiles').insert({
        email, full_name: fullName, cpf, role: newRole
      });

      if (error) throw error;
      toast.success("Usuário cadastrado com sucesso!");
      setEmail(''); setCpf(''); setFullName(''); fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally { setSaving(false); }
  };

  // --- DELETAR ---
  const handleDelete = async (targetUser: any) => {
    if (role === 'supervisor' && targetUser.role === 'administrador') {
        return toast.error("Supervisores não podem excluir Administradores.");
    }
    if (!confirm(`Remover ${targetUser.full_name}?`)) return;

    try {
        const { error } = await supabase.from('profiles').delete().eq('id', targetUser.id);
        if (error) throw error;
        toast.success("Usuário removido.");
        setUsers(users.filter(u => u.id !== targetUser.id));
    } catch (error: any) { toast.error("Erro ao remover: " + error.message); }
  };

  // --- ABRIR MODAL DE EDIÇÃO ---
  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditName(user.full_name);
    setEditCpf(user.cpf || '');
    setEditRole(user.role);
  };

  // --- SALVAR EDIÇÃO ---
  const handleUpdate = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
        const { error } = await supabase.from('profiles')
            .update({ full_name: editName, cpf: editCpf, role: editRole })
            .eq('id', editingUser.id);
        
        if (error) throw error;
        toast.success("Dados atualizados!");
        setEditingUser(null);
        fetchUsers();
    } catch (e: any) { toast.error("Erro ao atualizar: " + e.message); }
    finally { setSaving(false); }
  };

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : 'US';

  // Badge Helper
  const getRoleBadge = (r: string) => {
    const styles: any = {
        administrador: "bg-red-100 text-red-700 border-red-200",
        supervisor: "bg-orange-100 text-orange-700 border-orange-200",
        consulta: "text-slate-500 border-slate-200",
        funcionario: "bg-blue-100 text-blue-700 border-blue-200"
    };
    return <Badge variant="outline" className={styles[r] || styles.funcionario}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Func.'}</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Equipe</h1>
            <p className="text-slate-500 text-sm">Gerencie acessos. Apenas Admins podem editar dados.</p>
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#003B8F]" /> Cadastrar Novo Membro
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="grid gap-4 md:grid-cols-12 items-end">
                <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <Input value={fullName} onChange={e=>setFullName(e.target.value)} className="bg-slate-50" required />
                </div>
                <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                    <Input value={email} onChange={e=>setEmail(e.target.value)} className="bg-slate-50" type="email" required />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
                    <Input value={cpf} onChange={e=>setCpf(e.target.value)} className="bg-slate-50" required />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Perfil</label>
                    <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                        <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="funcionario">Funcionário</SelectItem>
                            <SelectItem value="consulta">Consulta</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            {role === 'administrador' && <SelectItem value="administrador">Administrador</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-2">
                    <Button type="submit" disabled={saving} className="bg-[#003B8F] w-full">
                        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Cadastrar'}
                    </Button>
                </div>
            </form>
        </CardContent>
      </Card>
      
      {/* LISTAGEM */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 flex flex-row justify-between items-center">
             <CardTitle className="text-base font-semibold text-slate-700">Membros ({filteredUsers.length})</CardTitle>
             <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar..." className="pl-8 h-9 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            {loading ? <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#003B8F]" /></div> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((u) => (
                            <TableRow key={u.id} className="hover:bg-slate-50">
                                <TableCell><Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-100 text-[#003B8F] text-xs font-bold">{getInitials(u.full_name)}</AvatarFallback></Avatar></TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700">{u.full_name}</span>
                                        <span className="text-xs text-slate-500">{u.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{getRoleBadge(u.role)}</TableCell>
                                <TableCell>{u.user_id ? <Badge variant="outline" className="text-green-600 bg-green-50">Ativo</Badge> : <Badge variant="outline" className="text-yellow-600 bg-yellow-50">Pendente</Badge>}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {/* AÇÃO: EDITAR (SÓ ADMIN) */}
                                        {role === 'administrador' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEditModal(u)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {/* AÇÃO: EXCLUIR (ADMIN E SUPERVISOR) */}
                                        {u.user_id !== currentUser?.id && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(u)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input value={editCpf} onChange={e => setEditCpf(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Perfil de Acesso</Label>
                    <Select value={editRole} onValueChange={(v: any) => setEditRole(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="funcionario">Funcionário</SelectItem>
                            <SelectItem value="consulta">Consulta</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="administrador">Administrador</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button onClick={handleUpdate} disabled={saving} className="bg-[#003B8F]">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}