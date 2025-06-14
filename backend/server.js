const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

console.log('🚀 Iniciando servidor...');

// Configuração do banco de dados
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'augebit',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

const app = express();
const PORT = 4000; // ✅ Porta alterada

console.log('⚙️ Configurando middlewares...');

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

console.log('📊 Criando pool de conexões...');

// Pool de conexões
const pool = mysql.createPool({
  ...dbConfig,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Teste de conexão na inicialização
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ ERRO: Não foi possível conectar ao banco de dados!');
    console.error('Detalhes:', err.message);
  } else {
    console.log('✅ Conexão com banco de dados estabelecida!');
    connection.release();
  }
});

console.log('🛣️ Registrando rotas...');

// Rota de teste
app.get('/', (req, res) => {
  console.log('📥 GET / - Teste de API');
  res.json({ 
    message: 'API funcionando corretamente!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Middleware de conexão com timeout
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Nova requisição`);
  
  req.setTimeout(30000, () => {
    console.log('⏰ Timeout na requisição');
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: 'Timeout na requisição'
      });
    }
  });

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('❌ Erro ao obter conexão:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro de conexão com o banco de dados',
        details: err.message
      });
    }
    
    req.dbConnection = connection;
    res.on('finish', () => {
      if (connection) connection.release();
    });
    next();
  });
});




//==============================RETIRAR ESSA PARTE==========================================





// Rota para salvar um novo agendamento
app.post('/agendamentos', (req, res) => {
  console.log('📥 POST /agendamentos - Dados recebidos:', req.body);

  const { nome, cpf, telefone, email, data, horario, profissional } = req.body;

  // Validação dos campos obrigatórios
  if (!nome || !cpf || !telefone || !email || !data || !horario || !profissional) {
    console.log('❌ Campos faltando:', { nome, cpf, telefone, email, data, horario, profissional });
    return res.status(400).json({
      success: false,
      message: 'Todos os campos são obrigatórios.'
    });
  }


  // Validação adicional de dados
  if (nome.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Nome deve ter pelo menos 2 caracteres.'
    });
  }

  if (cpf.replace(/\D/g, '').length !== 11) {
    return res.status(400).json({
      success: false,
      message: 'CPF deve ter 11 dígitos.'
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido.'
    });
  }

  // Verificar se já existe agendamento para o mesmo profissional, data e horário
  const queryVerifica = `
    SELECT id FROM agendamentos 
    WHERE profissional = ? AND data = ? AND horario = ?
  `;

  req.dbConnection.query(queryVerifica, [profissional, data, horario], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar conflito:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar disponibilidade.',
        details: err.message
      });
    }

    if (results.length > 0) {
      console.log('⚠️ Conflito de horário detectado');
      return res.status(400).json({
        success: false,
        message: 'Já existe um agendamento para este profissional neste horário.'
      });
    }

    // Inserir novo agendamento
    const queryInsert = `
      INSERT INTO agendamentos (nome, cpf, telefone, email, data, horario, profissional)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    req.dbConnection.query(queryInsert, [nome, cpf, telefone, email, data, horario, profissional], (err, result) => {
      if (err) {
        console.error('❌ Erro ao inserir agendamento:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao salvar agendamento.',
          details: err.message
        });
      }

      console.log('✅ Agendamento salvo com sucesso! ID:', result.insertId);
      res.status(201).json({
        success: true,
        message: 'Agendamento salvo com sucesso!',
        agendamentoId: result.insertId
      });
    });
  });
});

// Outras rotas...
app.get('/agendamentos', (req, res) => {
  console.log('📥 GET /agendamentos - Listando agendamentos');
  const query = 'SELECT id, nome, cpf, telefone, email, data, horario, profissional FROM agendamentos ORDER BY data DESC, horario DESC';
  
  req.dbConnection.query(query, (err, results) => {
    if (err) {
      console.error('❌ Erro ao consultar agendamentos:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro ao consultar agendamentos',
        details: err.message
      });
    }
    
    console.log(`✅ Retornando ${results.length} agendamentos`);
    res.json({
      success: true,
      agendamentos: results
    });
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('💥 Erro no servidor:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: err.message
  });
});

// Rota não encontrada
app.use((req, res) => {
  console.log(`❌ Rota não encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false, 
    message: `Rota não encontrada: ${req.method} ${req.path}`,
    availableRoutes: [
      'GET /',
      'GET /agendamentos',
      'POST /agendamentos'
    ]
  });
});


//==============================PAROWWWWWWWWWWWWWWWWWWWWWW==========================================






// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('🎉 SERVIDOR INICIADO COM SUCESSO!');
  console.log(`📍 Porta: ${PORT}`);
  console.log(`🏠 IP Local: http://localhost:${PORT}`);
  console.log(`🌐 IP Rede: http://SEU_IP:${PORT}`);
  console.log('🛣️ ROTAS DISPONÍVEIS:');
  console.log(`   • GET  / - Status da API`);
  console.log(`   • GET  /agendamentos - Listar agendamentos`);
  console.log(`   • POST /agendamentos - Criar agendamento`);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Erro não tratado:', error);
});

process.on('SIGINT', () => {
  console.log('👋 Encerrando servidor...');
  pool.end(err => {
    if (err) console.error('❌ Erro ao encerrar pool:', err);
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});