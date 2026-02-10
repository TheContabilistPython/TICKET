import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { X, Bell, CheckCircle, Info } from 'lucide-react';

export default function NotificationManager() {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    if (!user) return;

    // Check immediately on mount, then every 30 seconds
    const interval = setInterval(checkNotifications, 10000); // 10s for quicker response in demo
    return () => clearInterval(interval);
  }, [user, role, lastCheck]);

  const checkNotifications = async () => {
    if (!user) return;

    // We only care about events happening AFTER our last check
    // However, for demo purposes, capturing only future events might be tricky if clocks differ.
    // Better: capture events from "last check" or slightly before if we want to be safe.
    // To avoid stale alerts on refresh, we usually track "seen" IDs, but simpler here:
    // Compare timestamps.
    const checkTime = lastCheck; 
    setLastCheck(Date.now());

    let query = supabase.from('tickets').select('*');
    if (role !== 'ti') {
        query = query.eq('email', user.email);
    }
    
    // Note: Our mock supabase select returns everything, filtering happens in memory or backend.
    // The simple backend returns array.
    const { data: tickets } = await query;
    
    if (!tickets) return;

    const newNotifications = [];

    tickets.forEach(ticket => {
        // user checks: status changes
        if (role !== 'ti') {
             const acceptedAt = ticket.accepted_at ? new Date(ticket.accepted_at).getTime() : 0;
             const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : 0;
             const rejectedAt = ticket.rejected_at ? new Date(ticket.rejected_at).getTime() : 0; // If we add this field later

             // Check if event happened after last check
             if (acceptedAt > checkTime && ticket.status === 'aceito') {
                 newNotifications.push({
                     id: `acc-${ticket.id}-${Date.now()}`,
                     title: 'Chamado Aceito!',
                     message: `Seu chamado "${ticket.descricao_problema.substring(0, 30)}..." foi aceito pela TI.`,
                     type: 'info'
                 });
             }
             if (resolvedAt > checkTime && ticket.status === 'resolvido') {
                 newNotifications.push({
                     id: `res-${ticket.id}-${Date.now()}`,
                     title: 'Chamado Resolvido!',
                     message: `Seu chamado "${ticket.descricao_problema.substring(0, 30)}..." foi finalizado.`,
                     type: 'success'
                 });
             }
        } 
        
        // TI checks: pokes
        if (role === 'ti') {
            const lastPoke = ticket.last_poke_at ? new Date(ticket.last_poke_at).getTime() : 0;
             if (lastPoke > checkTime) {
                 newNotifications.push({
                     id: `poke-${ticket.id}-${Date.now()}`,
                     title: 'TI Cutucada!',
                     message: `O usuário ${ticket.nome_usuario} está aguardando retorno no ticket ${ticket.id}.`,
                     type: 'warning'
                 });
             }
        }
    });

    if (newNotifications.length > 0) {
        // Play sound?
        setNotifications(prev => [...prev, ...newNotifications]);
    }
  };

  const removeNotification = (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.map(n => (
        <div key={n.id} className={`p-4 rounded-lg shadow-lg border flex items-start gap-3 animate-slide-in relative
            ${n.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
              n.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 
              'bg-blue-50 border-blue-200 text-blue-800'}`
        }>
            {n.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {n.type === 'warning' && <Bell className="w-5 h-5 shrink-0" />}
            {n.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
            
            <div>
                <h4 className="font-bold text-sm">{n.title}</h4>
                <p className="text-sm opacity-90">{n.message}</p>
            </div>

            <button 
                onClick={() => removeNotification(n.id)}
                className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
      ))}
    </div>
  );
}
