const { create } = require('@wppconnect-team/wppconnect');

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
  session: 'demo-bot',
  headless: true,
  useChrome: false,
  autoClose: 0,
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

      // Fluxo Barbeiro
      if (estado.barbeiroEtapa) {
        switch (estado.barbeiroEtapa) {
          case 'nome':
            estado.nome = msg.body;
            estado.barbeiroEtapa = 'telefone';
            estados.set(contato, estado);
            return client.sendText(contato, '📱 Informe seu telefone com DDD:');

          case 'telefone':
            estado.telefone = msg.body;
            estado.barbeiroEtapa = 'servico';
            estados.set(contato, estado);
            return client.sendText(contato, '💈 Qual serviço deseja?\n1️⃣ Barba - R$ 20\n2️⃣ Corte - R$ 30\n3️⃣ Pezinho - R$ 15');

          case 'servico':
            switch (texto) {
              case '1':
                estado.servico = 'Barba - R$ 20';
                break;
              case '2':
                estado.servico = 'Corte - R$ 30';
                break;
              case '3':
                estado.servico = 'Pezinho - R$ 15';
                break;
              default:
                return client.sendText(contato, '❗ Opção inválida. Digite 1, 2 ou 3.');
            }
            estado.barbeiroEtapa = 'data';
            estados.set(contato, estado);
            return client.sendText(contato, '📅 Informe o dia do agendamento (ex: 05/07):');

          case 'data':
            estado.data = msg.body;
            estado.barbeiroEtapa = 'hora';
            estados.set(contato, estado);
            return client.sendText(contato, '⏰ Informe o horário (ex: 15:00):');

          case 'hora':
            estado.hora = msg.body;
            const resumo = `💈 *Novo Agendamento - Barbeiro*

👤 Nome: ${estado.nome}
📱 Telefone: ${estado.telefone}
✂️ Serviço: ${estado.servico}
📅 Dia: ${estado.data}
⏰ Hora: ${estado.hora}`;

            const numeroBarbeiro = '5514996435877@c.us';

            try {
              const status = await client.checkNumberStatus(numeroBarbeiro);
              if (status.canReceiveMessage) {
                await client.sendText(numeroBarbeiro, resumo);
              }
            } catch (err) {
              console.error('❌ Erro ao enviar para o barbeiro:', err);
            }

            await client.sendText(contato, '✅ Agendamento feito com sucesso! Em breve confirmaremos com você. Digite *menu* para voltar.');
            estados.delete(contato);
            return;
        }
      }

      // Fluxo Corretor (sem envio)
      if (estado.corretorEtapa) {
        switch (estado.corretorEtapa) {
          case 'inicio':
            if (['1', '2', '3'].includes(texto)) {
              estado.corretorEscolha = texto;
              estado.corretorEtapa = 'nome';
              estados.set(contato, estado);
              return client.sendText(contato, '👤 Qual seu nome completo?');
            } else {
              return client.sendText(contato, '❗ Escolha:\n1️⃣ Vender\n2️⃣ Comprar\n3️⃣ Alugar');
            }

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
            return client.sendText(contato, '💰 Valor estimado:');

          case 'valor':
            await client.sendText(contato, '✅ Informações recebidas! Em breve um corretor entrará em contato.');
            estados.delete(contato);
            return;
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
          return client.sendText(contato, `💈 *Barbeiro Exemplo*\n\n1️⃣ Barba: R$ 20\n2️⃣ Corte: R$ 30\n3️⃣ Pezinho: R$ 15\n\n✍️ Vamos agendar! Qual seu nome?`);

        case '2':
          return client.sendText(contato, `🏋️ *Academia Exemplo*\n\n1️⃣ Musculação: R$ 99/mês\n2️⃣ Natação: R$ 120/mês\n3️⃣ Pilates: R$ 150/mês\n\nHorário: Seg a Sex das 6h às 22h`);

        case '3':
          estados.set(contato, { corretorEtapa: 'inicio' });
          return client.sendText(contato, `🏘️ *Corretor de Imóveis*\n\n1️⃣ Vender\n2️⃣ Comprar\n3️⃣ Alugar`);

        default:
          return client.sendText(contato, '❓ Opção inválida. Digite *menu* para ver novamente.');
      }
    });
  })
  .catch((erro) => {
    console.error('Erro ao iniciar o bot:', erro);
  });
