
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist')); // Serve built frontend files

// Local storage base
const BASE_DIR = process.env.LOCAL_DATA_DIR || path.join(__dirname, 'LOG');
const TICKETS_DIR = path.join(BASE_DIR, 'tickets');
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const USERS_DIR = path.join(BASE_DIR, 'users');
const LOGIN_FILE = path.join(BASE_DIR, 'users_db.json');
const SEQUENCE_FILE = path.join(BASE_DIR, 'sequence.json');

// Ensure storage exists
[BASE_DIR, UPLOADS_DIR, USERS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Initialize Sequence
if (!fs.existsSync(SEQUENCE_FILE)) {
    fs.writeFileSync(SEQUENCE_FILE, JSON.stringify({ last_ticket_id: 0, last_user_id: 3 }, null, 2));
}

const getNextId = (key) => {
    try {
        const data = JSON.parse(fs.readFileSync(SEQUENCE_FILE));
        data[key] = (data[key] || 0) + 1;
        fs.writeFileSync(SEQUENCE_FILE, JSON.stringify(data, null, 2));
        return data[key];
    } catch (e) {
        return Date.now();
    }
}

// Initialize Users DB if needed
if (!fs.existsSync(LOGIN_FILE)) {
    const defaultUsers = [
        { id: '1', email: 'ti', password: 'admin', role: 'ti', contact_email: 'ti@empresa.com' },
        { id: '2', email: 'admin', password: 'admin', role: 'ti', contact_email: 'admin@empresa.com' },
        { id: '3', email: 'op', password: '1234', role: 'funcionario', contact_email: 'op@empresa.com' } 
    ];
    fs.writeFileSync(LOGIN_FILE, JSON.stringify(defaultUsers, null, 2));
}

// Nodemailer Transporter Mock/Setup
// NOTE: Configure these credentials for real emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: 587,
    auth: {
        user: process.env.SMTP_USER || 'suporte@prontasc.com.br',
        pass: process.env.SMTP_PASS || 's0@71020120'
    }
});

const sendResolutionEmail = async (userEmail, ticketId, resolutionNotes) => {
    if (!userEmail) return;
    
    console.log(`[EMAIL] Attempting to send resolution email to ${userEmail} for ticket ${ticketId}`);

    const mailOptions = {
        from: `"Suporte TI" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Chamado #${ticketId} Resolvido`,
        text: `Olá,\n\nSeu chamado #${ticketId} foi marcado como resolvido.\n\nNotas de Resolução:\n${resolutionNotes}\n\nAtenciosamente,\nEquipe de TI`,
        html: `<p>Olá,</p><p>Seu chamado <strong>#${ticketId}</strong> foi marcado como resolvido.</p><p><strong>Notas de Resolução:</strong><br>${resolutionNotes}</p><p>Atenciosamente,<br>Equipe de TI</p>`
    };

    try {
        if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
            console.log(`[EMAIL MOCK] Email content: ${JSON.stringify(mailOptions, null, 2)}`);
            return;
        }
        
        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL] Message sent: %s', info.messageId);
    } catch (error) {
        console.error('[EMAIL] Error sending email:', error);
    }
}

const sendAcceptEmail = async (userEmail, ticketId, notes, deadline) => {
    if (!userEmail) return;
    console.log(`[EMAIL] Sending accept email to ${userEmail} for ticket ${ticketId}`);

    const mailOptions = {
        from: `"Suporte TI" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Chamado #${ticketId} em Andamento`,
        text: `Olá,\n\nSeu chamado #${ticketId} foi aceito e está em andamento.\n\nObservação: ${notes}\nPrazo Estimado: ${deadline}\n\nAtenciosamente,\nEquipe de TI`,
        html: `<p>Olá,</p><p>Seu chamado <strong>#${ticketId}</strong> foi aceito e está sendo trabalhado.</p>
               <p><strong>Observação:</strong><br>${notes}</p>
               <p><strong>Prazo Estimado de Conclusão:</strong><br>${deadline}</p>
               <p>Atenciosamente,<br>Equipe de TI</p>`
    };

    try {
        if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
            console.log(`[EMAIL MOCK] Accept Email: ${JSON.stringify(mailOptions, null, 2)}`);
            return;
        }
        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL] Accept notification sent: %s', info.messageId);
    } catch (error) {
        console.error('[EMAIL] Error sending accept email:', error);
    }
}

const sendNewTicketEmail = async (ticket) => {
    console.log(`[EMAIL] Sending new ticket notification.`);

    const recipient = ticket.is_task ? 'societario1@prontasc.com.br' : 'suporte@prontasc.com.br';
    const subjectPrefix = ticket.is_task ? '[TAREFA SOCIETÁRIO]' : 'Novo Chamado';

    const mailOptions = {
        from: `"Sistema de Chamados" <${process.env.SMTP_USER}>`,
        to: recipient,
        subject: `${subjectPrefix} #${ticket.id} - ${ticket.title || 'Sem título'}`,
        text: `Um novo chamado foi aberto.\n\nID: ${ticket.id}\nTipo: ${ticket.is_task ? 'TAREFA' : 'CHAMADO'}\nUsuário: ${ticket.email}\nSetor: ${ticket.setor}\nDescrição:\n${ticket.description || ticket.descricao_problema}\n\nAcesse o sistema para responder.`,
        html: `<h2>Novo Chamado Aberto</h2>
               <p><strong>ID:</strong> ${ticket.id}</p>
               <p><strong>Tipo:</strong> ${ticket.is_task ? '<span style="color:blue;font-weight:bold;">TAREFA</span>' : 'CHAMADO'}</p>
               <p><strong>Usuário:</strong> ${ticket.email}</p>
               <p><strong>Setor:</strong> ${ticket.setor}</p>
               <p><strong>Descrição:</strong><br>${ticket.description || ticket.descricao_problema}</p>
               <p><a href="http://192.168.1.25:3000">Acessar Sistema</a></p>`
    };

    try {
        if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
            console.log(`[EMAIL MOCK] New Ticket Email: ${JSON.stringify(mailOptions, null, 2)}`);
            return;
        }
        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL] New Ticket notification sent: %s', info.messageId);
    } catch (error) {
        console.error('[EMAIL] Error sending new ticket notification:', error);
    }
}

// Multer Storage for File Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadFolder = req.headers['x-upload-folder'];
        if (uploadFolder) {
            const dir = path.join(UPLOADS_DIR, uploadFolder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        } else {
            cb(null, UPLOADS_DIR);
        }
    },
    filename: function (req, file, cb) {
        // Client generates random unique filename, so acts like Supabase storage
        cb(null, file.originalname)
    }
});
const upload = multer({ storage: storage });

// API Routes

// Serve Uploaded Files
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth Mock
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Check in users_db.json
    try {
        const users = JSON.parse(fs.readFileSync(LOGIN_FILE));
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
             return res.json({ 
                user: { id: user.id, email: user.email, user_metadata: { role: user.role, only_tasks: user.only_tasks } }, 
                session: { access_token: 'valid-jwt-token' } 
            });
        }
    } catch (e) {
        // Fallback or error
    }

    // Fallback for hardcoded legacy (optional, can be removed if db is init)
    if (email.includes('admin') && password === 'admin') {
         return res.json({ 
            user: { id: 'admin-id', email, user_metadata: { role: 'ti' } }, 
            session: { access_token: 'valid-jwt' } 
        });
    }

    return res.status(401).json({ error: 'Credenciais inválidas' });
});

app.post('/api/users', (req, res) => {
    const { email, password, role, contact_email, only_tasks } = req.body;
    if (!email || !password || !role) return res.status(400).json({error: 'Faltam dados'});
    
    try {
        const users = JSON.parse(fs.readFileSync(LOGIN_FILE));
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }
        
        const randomSuffix = Math.floor(Math.random() * 900 + 100).toString(); // 100-999
        const newUser = {
            id: `${email}_${randomSuffix}`,
            email,
            password,
            role,
            contact_email: contact_email || '',
            only_tasks: !!only_tasks
        };
        
        users.push(newUser);
        fs.writeFileSync(LOGIN_FILE, JSON.stringify(users, null, 2));
        
        res.json({ success: true, user: newUser });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao salvar usuário' });
    }
});

app.get('/api/users', (req, res) => {
    try {
        if (!fs.existsSync(LOGIN_FILE)) {
            return res.json([]);
        }
        const users = JSON.parse(fs.readFileSync(LOGIN_FILE));
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.delete('/api/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Tentando excluir usuário ID: ${id}`);

        if (!fs.existsSync(LOGIN_FILE)) return res.status(404).json({ error: 'Arquivo de usuários não encontrado' });
        
        let users = JSON.parse(fs.readFileSync(LOGIN_FILE));
        const initialLength = users.length;
        
        // Filter with loose equality to match both string "1" and number 1 if needed
        users = users.filter(u => String(u.id) !== String(id));
        
        if (users.length === initialLength) {
            console.log('Usuário não encontrado na lista');
            return res.status(404).json({ error: 'Usuário não encontrado no banco de dados' });
        }
        
        fs.writeFileSync(LOGIN_FILE, JSON.stringify(users, null, 2));
        console.log('Usuário excluído com sucesso');
        
        res.json({ success: true });
    } catch (e) {
        console.error('Erro ao excluir:', e);
        res.status(500).json({ error: `Erro interno: ${e.message}` });
    }
});

const sanitizeForFolder = (value) => {
    return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_');
};

const readTicketsFromDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    const tickets = [];
    for (const file of files) {
        try {
            const ticket = JSON.parse(fs.readFileSync(path.join(dirPath, file)));
            tickets.push(ticket);
        } catch (e) {
            // Skip malformed ticket file
        }
    }
    return tickets;
};

const writeTicket = (ticket) => {
    // New Structure: LOG/tickets/<user>/<filename>
    // But user asked for: LOG/tickets with subfolders for users.
    // So: TICKETS_DIR/<user_safe>/<ticket_numer>_<date>.json
    
    // We update TICKETS_DIR dynamic usage inside routes or here.
    // Let's rely on ticket.email to determine folder.
    
    const userFolder = sanitizeForFolder(ticket.email || 'anon');
    const targetDir = path.join(TICKETS_DIR, userFolder);
    
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const ticketFilename = `${ticket.id || 'unknown'}.json`; // ID now contains format
    const ticketPath = path.join(targetDir, ticketFilename);
    
    fs.writeFileSync(ticketPath, JSON.stringify(ticket, null, 2));
    
    // Also save to USERS_DIR for backward compatibility or if we want double copy?
    // User requested "em C:\software_de_suporte\LOG\tickets faça um novo nivel...".
    // AND "mude o nome do ticket".
    // We should probably rely on this new structure as the Source of Truth.
    // We can stop writing to USERS_DIR separate folder if TICKETS_DIR is now partitioned by user.
    // But let's keep USERS_DIR clean for auth/other stuff if needed.
    // Actually, TICKETS_DIR is now LOG/tickets. Inside it, we have user folders.
    // This satisfies the request.
};

// GET Tickets
app.get('/api/tickets', (req, res) => {
    let result = [];

    // If email provided, look in that user's folder in TICKETS_DIR
    if (req.query.email) {
        const userFolder = path.join(TICKETS_DIR, sanitizeForFolder(req.query.email));
        result = readTicketsFromDir(userFolder);
    } else {
        // If Admin (no email filtered), read ALL user folders
        if (fs.existsSync(TICKETS_DIR)) {
             const userFolders = fs.readdirSync(TICKETS_DIR).filter(f => fs.statSync(path.join(TICKETS_DIR, f)).isDirectory());
             for (const folder of userFolders) {
                 result = result.concat(readTicketsFromDir(path.join(TICKETS_DIR, folder)));
             }
        }
    }

    // Optional Filter e.g. /api/tickets?email=... (already handled by path selection above, but let's double check)
    // Actually, if fetching all, we might still want to filter if query param was passed but logic didn't hit above
    // (e.g. if we change logic). But for now, user specific folder query is faster.
    
    if (req.query.email) {
        // Redundant but safe
        result = result.filter(t => t.email === req.query.email);
    }

    // Sort by Date Desc (Newest First)
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(result);
});

// POST Ticket
app.post('/api/tickets', (req, res) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD or use YYYY-MM-DD
    // User requested: numticket_dataaberturadoticket
    // Example: 1_20231027
    
    const seqId = getNextId('last_ticket_id');
    const ticketId = `${seqId}_${dateStr}`; 
    
    // Check if client sent an ID (e.g. for folder generation)? 
    // Client generated an ID for uploads folder earlier.
    // We should probably respect that for the LINKING, but for the Ticket ID we need the sequential one.
    // However, uploads used the client-generated ID.
    // We can update the ticket object to have `upload_id` or similar if needed.
    // But simpler: Use the generated ID as the main ID.
    // AND we need to tell the client what the new ID is if they depend on it?
    // Client POST wait for response.
    
    // Problem: Client generated "user_timestamp" for folder.
    // If we change ID to "1_date", the folder link might break if client relies on ID matching folder.
    // Client logic: `const ticketFolder = ${userNameClean}_${ticketId};` where ticketId was Date.now().
    // We can keep `upload_folder` in the ticket metadata to link them.
    
    const newTicket = {
        ...req.body,
        id: ticketId, // Overwrite client ID with sequential one
        upload_folder_ref: req.body.id, // Keep reference to client ID for uploads if needed
        created_at: now.toISOString(),
        accepted_at: null,
        resolved_at: null,
        last_poke_at: null,
        poke_count: 0
    };

    writeTicket(newTicket);

    // Send notification email to Support IT (async, don't block response)
    sendNewTicketEmail(newTicket);

    res.json([newTicket]);
});

// UPDATE Ticket Status
app.patch('/api/tickets/:id', (req, res) => {
    // Find the ticket file. Since we don't know the user, we have to search.
    // Or we need to pass user email in the request? 
    // PATCH /api/tickets/1_2026...?email=... is better.
    // But Standard REST just has ID.
    
    let ticketPath = null;
    let foundFolder = null;

    if (fs.existsSync(TICKETS_DIR)) {
        const userFolders = fs.readdirSync(TICKETS_DIR).filter(f => fs.statSync(path.join(TICKETS_DIR, f)).isDirectory());
        
        for (const folder of userFolders) {
            const tempPath = path.join(TICKETS_DIR, folder, `${req.params.id}.json`);
            if (fs.existsSync(tempPath)) {
                ticketPath = tempPath;
                foundFolder = folder;
                break;
            }
        }
    }

    if (!ticketPath) {
        return res.status(404).json({ error: 'Ticket not found' });
    }

    const current = JSON.parse(fs.readFileSync(ticketPath));
    const updates = req.body || {};

    if (updates.status && updates.status !== current.status) {
        const now = new Date().toISOString();
        if (updates.status === 'aceito' && !current.accepted_at) {
            updates.accepted_at = now;

             // Notify Accepted
             try {
                if (fs.existsSync(LOGIN_FILE)) {
                    const users = JSON.parse(fs.readFileSync(LOGIN_FILE));
                    const owner = users.find(u => u.email === current.email);
                    if (owner && owner.contact_email) {
                        const acceptNotes = updates.accept_notes || 'Sem observações.';
                        const deadline = updates.deadline ? new Date(updates.deadline).toLocaleString() : 'Não informado';
                        
                        // Reuse or create sendAcceptEmail function
                        sendAcceptEmail(owner.contact_email, req.params.id, acceptNotes, deadline);
                    }
                }
            } catch (err) {
                console.error('[EMAIL] Failed to fetch user for accept notification:', err);
            }
        }
        if (updates.status === 'resolvido' && !current.resolved_at) {
            updates.resolved_at = now;

            // Trigger Email Notification if resolved
            // Need to find user contact email
            try {
                // Ticket owner email (username) is in current.email
                if (fs.existsSync(LOGIN_FILE)) {
                    const users = JSON.parse(fs.readFileSync(LOGIN_FILE));
                    const owner = users.find(u => u.email === current.email);
                    if (owner && owner.contact_email) {
                        sendResolutionEmail(owner.contact_email, req.params.id, updates.resolution_notes || 'Sem observações.');
                    } else {
                        console.log(`[EMAIL] No contact email found for user ${current.email}`);
                    }
                }
            } catch (err) {
                console.error('[EMAIL] Failed to fetch user for notification:', err);
            }
        }
    }

    const updatedTicket = { ...current, ...updates };
    
    // Write back to same path
    fs.writeFileSync(ticketPath, JSON.stringify(updatedTicket, null, 2));
    
    res.json(updatedTicket);
});

// Upload File
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Return relative path. If folder was used, multer saved to subfolder.
    // We need to return the path including subfolder relative to uploads root.
    const uploadFolder = req.headers['x-upload-folder'];
    const filename = req.file.filename;
    const publicUrl = uploadFolder ? `/uploads/${uploadFolder}/${filename}` : `/uploads/${filename}`;
    
    res.json({ publicUrl });
});


// Catch-all for React Router (SPA)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} and http://192.168.1.25:${PORT}`);
});
