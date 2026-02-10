import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isValidUrl = (url) => {
  try {
    return url && url.startsWith('http');
  } catch (e) {
    return false;
  }
};

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
   // console.error('CRITICAL: Supabase URL is invalid or keys are missing. Check your .env.local file.');
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000'; // Dev needs full URL, Prod uses relative

const mockSupabase = {
    storage: {
        from: (bucket) => ({
            upload: async (fileName, file) => {
                const formData = new FormData();
                // Send clean filename in form data, but extract folder for header
                const parts = fileName.split('/');
                const actualFileName = parts.pop();
                const folderPath = parts.join('/');

                formData.append('file', file, actualFileName);
                
                const headers = {};
                if (folderPath) {
                    headers['x-upload-folder'] = folderPath;
                }

                try {
                    const response = await fetch(`${API_URL}/api/upload`, {
                        method: 'POST',
                        body: formData,
                        headers: headers
                    });
                    const data = await response.json();
                    return { data: { path: data.publicUrl }, error: null };
                } catch (e) {
                    return { data: null, error: e };
                }
            },
            getPublicUrl: (fileName) => {
                // Return URL knowing that backend structure mirrors the path
                return { data: { publicUrl: `${API_URL}/uploads/${fileName}` } };
            }
        })
    },
    from: (table) => {
        return {
            select: (columns) => {
                const chain = {
                    eq: (col, val) => {
                        chain.filterCol = col;
                        chain.filterVal = val;
                        return chain;
                    },
                    order: async (col, { ascending } = { ascending: true }) => {
                       // Final Execution
                       let url = `${API_URL}/api/${table}`;
                       if (chain.filterCol) {
                           url += `?${chain.filterCol}=${chain.filterVal}`;
                       }
                       try {
                           const res = await fetch(url);
                           const data = await res.json();
                           // Sorting is handled by backend for order created_at, 
                           // but if we need generic sort we might need to do it here or improve backend.
                           // Our backend sorts by date desc by default which is what we need.
                           return { data, error: null };
                       } catch(e) {
                           return { data: [], error: e };
                       }
                    },
                    then: async (resolve) => {
                         // Default select without order
                         let url = `${API_URL}/api/${table}`;
                         if (chain.filterCol) {
                             url += `?${chain.filterCol}=${chain.filterVal}`;
                         }
                         const res = await fetch(url);
                         const data = await res.json();
                         resolve({ data, error: null });
                    }
                };
                return chain;
            },
            insert: async (data) => {
                const res = await fetch(`${API_URL}/api/${table}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data[0])
                });
                const result = await res.json();
                return { data: result, error: null };
            },
            update: (updates) => {
                return {
                    eq: async (col, val) => {
                         // We assume updates are always by ID for now
                         if (col === 'id') {
                             const res = await fetch(`${API_URL}/api/${table}/${val}`, {
                                 method: 'PATCH',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify(updates)
                             });
                             const data = await res.json();
                             return { data, error: null };
                         }
                         return { error: 'Only Update by ID supported in simple server' };
                    }
                };
            }
        };
    },
    channel: () => ({
        on: () => ({
            subscribe: () => {}
        })
    }),
    removeChannel: () => {},
    auth: {
        _session: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('supabase.auth.token') || 'null') : null,
        signInWithPassword: async function({ email, password }) {
            try {
                const res = await fetch(`${API_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                if (res.ok) {
                    const data = await res.json();
                    this._session = data.session;
                    this._session.user = data.user; // Ensure structure matches
                    
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('supabase.auth.token', JSON.stringify(this._session));
                    }

                     // Notify listeners
                    if(this.onStateChangeCallback) this.onStateChangeCallback('SIGNED_IN', this._session);
                    
                    return { data: { user: data.user, session: data.session }, error: null };
                } else {
                    return { data: null, error: { message: 'Credenciais inválidas' } };
                }
            } catch (e) {
                return { error: e };
            }
        },
        signOut: async function() {
            this._session = null;
            if (typeof window !== 'undefined') {
                localStorage.removeItem('supabase.auth.token');
            }
            if(this.onStateChangeCallback) this.onStateChangeCallback('SIGNED_OUT', null);
            return { error: null };
        },
        onStateChangeCallback: null,
        onAuthStateChange: function(callback) {
            this.onStateChangeCallback = callback;
            // Listen to browser refresh if we saved session somehow?
            // For now, simple RAM session.
            return { data: { subscription: { unsubscribe: () => { this.onStateChangeCallback = null; } } } };
        },
        getSession: async function() {
            return { data: { session: this._session }, error: null };
        }
    }
};

export const supabase = mockSupabase;
