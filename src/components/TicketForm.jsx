import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Upload, X, FileText, Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function TicketForm() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState([]); // Histórico
  const [now, setNow] = useState(new Date());

  // Pagination & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [dateRangeError, setDateRangeError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 5;

  const handleDateFromChange = (e) => {
    const from = e.target.value;
    setFilterDateFrom(from);
    setCurrentPage(1);
    if (from && filterDateTo) {
      const diff = (new Date(filterDateTo) - new Date(from)) / (1000 * 60 * 60 * 24);
      if (diff > 31) { setDateRangeError('Intervalo máximo de 1 mês.'); }
      else { setDateRangeError(''); }
    } else { setDateRangeError(''); }
  };

  const handleDateToChange = (e) => {
    const to = e.target.value;
    setFilterDateTo(to);
    setCurrentPage(1);
    if (filterDateFrom && to) {
      const diff = (new Date(to) - new Date(filterDateFrom)) / (1000 * 60 * 60 * 24);
      if (diff > 31) { setDateRangeError('Intervalo máximo de 1 mês.'); }
      else if (diff < 0) { setDateRangeError('Data final anterior à data inicial.'); }
      else { setDateRangeError(''); }
    } else { setDateRangeError(''); }
  };

  useEffect(() => {
    // Update local time every minute to refresh "Poke" button state
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handlePoke = async (ticket) => {
      const { data, error } = await supabase
        .from('tickets')
        .update({ 
            last_poke_at: new Date().toISOString(),
            poke_count: (ticket.poke_count || 0) + 1
        })
        .eq('id', ticket.id);
      
      if (!error) {
          addToast({ message: 'TI notificada!', type: 'success' });
          // Refresh tickets locally or wait for realtime
          setTickets(prev => prev.map(t => 
             t.id === ticket.id 
             ? { ...t, last_poke_at: new Date().toISOString(), poke_count: (t.poke_count || 0) + 1 } 
             : t
          ));
      } else {
          addToast({ message: 'Erro ao cutucar.', type: 'error' });
      }
  };

  const getPokeStatus = (ticket) => {
      if (ticket.status === 'resolvido' || ticket.status === 'rejeitado') return { canPoke: false };

      const createdAt = new Date(ticket.created_at).getTime();
      const acceptedAt = ticket.accepted_at ? new Date(ticket.accepted_at).getTime() : null;
      const lastPoke = ticket.last_poke_at ? new Date(ticket.last_poke_at).getTime() : 0;
      const nowMs = now.getTime();

      const ONE_HOUR = 60 * 60 * 1000;
      const TWO_HOURS = 2 * 60 * 60 * 1000;

      let canPoke = false;
      let nextPokeTime = 0;

      if (ticket.status === 'pendente') {
          // Rule: 2 hours after opening
          const initialDelayOver = (nowMs - createdAt) >= TWO_HOURS;
          // And 2 hours (or 1?) between pokes? Assuming strict 2h initially implies slower pace. 
          // Let's assume recurring 2h for pending to match "disponivel em 2 horas".
          // Or if the prompt implies "Available 2h after open (one time)"? "fica disponivel em 2 horas ... e que depois de aceito libere a cada 1 hora"
          // Implies recurring. Safe bet: 2h interval for pending.
          const intervalOver = !lastPoke || (nowMs - lastPoke) >= TWO_HOURS;
          
          canPoke = initialDelayOver && intervalOver;
          
          if (!initialDelayOver) nextPokeTime = createdAt + TWO_HOURS;
          else if (!intervalOver) nextPokeTime = lastPoke + TWO_HOURS;

      } else if (ticket.status === 'aceito') {
          // Rule: Every 1 hour
          const intervalOver = (!lastPoke) || (nowMs - lastPoke) >= ONE_HOUR;
          // Also protect against immediate poke after accept if it was just poked?
          // "depois de aceito libere a cada 1 hora"
          canPoke = intervalOver;
          if (!intervalOver) nextPokeTime = lastPoke + ONE_HOUR;
      }

      return { canPoke, nextPokeTime };
  };

  const [formData, setFormData] = useState({
    nome_usuario: '', 
    setor: '',
    descricao_problema: '',
    tentativas_anteriores: '',
    screenshots: [],
    is_task: false
  })
  const [previewUrls, setPreviewUrls] = useState([])

  useEffect(() => {
    if (user && user.email) {
        // Pre-fill name based on email or user metadata if available
        setFormData(prev => ({ ...prev, nome_usuario: user.email.split('@')[0] }));
        fetchMyTickets();
    }
  }, [user]);

  const fetchMyTickets = async () => {
      if (!user || !user.email) return;
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      
      if (data) setTickets(data);
  };

  useEffect(() => {
    const handleWindowPaste = (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        const newScreenshots = [];
        const newPreviewUrls = [];

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            newScreenshots.push(blob);
            newPreviewUrls.push({ url: URL.createObjectURL(blob), type: 'image', name: 'Print Colado' });
          }
        }

        if (newScreenshots.length > 0) {
            setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, ...newScreenshots] }));
            setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
            e.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePriorityChange = (e) => {
    const checked = e.target.checked;
    if (checked) {
        addToast({
            message: "Ao marcar esta caixa você está sugerindo que a solicitação tem urgência MÁXIMA. Favor, usar moderadamente.",
            type: "warning",
            duration: 8000
        });
    }
    setFormData(prev => ({ ...prev, priority: checked }));
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map(file => ({
          url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name
      }));

      setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, ...newFiles] }));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  }

  const removeScreenshot = (index) => {
    setFormData(prev => {
        const newScreenshots = [...prev.screenshots];
        newScreenshots.splice(index, 1);
        return { ...prev, screenshots: newScreenshots };
    });
    setPreviewUrls(prev => {
        const newPreviewUrls = [...prev];
        if (newPreviewUrls[index].url) URL.revokeObjectURL(newPreviewUrls[index].url);
        newPreviewUrls.splice(index, 1);
        return newPreviewUrls;
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const ticketId = Date.now().toString();
      const userNameClean = (user.email.split('@')[0] || 'anon').replace(/[^a-zA-Z0-9]/g, '_');
      const ticketFolder = `${userNameClean}_${ticketId}`;

      let screenshot_urls = []

      if (formData.screenshots.length > 0) {
        for (const file of formData.screenshots) {
             const sanitizedName = file.name 
                ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') 
                : `imagem.${file.type.split('/')[1] || 'png'}`;
                
             // Pass folder structure in fileName for mock to handle
             const fileName = `${ticketFolder}/${sanitizedName}`
             
             const { error: uploadError } = await supabase.storage
               .from('screenshots')
               // Mock handles folder extraction
               .upload(fileName, file)
     
             if (uploadError) throw uploadError
     
             // We construct the URL manually or look for header handling in mock
             // The upload result above returns correct full path if mock is implemented right
             // But we need to match what getPublicUrl expects
             
             const { data: { publicUrl } } = supabase.storage
                .from('screenshots')
                .getPublicUrl(fileName)
               
             screenshot_urls.push(publicUrl)
        }
      }

      const screenshot_url_value = screenshot_urls.length > 0 ? JSON.stringify(screenshot_urls) : null;

      const { error } = await supabase
        .from('tickets')
        .insert([{
          id: ticketId, // Use consistent ID
          email: user.email,
          nome_usuario: formData.nome_usuario,
          setor: formData.setor,
          title: formData.assunto,
          is_task: formData.is_task,
          priority: formData.priority,
          descricao_problema: formData.descricao_problema,
          tentativas_anteriores: formData.tentativas_anteriores,
          screenshot_url: screenshot_url_value,
          status: 'pendente'
        }])

      if (error) throw error

      addToast({ message: 'Ticket enviado com sucesso!', type: 'success' })
      fetchMyTickets();
      setFormData(prev => ({
        ...prev,
        setor: '',
        assunto: '',
        descricao_problema: '',
        tentativas_anteriores: '',
        screenshots: [],
        is_task: false
      }))
      setPreviewUrls([])

    } catch (error) {
      console.error('Erro ao enviar ticket:', error)
      addToast({ message: 'Erro ao enviar ticket. Tente novamente.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10 mb-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Novo Chamado de Suporte</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
          <input
            type="text"
            name="nome_usuario"
            required
            readOnly
            value={formData.nome_usuario}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed border p-2 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Setor</label>
          <select
            name="setor"
            required
            value={formData.setor}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#367588] focus:ring-[#367588] border p-2"
          >
            <option value="">Selecione um setor...</option>
            <option value="fiscal">Fiscal</option>
            <option value="contabil">Contábil</option>
            <option value="folha">Folha</option>
            <option value="societario">Societário</option>
          </select>
        </div>

        <div>
           <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Assunto</label>
              <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                  <input 
                    type="checkbox" 
                    id="is_task"
                    checked={formData.is_task || false} 
                    onChange={(e) => setFormData(prev => ({ ...prev, is_task: e.target.checked }))}
                    className="w-4 h-4 text-[#367588] focus:ring-[#367588] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="is_task" className="text-xs text-gray-600 cursor-pointer select-none font-medium">
                      Tarefa (Encaminhar p/ Societário)
                  </label>
              </div>
           </div>
           <input
             type="text"
             name="assunto"
             required
             value={formData.assunto || ''}
             onChange={handleChange}
             placeholder="Resumo curto do problema"
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#367588] focus:ring-[#367588] border p-2"
           />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Descrição do Problema</label>
          <textarea
            name="descricao_problema"
            required
            rows={4}
            value={formData.descricao_problema}
            onChange={handleChange}
            placeholder="Descreva detalhadamente o que está ocorrendo..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#367588] focus:ring-[#367588] border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Procedimentos já realizados</label>
          <textarea
            name="tentativas_anteriores"
            rows={3}
            value={formData.tentativas_anteriores}
            onChange={handleChange}
            placeholder="O que você já tentou fazer para resolver?"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#367588] focus:ring-[#367588] border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Anexos e Prints (Ctrl+V)</label>
          <div className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative"
               onClick={() => document.getElementById('file-upload').click()}
          >
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 text-center">
                Clique para selecionar arquivos JPG, PNG, PDF, XML, CSV, TXT<br/>
                <span className="text-xs">ou cole (Ctrl+V) aqui</span>
            </p>
            
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*,.pdf,.xml,.csv,.txt"
              multiple
              onChange={handleFileChange}
            />
          </div>

          {previewUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {previewUrls.map((file, index) => (
                <div key={index} className="relative group bg-gray-100 rounded p-2 flex flex-col items-center justify-center h-24 text-center">
                  {file.type === 'image' ? (
                       <img src={file.url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded shadow-sm opacity-80" />
                  ) : (
                       <div className="flex flex-col items-center">
                           <FileText className="w-8 h-8 text-gray-500 mb-1" />
                           <span className="text-xs text-gray-600 truncate max-w-[100px]">{file.name}</span>
                       </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeScreenshot(index); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2 text-right">{previewUrls.length} arquivo(s) selecionado(s)</p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md my-4">
            <input 
                type="checkbox" 
                id="priority" 
                checked={formData.priority || false} 
                onChange={handlePriorityChange}
                className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="priority" className="text-sm font-bold text-red-800 cursor-pointer">
                Entrega para cliente na data de HOJE (prioridade)
            </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#367588] hover:bg-[#2b5d6c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#367588] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Enviando...' : 'Abrir Chamado'}
        </button>
      </form>

      {tickets.length > 0 && (
        <div className="mt-10 border-t pt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Meus Chamados Recentes</h3>

          {/* Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <input
              type="text"
              placeholder="Buscar por ID, assunto ou descrição..."
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-[#367588] focus:border-[#367588]"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <div className="flex flex-col sm:flex-row gap-2 items-start">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-500 whitespace-nowrap">De:</label>
                <input
                  type="date"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-[#367588] focus:border-[#367588]"
                  value={filterDateFrom}
                  onChange={handleDateFromChange}
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-500 whitespace-nowrap">Até:</label>
                <input
                  type="date"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-[#367588] focus:border-[#367588]"
                  value={filterDateTo}
                  onChange={handleDateToChange}
                />
              </div>
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setDateRangeError(''); setCurrentPage(1); }}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 border rounded"
                >Limpar datas</button>
              )}
            </div>
            {dateRangeError && <p className="text-xs text-red-500">{dateRangeError}</p>}
          </div>

          <div className="space-y-4">
            {tickets
              .filter(ticket => {
                const term = searchTerm.toLowerCase();
                const matchesTerm =
                  (ticket.id && ticket.id.toLowerCase().includes(term)) ||
                  (ticket.title && ticket.title.toLowerCase().includes(term)) ||
                  (ticket.descricao_problema && ticket.descricao_problema.toLowerCase().includes(term));
                const ticketDate = ticket.created_at ? ticket.created_at.split('T')[0] : '';
                const matchesFrom = filterDateFrom ? ticketDate >= filterDateFrom : true;
                const matchesTo = filterDateTo ? ticketDate <= filterDateTo : true;
                return matchesTerm && matchesFrom && matchesTo && !dateRangeError;
              })
              .slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage)
              .map((ticket) => (
                <div key={ticket.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mb-2 ${
                        ticket.status === 'resolvido' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'aceito' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'rejeitado' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ticket.status ? ticket.status.toUpperCase() : 'PENDENTE'}
                      </span>
                      <p className="text-sm text-gray-600 font-medium">Setor: {ticket.setor}</p>
                      <p className="mt-1 text-gray-800">{ticket.descricao_problema}</p>
                      {(ticket.accepted_at || ticket.resolved_at) && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          {ticket.accepted_at && (
                            <div>Aceito em: {new Date(ticket.accepted_at).toLocaleString()}</div>
                          )}
                          {ticket.accept_notes && <div className="text-blue-600 font-semibold">Obs: {ticket.accept_notes}</div>}
                          {ticket.deadline && <div className="text-red-500 font-bold">Prazo: {new Date(ticket.deadline).toLocaleString()}</div>}
                          {ticket.resolved_at && (
                            <div>Finalizado em: {new Date(ticket.resolved_at).toLocaleString()}</div>
                          )}
                        </div>
                      )}

                      {ticket.resolution_notes && (
                        <div className="mt-3 bg-green-100 p-2 rounded text-sm text-green-900 border border-green-200">
                          <strong>Parecer da TI:</strong>
                          <p className="mt-1 whitespace-pre-wrap text-green-800">{ticket.resolution_notes}</p>
                        </div>
                      )}

                      {/* Poke Button */}
                      {(() => {
                        const { canPoke, nextPokeTime } = getPokeStatus(ticket);
                        if (ticket.status !== 'resolvido' && ticket.status !== 'rejeitado') {
                          return (
                            <div className="mt-3">
                              <button
                                onClick={() => handlePoke(ticket)}
                                disabled={!canPoke}
                                className={`flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded border transition-colors ${
                                  canPoke
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 cursor-pointer'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                }`}
                              >
                                <Bell className={`w-3 h-3 ${canPoke ? 'animate-pulse' : ''}`} />
                                <span>Cutucar TI {ticket.poke_count > 0 ? `(${ticket.poke_count})` : ''}</span>
                              </button>
                              {!canPoke && nextPokeTime > 0 && (
                                <span className="text-[10px] text-gray-400 ml-1">
                                  Disponível às {new Date(nextPokeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <span className="text-xs text-gray-500">
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination */}
          {(() => {
            const filteredCount = tickets.filter(t => {
              const term = searchTerm.toLowerCase();
              const matchesTerm = (t.id?.toLowerCase().includes(term) || t.title?.toLowerCase().includes(term) || t.descricao_problema?.toLowerCase().includes(term));
              const ticketDate = t.created_at ? t.created_at.split('T')[0] : '';
              const matchesFrom = filterDateFrom ? ticketDate >= filterDateFrom : true;
              const matchesTo = filterDateTo ? ticketDate <= filterDateTo : true;
              return matchesTerm && matchesFrom && matchesTo && !dateRangeError;
            }).length;

            if (filteredCount <= ticketsPerPage) return null;

            return (
              <div className="flex justify-center items-center mt-6 gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {Math.ceil(filteredCount / ticketsPerPage) || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredCount / ticketsPerPage)))}
                  disabled={currentPage >= Math.ceil(filteredCount / ticketsPerPage)}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
                >
                  Próxima
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  )
}
