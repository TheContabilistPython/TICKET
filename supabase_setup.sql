-- Create Enums
create type setor_enum as enum ('fiscal', 'contabil', 'folha', 'societario');
create type status_enum as enum ('pendente', 'aceito', 'rejeitado');

-- Create Tickets Table
create table tickets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nome_usuario text not null,
  setor setor_enum not null,
  descricao_problema text not null,
  tentativas_anteriores text,
  screenshot_url text,
  status status_enum default 'pendente'::status_enum not null
);

-- Enable RLS
alter table tickets enable row level security;

-- Policies (Simplified for internal tool usage - Adjust as needed for Auth)
-- For public insert (if no auth required for submission)
create policy "Enable insert for everyone" on tickets for insert with check (true);

-- For admin view (assuming admins are authenticated or just public for now based on prompt simplicity, 
-- but ideally should be restricted. Here allowing select for simplicity as 'internal tool')
create policy "Enable select for everyone" on tickets for select using (true);

-- For admin update
create policy "Enable update for everyone" on tickets for update using (true);

-- Storage Bucket for Screenshots
insert into storage.buckets (id, name) values ('screenshots', 'screenshots');

-- Storage Policies
create policy "Enable upload for everyone" on storage.objects for insert with check (bucket_id = 'screenshots');
create policy "Enable read for everyone" on storage.objects for select using (bucket_id = 'screenshots');
