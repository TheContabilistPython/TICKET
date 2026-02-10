import { Share2, User, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare, Download, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'


const StatusBadge = ({ status }) => {
  const styles = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aceito: 'bg-blue-100 text-blue-800', // Changed green to blue for 'accepted/in progress' usually
    resolvido: 'bg-green-100 text-green-800', // Green for done
    rejeitado: 'bg-red-100 text-red-800'
  }
  
  const icon = {
    pendente: <AlertCircle className="w-4 h-4 mr-1" />,
    aceito: <Clock className="w-4 h-4 mr-1" />,
    resolvido: <CheckCircle className="w-4 h-4 mr-1" />,
    rejeitado: <XCircle className="w-4 h-4 mr-1" />
  }

  return (
    <span className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pendente}`}>
      {icon[status] || icon.pendente}
      {(status || 'pendente').charAt(0).toUpperCase() + (status || 'pendente').slice(1)}
    </span>
  )
}

export default function TicketCard({ ticket, onStatusUpdate }) {
  const { role } = useAuth()
  const [resolutionText, setResolutionText] = useState('')
;
  const [showResolveForm, setShowResolveForm] = useState(false);

  const handleResolveClick = () => {
    if (showResolveForm && resolutionText.trim()) {
       onStatusUpdate(ticket.id, 'resolvido', { resolution_notes: resolutionText });
       setShowResolveForm(false);
    } else {
       setShowResolveForm(true);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <User className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{ticket.nome_usuario}</h3>
            <p className="text-sm text-gray-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-1">Setor: <span className="font-semibold text-gray-700">{ticket.setor}</span></p>
        <h4 className="font-medium text-gray-900 mb-1">Problema:</h4>
        <p className="text-gray-600 bg-gray-50 p-3 rounded text-sm">{ticket.descricao_problema}</p>
      </div>

      {ticket.tentativas_anteriores && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-1">Tentativas Anteriores:</h4>
          <p className="text-gray-600 text-sm">{ticket.tentativas_anteriores}</p>
        </div>
      )}

      {(ticket.accepted_at || ticket.resolved_at) && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-1">Linha do tempo:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {ticket.accepted_at && (
              <div>Aceito em: {new Date(ticket.accepted_at).toLocaleString()}</div>
            )}
            {ticket.resolved_at && (
              <div>Finalizado em: {new Date(ticket.resolved_at).toLocaleString()}</div>
            )}
            {ticket.poke_count > 0 && (
                <div className="text-yellow-600 font-semibold flex items-center mt-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                     TI cutucada {ticket.poke_count} vez(es) (Última: {new Date(ticket.last_poke_at).toLocaleString()})
                </div>
            )}
          </div>
        </div>
      )}

      {ticket.resolution_notes && (
          <div className="mb-4 bg-green-50 p-3 rounded border border-green-200">
              <h4 className="font-medium text-green-900 mb-1 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Parecer Técnico:
              </h4>
              <p className="text-green-800 text-sm whitespace-pre-wrap">{ticket.resolution_notes}</p>
          </div>
      )}

      {ticket.screenshot_url && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">Capturas de Tela:</h4>
          <div className="flex flex-wrap gap-2">
            {(() => {
                let urls = [];
                try {
                    if (ticket.screenshot_url.startsWith('[')) {
                        urls = JSON.parse(ticket.screenshot_url);
                    } else {
                        urls = [ticket.screenshot_url];
                    }
                } catch (e) {
                    urls = [ticket.screenshot_url];
                }

                return urls.map((url, index) => {
                    let displayName = `Anexo ${index + 1}`;
                    try {
                        const fileName = decodeURIComponent(url.split('/').pop());
                        const match = fileName.match(/^\d+_(.+)$/); 
                        displayName = match ? match[1] : fileName;
                    } catch (e) {
                         // Fallback
                    }

                    return (
                        <div key={index} className="inline-flex items-center bg-white border border-gray-300 shadow-sm rounded-md overflow-hidden hover:shadow transition-shadow">
                            <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center px-3 py-2 hover:bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none"
                                title={`Visualizar ${displayName}`}
                            >
                                <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="truncate max-w-[150px]">{displayName}</span>
                            </a>
                            {role === 'ti' && (
                                <a 
                                    href={url} 
                                    download={displayName}
                                    className="px-3 py-2 border-l border-gray-200 hover:bg-gray-100 text-[#367588] transition-colors"
                                    title="Baixar Arquivo"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    );
                });
            })()}
          </div>
        </div>
      )}

      {onStatusUpdate && (
        <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-100">
          {ticket.status === 'pendente' && (
            <>
              <button
                onClick={() => onStatusUpdate(ticket.id, 'aceito')}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Aceitar Chamado
              </button>
              <button
                onClick={() => onStatusUpdate(ticket.id, 'rejeitado')}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Rejeitar
              </button>
            </>
          )}

          {ticket.status === 'aceito' && (
            <div className="w-full">
                {showResolveForm ? (
                    <div className="flex flex-col gap-2 animate-fade-in">
                        <textarea
                            className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="Descreva a solução ou parecer técnico..."
                            rows={3}
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-2">
                             <button
                                onClick={handleResolveClick}
                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                            >
                                Confirmar Resolução
                            </button>
                            <button
                                onClick={() => setShowResolveForm(false)}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={handleResolveClick}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                        Marcar como Resolvido
                    </button>
                )}
            </div>
          )}

          {(ticket.status === 'resolvido' || ticket.status === 'rejeitado') && (
               <p className="w-full text-center text-sm text-gray-500 italic">Ticket finalizado</p>
          )}
        </div>
      )}
    </div>
  )
}
