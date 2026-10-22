# Site do Subarashi

Cardápio online com dois jeitos de pedir:

- **Delivery**: o cliente monta o pedido em `/` e envia pelo WhatsApp.
- **Na mesa**: o cliente escaneia o QR code da mesa, escolhe *rodízio* ou *à la carte*,
  e o pedido vai direto para a tela da cozinha. Também dá para **chamar o garçom** e **pedir a conta**.

## Como rodar

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo. Não há dependências para instalar.

```bash
PIN=4821 PIN_GERENTE=730519 PUBLIC_URL=https://seu-dominio.com.br node server.js
```

| Variável | Para que serve | Padrão |
|---|---|---|
| `PIN` | Senha da equipe: tela da cozinha, servir pedidos e fechar contas | `1234` (troque!) |
| `PIN_GERENTE` | Senha do gerente: tudo da equipe + painel de métricas, cadastro de garçons, ajustes e QR codes | `9876` (troque!) |
| `PUBLIC_URL` | Endereço público do site, usado dentro dos QR codes | o endereço acessado |
| `PORT` | Porta do servidor | `3000` |

## Páginas

| Endereço | Quem usa |
|---|---|
| `/` | Clientes (delivery) |
| `/?mesa=N&k=...` | Clientes na mesa (aberto pelo QR code) |
| `/cozinha` | Cozinha e garçons (pede o PIN). Mostra pedidos novos, em preparo e prontos, e os chamados das mesas, com alerta sonoro |
| `/painel` | Gerente (PIN do gerente): faturamento, ticket médio, garçons e comissões, formas de pagamento, itens mais pedidos, contas fechadas, cadastro da equipe e ajustes |
| `/mesas` | Gerente: gera e imprime os QR codes das mesas |

## App da equipe (celular e computador)

Pedidos, cozinha, painel e QR codes funcionam como **app instalável** (PWA). O cardápio dos clientes continua sendo o site.

- **Android (Chrome)**: abra `https://seu-dominio/cozinha` → menu ⋮ → **Instalar app** (ou o botão **Instalar app** na barra do app).
- **iPhone/iPad (Safari)**: abra o mesmo endereço → **Compartilhar** → **Adicionar à Tela de Início**.
- **Windows/Mac (Chrome ou Edge)**: ícone de instalar na barra de endereço, ou o botão **Instalar app**.

O app abre em tela cheia com o ícone do Subarashi, mantém a tela do tablet da cozinha acesa e vibra
o celular a cada pedido novo. Ele precisa de internet: os pedidos chegam do servidor em tempo real.
Para instalar em outros aparelhos, o site precisa estar no ar com **HTTPS**.

## Como funciona no dia a dia

1. O gerente cadastra os garçons no **Painel** (seção Equipe) e confere a comissão e o valor do rodízio (seção Ajustes).
2. Cliente senta, escaneia o QR da mesa e escolhe rodízio ou à la carte.
3. Pede pelo celular → o pedido aparece na tela da cozinha com um bipe.
4. A cozinha toca em **Começar preparo** → **Marcar como pronto** → o garçom leva e toca em **Servir na mesa**,
   escolhendo o próprio nome. **Quem serve primeiro fica responsável pela mesa** (é dele a comissão da conta).
   O cliente acompanha tudo em **Meus pedidos**.
5. **Chamar garçom** / **Pedir a conta** aparecem em vermelho no topo da tela da cozinha.
6. Na hora de pagar, toque em **Fechar conta**: confira o garçom, informe quantas pessoas comeram no rodízio,
   algum desconto/taxa e a forma de pagamento. O total entra no faturamento do Painel e a mesa é liberada.

## Arquivos

- `menu.js` — **o cardápio** (itens, preços, fotos e a lista do rodízio). Edite só aqui.
- `server.js` — servidor (pedidos, chamados, tela da cozinha em tempo real).
- `data/` — pedidos salvos e o segredo que assina os QR codes. **Não apague `data/config.json`**,
  senão os QR codes impressos param de funcionar.

## Para colocar no ar

O site precisa de um servidor Node ligado o tempo todo (não funciona em hospedagem só de HTML).
Opções: um serviço como Render, Railway ou uma VPS, ou um computador ligado no restaurante
com o site exposto na internet. Use **HTTPS** e um **PIN forte**.

Limitações: o sistema não emite nota fiscal, não cobra o cliente e não substitui o caixa (PDV);
ele organiza os pedidos e chamados. O valor do rodízio é cobrado por pessoa no caixa.
