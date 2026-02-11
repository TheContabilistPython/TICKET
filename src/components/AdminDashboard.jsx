import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import TicketCard from './TicketCard'
import StatsDashboard from './StatsDashboard'
import { Filter, UserPlus, X, BarChart3, LayoutDashboard, Users, Trash2 } from 'lucide-react'

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([])
  const [filterSetor, setFilterSetor] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('kanban'); // 'kanban' or 'stats'
  
  // User creation state
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUsersListModal, setShowUsersListModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'funcionario', contact_email: '' });
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchUsers = async () => {
      const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';
      try {
          const res = await fetch(`${API_URL}/api/users`);
          if (res.ok) {
              const data = await res.json();
              setUsersList(data);
          }
      } catch (error) {
          console.error('Erro ao buscar usuários', error);
      }
  };

  const handleShowUsers = () => {
      fetchUsers();
      setShowUsersListModal(true);
  };

  const handleDeleteUser = async (user) => {
      if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.email}? Os chamados deste usuário serão mantidos.`)) {
          return;
      }

      const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';
      try {
          const res = await fetch(`${API_URL}/api/users/${user.id}`, {
              method: 'DELETE'
          });
          const data = await res.json();
          
          if (res.ok) {
              setUsersList(usersList.filter(u => u.id !== user.id));
              alert('Usuário excluído!');
          } else {
              alert(data.error || 'Erro ao excluir usuário');
          }
      } catch (error) {
          console.error(error);
          alert('Erro de conexão');
      }
  };

  const createUser = async (e) => {
      e.preventDefault();
      setCreatingUser(true);
      
      const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';
      
      try {
          const res = await fetch(`${API_URL}/api/users`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUser)
          });
          const data = await res.json();
          if (res.ok) {
              alert('Usuário criado com sucesso!');
              setShowUserModal(false);
              setNewUser({ email: '', password: '', role: 'funcionario', contact_email: '' });
          } else {
              alert(data.error || 'Erro ao criar usuário');
          }
      } catch (err) {
          console.error(err);
          alert('Erro de conexão');
      } finally {
          setCreatingUser(false);
      }
  };

  useEffect(() => {
    fetchTickets()

    // Realtime subscription
    const channel = supabase
      .channel('tickets_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => fetchTickets()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchTickets = async () => {
    setLoading(true)
    let query = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar tickets:', error)
    } else {
      // Sort by Priority (True first) then Date
      const sorted = [...data].sort((a, b) => {
          if (a.priority === b.priority) {
              return new Date(b.created_at) - new Date(a.created_at);
          }
          return a.priority ? -1 : 1;
      });
      setTickets(sorted)
    }
    setLoading(false)
  }

  const handleStatusUpdate = async (id, newStatus, extraData = {}) => {
    const changes = { status: newStatus, ...extraData };
    
    const { data, error } = await supabase
      .from('tickets')
      .update(changes)
      .eq('id', id)

    if (error) {
      alert('Erro ao atualizar status')
    } else {
      // Update with server response to include timestamps
      if (data && data.id) {
        setTickets(prev => prev.map(t => t.id === id ? data : t))
      } else {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
      }
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    return filterSetor === 'todos' || ticket.setor === filterSetor
  })

  // Group tickets by status
  const ticketsByStatus = {
    pendente: filteredTickets.filter(t => !t.status || t.status === 'pendente'),
    aceito: filteredTickets.filter(t => t.status === 'aceito'),
    resolvido: filteredTickets.filter(t => t.status === 'resolvido'),
    rejeitado: filteredTickets.filter(t => t.status === 'rejeitado')
  };

  const columns = [
    { id: 'pendente', title: 'Pendentes', bg: 'bg-yellow-50', headerBg: 'bg-yellow-100', borderColor: 'border-yellow-200' },
    { id: 'aceito', title: 'Em Andamento', bg: 'bg-blue-50', headerBg: 'bg-blue-100', borderColor: 'border-blue-200' },
    { id: 'resolvido', title: 'Resolvidos', bg: 'bg-green-50', headerBg: 'bg-green-100', borderColor: 'border-green-200' },
  ];

  return (
    <div className="mx-auto px-4 py-8 max-w-[1600px]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Painel Administrativo</h1>
        
        <div className="flex bg-gray-200 p-1 rounded-lg">
             <button
               onClick={() => setCurrentView('kanban')}
               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                 currentView === 'kanban' ? 'bg-white text-[#367588] shadow-sm' : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               <LayoutDashboard className="w-4 h-4" />
               Kanban
             </button>
             <button
               onClick={() => setCurrentView('stats')}
               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                 currentView === 'stats' ? 'bg-white text-[#367588] shadow-sm' : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               <BarChart3 className="w-4 h-4" />
               Indicadores
             </button>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
             <button  
                onClick={handleShowUsers}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
             >
                <Users className="w-4 h-4" />
                <span>Usuários</span>
             </button>

             <button  
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 bg-[#367588] text-white px-4 py-2 rounded-lg hover:bg-[#2b5d6c] transition"
             >
                <UserPlus className="w-4 h-4" />
                <span>Novo Usuário</span>
             </button>

            <div className="flex bg-white p-3 rounded-lg shadow-sm space-x-4 flex-1 md:flex-none overflow-x-auto">
              <div className="flex items-center space-x-2 min-w-[150px]">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtrar Setor:</span>
              </div>
              
              <select 
                value={filterSetor}
                onChange={(e) => setFilterSetor(e.target.value)}
                className="border-gray-300 rounded-md text-sm focus:ring-[#367588] focus:border-[#367588] border p-1"
              >
                <option value="todos">Todos Setores</option>
                <option value="fiscal">Fiscal</option>
                <option value="contabil">Contábil</option>
                <option value="folha">Folha</option>
                <option value="societario">Societário</option>
              </select>
            </div>
        </div>
      </div>

      {/* User Creation Modal */}
      {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
                  <button 
                    onClick={() => setShowUserModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold mb-4">Criar Novo Usuário</h2>
                  <form onSubmit={createUser} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Usuário</label>
                          <input 
                              type="text" 
                              required
                              className="mt-1 block w-full border rounded-md p-2"
                              value={newUser.email}
                              onChange={e => setNewUser({...newUser, email: e.target.value})}
                              placeholder="nome.usuario"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Senha</label>
                          <input 
                              type="text" 
                              required
                              className="mt-1 block w-full border rounded-md p-2"
                              value={newUser.password}
                              onChange={e => setNewUser({...newUser, password: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Email de Contato</label>
                          <input 
                              type="email" 
                              required
                              className="mt-1 block w-full border rounded-md p-2"
                              value={newUser.contact_email}
                              onChange={e => setNewUser({...newUser, contact_email: e.target.value})}
                              placeholder="exemplo@empresa.com"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Função</label>
                          <select 
                              className="mt-1 block w-full border rounded-md p-2"
                              value={newUser.role}
                              onChange={e => setNewUser({...newUser, role: e.target.value})}
                          >
                              <option value="funcionario">Funcionário (Abre Chamados)</option>
                              <option value="ti">TI (Atende Chamados)</option>
                          </select>
                      </div>
                      <button 
                        type="submit" 
                        disabled={creatingUser}
                        className="w-full bg-[#367588] text-white py-2 rounded hover:bg-[#2b5d6c] disabled:opacity-50"
                      >
                          {creatingUser ? 'Criando...' : 'Criar Usuário'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {showUsersListModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full relative max-h-[80vh] overflow-y-auto">
                  <button 
                    onClick={() => setShowUsersListModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold mb-4">Usuários Cadastrados</h2>
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-[#367588] text-white">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Usuário</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email (Contato)</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Senha</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Função</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {usersList.map((user, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.contact_email || '-'}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono bg-gray-100 rounded px-2">{user.password}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ti' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.role === 'ti' ? 'TI (Admin)' : 'Funcionário'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <button 
                                            onClick={() => handleDeleteUser(user)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Excluir Usuário"
                                          >
                                              <Trash2 className="w-5 h-5" />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : currentView === 'stats' ? (
        <StatsDashboard tickets={tickets} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
          {columns.map(col => (
             <div key={col.id} className={`flex-1 min-w-[350px] rounded-lg border ${col.borderColor} ${col.bg} flex flex-col`}>
                <div className={`p-4 ${col.headerBg} border-b ${col.borderColor} rounded-t-lg flex justify-between items-center sticky top-0 z-10`}>
                    <h2 className="font-bold text-gray-800 uppercase tracking-wider text-sm">{col.title}</h2>
                    <span className="bg-white/50 px-2 py-1 rounded text-xs font-bold text-gray-700">
                        {ticketsByStatus[col.id]?.length || 0}
                    </span>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    {ticketsByStatus[col.id]?.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-10 italic">Vazio</p>
                    ) : (
                        ticketsByStatus[col.id]?.map(ticket => (
                            <TicketCard 
                                key={ticket.id} 
                                ticket={ticket} 
                                onStatusUpdate={handleStatusUpdate}
                            />
                        ))
                    )}
                </div>
             </div>
          ))}

          {/* Separate compact column for Rejeitados if needed, or put it at the end clearly */}
          <div className="flex-1 min-w-[350px] rounded-lg border border-red-200 bg-red-50 flex flex-col">
             <div className="p-4 bg-red-100 border-b border-red-200 rounded-t-lg flex justify-between items-center sticky top-0 z-10">
                 <h2 className="font-bold text-red-800 uppercase tracking-wider text-sm">Rejeitados</h2>
                 <span className="bg-white/50 px-2 py-1 rounded text-xs font-bold text-red-800">
                     {ticketsByStatus['rejeitado']?.length || 0}
                 </span>
             </div>
             <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {ticketsByStatus['rejeitado']?.map(ticket => (
                    <TicketCard 
                        key={ticket.id} 
                        ticket={ticket} 
                        // Do not allow status updates on rejected tickets for now to keep it simple, or re-open?
                        // If users re-open, they go to pending. Let's allow simple reopen if needed or just view.
                        // I'll keep the onStatusUpdate so admin can move them back if it was a mistake.
                        onStatusUpdate={handleStatusUpdate} 
                    />
                ))}
             </div>
          </div>

        </div>
      )}
    </div>
  )
}
