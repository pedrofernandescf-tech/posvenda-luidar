-- =============================================
-- SISTEMA PÓS-VENDA GRUPO LIDAR
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'colaborador' CHECK (role IN ('admin', 'colaborador')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lojas
CREATE TABLE IF NOT EXISTS public.lojas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de clientes (importados das planilhas)
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  vendedor TEXT,
  valor_compra DECIMAL(10,2),
  produto TEXT,
  data_compra DATE,
  mes_referencia TEXT NOT NULL, -- ex: "2025-04"
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'atendido', 'nao_atendeu', 'inexistente', 'caixa_postal', 'retorno')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de atendimentos (cada ligação registrada)
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES public.lojas(id),
  colaborador_id UUID REFERENCES public.profiles(id),
  colaborador_nome TEXT,
  status_ligacao TEXT NOT NULL CHECK (status_ligacao IN ('atendida', 'nao_atendeu', 'inexistente', 'caixa_postal', 'retorno')),
  nota_satisfacao INTEGER CHECK (nota_satisfacao BETWEEN 1 AND 5),
  bem_atendido BOOLEAN,
  produto_entregue TEXT CHECK (produto_entregue IN ('sim', 'nao', 'nao_aplica')),
  voltaria_comprar TEXT CHECK (voltaria_comprar IN ('sim', 'nao', 'talvez')),
  observacoes TEXT,
  atencao_necessaria BOOLEAN DEFAULT FALSE,
  data_ligacao TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View para dashboard: resumo por loja no mês
CREATE OR REPLACE VIEW public.resumo_lojas AS
SELECT
  l.id AS loja_id,
  l.nome AS loja_nome,
  l.cidade,
  c.mes_referencia,
  COUNT(c.id) AS total_clientes,
  COUNT(CASE WHEN c.status = 'atendido' THEN 1 END) AS total_atendidos,
  COUNT(CASE WHEN c.status = 'pendente' THEN 1 END) AS total_pendentes,
  ROUND(AVG(CASE WHEN a.nota_satisfacao IS NOT NULL THEN a.nota_satisfacao END)::NUMERIC, 2) AS media_satisfacao,
  CASE WHEN COUNT(CASE WHEN c.status = 'atendido' THEN 1 END) >= 10 THEN TRUE ELSE FALSE END AS meta_atingida
FROM public.lojas l
LEFT JOIN public.clientes c ON c.loja_id = l.id
LEFT JOIN public.atendimentos a ON a.cliente_id = c.id AND a.status_ligacao = 'atendida'
GROUP BY l.id, l.nome, l.cidade, c.mes_referencia;

-- RLS (segurança por usuário)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Políticas: todos os usuários autenticados podem ler e escrever
CREATE POLICY "Usuarios autenticados podem ler perfis" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios podem editar proprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuarios autenticados acessam lojas" ON public.lojas FOR ALL TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados acessam clientes" ON public.clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados acessam atendimentos" ON public.atendimentos FOR ALL TO authenticated USING (true);

-- Trigger para criar perfil automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'colaborador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir lojas iniciais do Grupo Lidar
INSERT INTO public.lojas (nome, cidade) VALUES
  ('Loja Centro', 'Cidade 1'),
  ('Loja Norte', 'Cidade 2'),
  ('Loja Sul', 'Cidade 3')
ON CONFLICT DO NOTHING;
