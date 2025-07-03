const { create } = require('@wppconnect-team/wppconnect');
const axios = require('axios');

const estados = new Map();

function emHorarioComercial() {
  const agora = new Date();
  const hora = agora.getHours();
  const dia = agora.getDay();
  if (dia === 0) return false;
  if (dia === 6) return hora >= 8 && hora < 12;
  return hora >= 6 && hora < 21.5;
}

const menu = `🤖 *Bot de Demonstração* – Escolha uma opção:

1️⃣ Barbeiro
2️⃣ Academia
3️⃣ Corretor de Imóveis`;

create({
  session: 'bot-teste-clientes',
  headless: true,
  useChrome: true,
  puppeteerOptions: {
    args: ['--disable-setuid-sandbox'],
  },
  catchQR: (base64Qr, asciiQR) => {
    console.clear();
    console.log('📲 Escaneie o QR Code abaixo para conectar o WhatsApp:\n');
    console.log(asciiQR);
  },
})
  .then((client) => {
    console.log('🤖 Bot iniciado com sucesso!');

    client.onMessage(async (msg) => {
      const contato = msg.from;
      const texto = msg.body.trim().toLowerCase();
      const estado = estados.get(contato) || {};

      if (texto === 'menu') {
        estados.set(contato, { iniciado: true });
        return client.sendText(contato, `🔁 Atendimento reiniciado!\n\n${menu}`);
      }

      // Barbeiro
      if (estado.barbeiroEtapa) {
        switch (estado.barbeiroEtapa) {
          case 'nome':
            estado.nome = msg.body;
            estado.barbeiroEtapa = 'telefone';
            estados.set(contato, estado);
            return client.sendText(contato, '📱 Informe seu telefone:');

          case 'telefone':
            estado.telefone = msg.body;
            estado.barbeiroEtapa = 'servico';
            estados.set(contato, estado);
            return client.sendText(contato, '✂️ Qual serviço deseja?\n1️⃣ Barba (R$ 25)\n2️⃣ Corte (R$ 40)\n3️⃣ Pezinho (R$ 15)');

          case 'servico':
            const servicos = { '1': 'Barba (R$ 25)', '2': 'Corte (R$ 40)', '3': 'Pezinho (R$ 15)' };
            if (!servicos[texto]) {
              return client.sendText(contato, '❗ Opção inválida. Escolha 1, 2 ou 3.');
            }
            estado.servico = servicos[texto];
            estado.barbeiroEtapa = 'datahora';
            estados.set(contato, estado);
            return client.sendText(contato, '📅 Informe o dia e horário do agendamento:');

          case 'datahora':
            estado.datahora = msg.body;
            estados.delete(contato);

            const resumo = `💈 *Novo Agendamento - Barbeiro*\n\n👤 Nome: ${estado.nome}\n📱 Tel: ${estado.telefone}\n🧾 Serviço: ${estado.servico}\n📅 Data e hora: ${estado.datahora}`;

            try {
              const numero = '5514996435877@c.us';
              const status = await client.checkNumberStatus(numero);
              if (status.canReceiveMessage) {
                await client.sendText(numero, resumo);
              }
            } catch (err) {
              console.error('❌ Erro ao enviar para o barbeiro:', err);
            }

            return client.sendText(contato, '✅ Agendamento enviado! Em breve entraremos em contato. Digite *menu* para voltar.');
        }
      }

      // Corretor
      if (estado.corretorEtapa) {
        switch (estado.corretorEtapa) {
          case 'inicio':
            if (!['1', '2', '3'].includes(texto)) {
              return client.sendText(contato, '❗ Escolha:\n1️⃣ Vender\n2️⃣ Comprar\n3️⃣ Alugar');
            }
            estado.acao = texto;
            estado.corretorEtapa = 'nome';
            estados.set(contato, estado);
            return client.sendText(contato, '👤 Qual seu nome completo?');

          case 'nome':
            estado.nome = msg.body;
            estado.corretorEtapa = 'telefone';
            estados.set(contato, estado);
            return client.sendText(contato, '📱 Informe seu telefone:');

          case 'telefone':
            estado.telefone = msg.body;
            estado.corretorEtapa = 'tipo';
            estados.set(contato, estado);
            return client.sendText(contato, '🏠 Tipo do imóvel:');

          case 'tipo':
            estado.tipo = msg.body;
            estado.corretorEtapa = 'valor';
            estados.set(contato, estado);
            return client.sendText(contato, '💸 Valor pretendido:');

          case 'valor':
            estado.valor = msg.body;

            // Enviar para Google Sheets
            try {
              await axios.post('https://script.google.com/macros/s/AKfycbz4t6wHPzsi9Wo6UPtK27NOuM2E1hsR7jqQ3e1skw9pem0oB9edAE_pO78-AUqNIKKYoQ/exec', {
                nome: estado.nome,
                telefone: estado.telefone,
                tipo: estado.tipo,
                valor: estado.valor
              });
            } catch (erro) {
              console.error('❌ Erro ao enviar para Google Sheets:', erro.message);
            }

            estados.delete(contato);
            return client.sendText(contato, '✅ Obrigado! Seus dados foram registrados e enviados para o corretor. Digite *menu* para voltar.');
        }
      }

      // Início da conversa
      if (!estado.iniciado) {
        const saudacao = emHorarioComercial()
          ? '👋 Bem-vindo!'
          : '👋 Estamos fora do horário comercial.';
        await client.sendText(contato, `${saudacao}\n\n${menu}`);
        estados.set(contato, { iniciado: true });
        return;
      }

      // Menu principal
      switch (texto) {
        case '1':
          estados.set(contato, { barbeiroEtapa: 'nome' });
          return client.sendText(
            contato,
            `💈 *Barbearia Exemplo*\n\n💵 Preços:\n- Barba: R$ 25\n- Corte: R$ 40\n- Pezinho: R$ 15\n\n✍️ Vamos agendar! Qual seu nome?`
          );

        case '2':
          return client.sendText(
            contato,
            `🏋️ *Academia Exemplo*\n\n1️⃣ Musculação: R$ 99/mês\n2️⃣ Natação: R$ 120/mês\n3️⃣ Pilates: R$ 150/mês\n\nHorário: Seg a Sex das 6h às 22h`
          );

        case '3':
          estados.set(contato, { corretorEtapa: 'inicio' });
          return client.sendText(
            contato,
            `🏘️ *Corretor de Imóveis*\n\n1️⃣ Vender\n2️⃣ Comprar\n3️⃣ Alugar`
          );

        default:
          return client.sendText(
            contato,
            '❓ Opção inválida. Digite *menu* para ver novamente.'
          );
      }
    });
  })
  .catch((erro) => {
    console.error('❌ Erro ao iniciar o bot:', erro);
  });
