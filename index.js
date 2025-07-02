const { create } = require('@wppconnect-team/wppconnect');

const estados = new Map();
const timeouts = new Map();

function emHorarioComercial() {
  const agora = new Date();
  const hora = agora.getHours();
  const dia = agora.getDay();
  if (dia === 0) return false;
  if (dia === 6) return hora >= 8 && hora < 12;
  return hora >= 6 && hora < 21.5;
}

const menu = `🤖 *Bot de Demonstração* – Escolha uma opção:

1⃣ Academia
2⃣ Corretor de Imóveis
3⃣ Restaurante
4⃣ Loja de Roupas
5⃣ Salão de Beleza
6⃣ Agência de Marketing`;

create({
  session: 'demo-bot',
  headless: true,
  useChrome: false,
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

      // Interação da Agência
      if (estado.agenciaEtapa === 'aguardandoEscolha') {
        if (timeouts.has(contato)) {
          clearTimeout(timeouts.get(contato));
          timeouts.delete(contato);
        }

        switch (texto) {
          case '1':
            return client.sendText(contato, '📦 Planos a partir de R$ 699/mês incluindo tráfego pago, artes e social media.\n\n👉 Deseja receber o catálogo com os planos?');
          case '2':
            return client.sendText(contato, '📍 Perfil no Google por apenas R$ 29,90/mês.\n\n👉 Deseja que a gente te envie os detalhes?');
          case '3':
            return client.sendText(contato, '📲 Trabalhamos com campanhas e conteúdos estratégicos.\n\n👉 Me diga seu nicho para mostrar cases reais.');
          case '4':
            return client.sendText(contato, '📞 Beleza! Vou chamar um dos nossos especialistas agora mesmo. Aguarde um instante...');
          default:
            return client.sendText(contato, '❓ Opção inválida. Responda com 1, 2, 3 ou 4.');
        }
      }

      // Interação Corretor
      if (estado.corretorEtapa) {
        const etapa = estado.corretorEtapa;

        if (etapa === 'inicio') {
          if (['1', '2', '3'].includes(texto)) {
            estado.corretorEscolha = texto;
            estado.corretorEtapa = 'nome';
            estados.set(contato, estado);
            return client.sendText(contato, '👤 Qual seu nome completo?');
          } else {
            return client.sendText(contato, '❗ Escolha:\n1️⃣ Vender\n2️⃣ Comprar\n3️⃣ Alugar');
          }
        }

        if (etapa === 'nome') {
          estado.nome = msg.body;
          estado.corretorEtapa = 'telefone';
          estados.set(contato, estado);
          return client.sendText(contato, '📱 Informe seu número com DDD:');
        }

        if (etapa === 'telefone') {
          estado.telefone = msg.body;
          estado.corretorEtapa = 'tipo';
          estados.set(contato, estado);
          return client.sendText(contato, '🏠 Tipo do imóvel (casa, apto, barracão...):');
        }

        if (etapa === 'tipo') {
          estado.tipo = msg.body;
          estado.corretorEtapa = 'valor';
          estados.set(contato, estado);

          const label =
            estado.corretorEscolha === '1'
              ? '💰 Valor para venda:'
              : estado.corretorEscolha === '2'
              ? '💵 Valor pretendido para compra:'
              : '📊 Valor máximo do aluguel:';

          return client.sendText(contato, label);
        }

        if (etapa === 'valor') {
          estado.valor = msg.body;
          const tipoAcao =
            estado.corretorEscolha === '1'
              ? '📤 VENDA'
              : estado.corretorEscolha === '2'
              ? '📥 COMPRA'
              : '📄 LOCAÇÃO';

          const msgCorretor = `🏘️ Novo contato – ${tipoAcao}\n\n👤 Nome: ${estado.nome}\n📱 Tel: ${estado.telefone}\n🏠 Imóvel: ${estado.tipo}\n💸 Valor: ${estado.valor}`;
          const numeroCorretor = '5514999999999@c.us';

          try {
            const status = await client.checkNumberStatus(numeroCorretor);
            if (status.canReceiveMessage) {
              await client.sendText(numeroCorretor, msgCorretor);
            }
          } catch (err) {
            console.error('Erro ao enviar ao corretor', err);
          }

          await client.sendText(
            contato,
            '✅ Seus dados foram enviados ao corretor. Ele entrará em contato em breve. Digite *menu* para voltar.'
          );
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
          return client.sendText(
            contato,
            `🏋️ *Academia Exemplo*\n\n1️⃣ Musculação: R$ 99/mês\n2️⃣ Natação: R$ 120/mês\n3️⃣ Pilates: R$ 150/mês\n\nHorário: Seg a Sex das 6h às 22h`
          );

        case '2':
          estados.set(contato, { corretorEtapa: 'inicio' });
          return client.sendText(
            contato,
            `🏘️ *Corretor de Imóveis*\n\n1️⃣ Vender\n2️⃣ Comprar\n3️⃣ Alugar`
          );

        case '3':
          return client.sendText(
            contato,
            `🍽️ *Restaurante Exemplo*\n\n📍 Rua das Flores, 123\n🕒 Seg a Dom das 11h às 23h\n\n🍕 Prato do dia: Lasanha R$ 29,90\n📞 Para reservas envie seu nome e horário desejado.`
          );

        case '4':
          return client.sendText(
            contato,
            `👗 *Loja de Roupas Exemplo*\n\n👕 Camisetas a partir de R$ 49,90\n👖 Calças a partir de R$ 89,90\n🛍️ Promoção: Leve 3 pague 2!`
          );

        case '5':
          return client.sendText(
            contato,
            `💇‍♀️ *Salão de Beleza Exemplo*\n\n💅 Manicure: R$ 35,00\n✂️ Corte feminino: R$ 60,00\n📅 Para agendar envie seu nome + dia + horário desejado.`
          );

        case '6':
          if (timeouts.has(contato)) {
            clearTimeout(timeouts.get(contato));
            timeouts.delete(contato);
          }

          await client.sendText(
            contato,
            `🤖 *Fluxo Automático – Chatbot Agência*\n\n📍 *Mensagem de Boas-Vindas*\nOlá! 👋\nVocê está falando com a *xxxxxxxxxxxxxx*, agência especializada em acelerar resultados através do tráfego pago.\n\nPra te atender melhor, me diz com qual assunto você quer falar:\n\n1️⃣ Quero saber sobre planos de marketing\n2️⃣ Preciso de criação de perfil no Google\n3️⃣ Quero impulsionar minha empresa no Instagram\n4️⃣ Falar com um especialista`
          );

          estados.set(contato, { agenciaEtapa: 'aguardandoEscolha' });

          const timeout = setTimeout(() => {
            const est = estados.get(contato);
            if (est && est.agenciaEtapa === 'aguardandoEscolha') {
              client.sendText(
                contato,
                '✅ *Com nosso serviço, sua empresa economiza tempo, atrai clientes certos e mantém presença digital forte*'
              );
              estados.delete(contato);
            }
            timeouts.delete(contato);
          }, 60000);

          timeouts.set(contato, timeout);
          return;

        default:
          return client.sendText(
            contato,
            '❓ Opção inválida. Digite *menu* para ver as opções novamente.'
          );
      }
    });
  })
  .catch((erro) => {
    console.error('Erro ao iniciar o bot:', erro);
  });
