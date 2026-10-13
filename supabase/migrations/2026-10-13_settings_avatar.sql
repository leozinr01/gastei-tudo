-- Foto de perfil, já reduzida pelo app (imagem pequena guardada como texto).
alter table public.settings
  add column if not exists avatar text check (char_length(avatar) <= 300000);
