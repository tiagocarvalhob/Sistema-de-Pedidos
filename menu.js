// Cardápio do Subarashi — usado pelo site (delivery e mesa) e pelo servidor.
// Para alterar preços ou itens, edite só este arquivo.
(function (root) {
  const MENU = [
    { id:"combinados", nome:"Combinados", sub:"Para dividir", itens:[
      { n:"Combinado VIP", d:"Monte o combinado do seu jeito, escolhendo as peças que preferir.", p:20.97, aPartir:true, tag:"Monte o seu", img:"combo-vip.jpg" },
      { n:"Combinado 15", d:"15 peças: 2 joes de salmão com patê, 2 niguiris de saint peter, 3 uramakis de salmão, 2 uramakis Califórnia, 2 hossomakis de salmão e 4 hot Philadelphia.", p:47.90, img:"if-202402231326_MJ53_i.jpg" },
      { n:"Combinado 17", d:"17 peças: 3 sashimis de salmão, 2 gunkans de salmão com geleia de maracujá, 2 joes de salmão com patê, 3 uramakis de salmão, 2 hossomakis de salmão e 5 hot Philadelphia.", p:52.90, img:"combo-17.jpg" },
      { n:"Combinado 22", d:"22 peças: 5 sashimis de salmão, 3 niguiris de salmão, 2 niguiris skin, 5 uramakis de salmão, 2 uramakis skin e 5 hossomakis Philadelphia.", p:65.90, img:"if-202402231328_N0OW_i.jpg" },
      { n:"Combinado 26", d:"26 peças: 4 niguiris de salmão, 4 niguiris de saint peter, 6 hot Philadelphia, 6 hossomakis de salmão e 6 uramakis Califórnia.", p:69.90, img:"combo-26.jpg" },
      { n:"Combinado 35", d:"35 peças: 5 sashimis de salmão, 5 sashimis de peixe branco, 2 gunkans de salmão, 2 gunkans de peixe branco, 2 niguiris de salmão, 2 niguiris de kani, 2 niguiris skin, 5 uramakis Califórnia, 5 hossomakis Philadelphia e 5 hot Philadelphia.", p:94.90, img:"combo-35.jpg" },
      { n:"Combinado 50", d:"50 peças: 6 sashimis de salmão, 6 gunkans de salmão, 6 niguiris de saint peter, 6 hossomakis de salmão, 6 bolinhos de tilápia, 10 uramakis Califórnia e 10 hot Philadelphia.", p:139.90, img:"combo-50.jpg" },
      { n:"Premium 50", d:"50 peças: 5 sashimis de salmão, 5 sashimis de peixe branco, 5 gunkans de salmão com geleia de maracujá, 5 joes de salmão com patê, 3 niguiris de atum, 3 niguiris de salmão, 4 niguiris de saint peter, 5 hossomakis Philadelphia, 5 uramakis de salmão e 10 hot Philadelphia.", p:149.90, tag:"Premium", img:"premium-50.jpg" },
      { n:"Combinado 60", d:"60 peças: 8 sashimis de salmão, 8 sashimis de peixe branco, 3 niguiris de salmão, 3 niguiris skin, 3 niguiris de saint peter, 5 hossomakis de salmão, 5 hossomakis Philadelphia, 5 uramakis de salmão, 5 uramakis Califórnia, 5 uramakis skin e 10 hot Philadelphia.", p:169.90, img:"combo-60.jpg" },
      { n:"Combinado 90", d:"90 peças: 10 sashimis de salmão, 10 de peixe branco, 5 gunkans com geleia de maracujá, 5 gunkans de tilápia, 5 joes com patê de salmão, 5 joes com crispy de alho-poró, 4 niguiris skin, 4 de salmão, 3 de kani, 4 de saint peter, 5 uramakis de salmão, 5 hossomakis de salmão, 5 hossomakis com patê, 10 hot Philadelphia e 10 bolinhos de tilápia.", p:229.00, tag:"Família", img:"if-202312141317_L81A_i.jpg" }
    ]},
    { id:"temakis", nome:"Temakis", sub:"Cone de alga nori", itens:[
      { n:"Temaki Salmão", d:"300 g de salmão em cubos, cream cheese e cebolinha no cone de nori.", p:51.90, tag:"300 g", img:"temaki-salmao.jpg" },
      { n:"Temaki Clássico de Salmão", d:"Salmão em cubos, arroz, cream cheese e cebolinha.", p:39.90, img:"if-202312141425_DCA3_i.jpg" },
      { n:"Temaki Hot", d:"Salmão em cubos, arroz, cream cheese e cebolinha, empanado e frito.", p:48.90, img:"if-202312141429_EMF8_i.jpg" }
    ]},
    { id:"hots", nome:"Hots", sub:"Empanados e crocantes", itens:[
      { n:"Hot Philadelphia", d:"Hossomaki de salmão empanado e frito, finalizado com cream cheese, gergelim e cebolinha.", p:31.90, tag:"Favorito", img:"if-202312141426_68EL_i.jpg" },
      { n:"Hot Banana com Avelã", d:"Hossomaki de banana empanado, finalizado com creme de avelã.", p:19.90, tag:"Doce", img:"if-202312141535_O34O_i.jpg" }
    ]},
    { id:"sashimis", nome:"Sashimis & Niguiris", sub:"Peixe fresco", itens:[
      { n:"Sashimi", d:"Fatias de atum, salmão, polvo e peixe branco. Porção com 8 unidades.", p:37.90, img:"if-202312162251_5WA5_i.jpg" },
      { n:"Niguiri de salmão", d:"Bolinho de arroz com fatia de salmão. 6 unidades.", p:26.00, img:"if-202312162252_WUK3_i.jpg" },
      { n:"Niguiri de salmão maçaricado", d:"Salmão levemente maçaricado sobre o arroz. 6 unidades.", p:28.00, img:"if-202312162327_37RP_i.jpg" },
      { n:"Niguiri skin", d:"Pele de salmão crocante sobre o arroz. 6 unidades.", p:22.00, img:"niguiri-skin.jpg" }
    ]},
    { id:"gunkan", nome:"Gunkan & Joe", sub:"6 unidades", itens:[
      { n:"Gunkan de salmão", d:"Tira fina de peixe envolvendo o cream cheese. 6 unidades.", p:28.00, img:"if-202312162318_D0A3_i.jpg" },
      { n:"Gunkan de salmão maçaricado", d:"Tira fina de peixe maçaricado envolvendo o cream cheese. 6 unidades.", p:29.00, img:"if-202312162321_JHEY_i.jpg" },
      { n:"Gunkan com geleia de maracujá", d:"Gunkan de salmão com cream cheese e geleia de maracujá. 6 unidades.", p:29.90, img:"gunkan-maracuja.jpg" },
      { n:"Joe de salmão com patê de salmão", d:"Tira fina de peixe envolvendo um bolinho de arroz, com patê de salmão. 6 unidades.", p:28.00, img:"joe-pate.jpg" },
      { n:"Joe de salmão com shimeji", d:"Tira fina de salmão envolvendo um bolinho de arroz, com shimeji. 6 unidades.", p:30.00, img:"joe-shimeji.jpg" },
      { n:"Joe de pepino com shimeji", d:"Pepino envolvendo um bolinho de arroz, com shimeji. 6 unidades.", p:24.00, img:"joe-pepino.jpg" }
    ]},
    { id:"hosomakis", nome:"Hosomakis", sub:"8 unidades", itens:[
      { n:"Hosomaki de salmão", d:"Recheio de salmão envolto em arroz e folha de nori. 8 unidades.", p:27.90, img:"hoso-salmao.jpg" },
      { n:"Hosomaki Philadelphia", d:"Salmão e cream cheese envoltos em arroz e nori. 8 unidades.", p:28.90, img:"hoso-phila.jpg" },
      { n:"Hosomaki com batidinho de salmão", d:"Finalizado com salmão picadinho e cream cheese. 8 unidades.", p:29.90, img:"hoso-batidinho.jpg" },
      { n:"Hosomaki com patê apimentado", d:"Finalizado com salmão picadinho e cream cheese com toque de sriracha. 8 unidades.", p:29.90, tag:"Picante", img:"hoso-apimentado.jpg" }
    ]},
    { id:"pokes", nome:"Pokes & Frios", sub:"Leves e frescos", itens:[
      { n:"Poke Subarashi", d:"Salmão, tilápia, manga, kani, shimeji, cream cheese e gohan.", p:49.90, tag:"Da casa", img:"poke-subarashi.jpg" },
      { n:"Poke Salmão", d:"Salmão, sunomono, gohan, kani, cream cheese e abacaxi.", p:47.90, img:"poke-salmao.jpg" },
      { n:"Carpaccio de salmão", d:"160 g de carpaccio de salmão.", p:48.90, img:"if-202312141428_24UL_i.jpg" },
      { n:"Sunomono", d:"200 g de pepino ao molho shari, finalizado com gergelim.", p:18.90, img:"sunomono.jpg" }
    ]},
    { id:"quentes", nome:"Quentes", sub:"Da cozinha", itens:[
      { n:"Shimeji", d:"Shimeji salteado na manteiga e shoyu.", p:44.00, img:"if-202312141431_D33Y_i.jpg" },
      { n:"Shimeji com abacaxi", d:"Shimeji salteado com abacaxi.", p:46.00, img:"shimeji-abacaxi.jpg" },
      { n:"Shimeji com salmão e kani", d:"Shimeji salteado com salmão e kani.", p:49.90, img:"shimeji-salmao.jpg" },
      { n:"Guioza bovina", d:"Porção frita com 6 unidades.", p:29.90, img:"gyoza-bovina.jpg" },
      { n:"Guioza suína", d:"Porção frita com 6 unidades.", p:29.90, img:"gyoza-suina.jpg" },
      { n:"Harumaki de frango com legumes", d:"Rolinho primavera de frango com legumes.", p:8.50, img:"harumaki.jpg" }
    ]},
    { id:"bebidas", nome:"Bebidas", sub:"Para acompanhar", itens:[
      { n:"Coca-Cola lata 350 ml", d:"Lata 350 ml.", p:7.90, img:"bebida-coca-lata.jpg" },
      { n:"Fanta Laranja lata 350 ml", d:"Lata 350 ml.", p:7.90, img:"bebida-fanta.jpg" },
      { n:"Coca-Cola 600 ml", d:"Garrafa 600 ml.", p:11.99, img:"bebida-coca-600.jpg" },
      { n:"Coca-Cola Zero 600 ml", d:"Garrafa 600 ml.", p:11.99, img:"bebida-coca-zero.jpg" },
      { n:"H2OH! Limoneto 500 ml", d:"Garrafa 500 ml.", p:8.99, img:"bebida-limoneto.jpg" },
      { n:"Água mineral", d:"Sem gás.", p:4.99, img:"if-202312211157_6QPA_i.jpg" },
      { n:"Água com gás", d:"Com gás.", p:4.99, img:"if-202312211153_7YTK_i.jpg" }
    ]}
  ];

  // Itens que podem ser pedidos à vontade no rodízio (sem preço). "un" = quantas peças vêm por pedido.
  const RODIZIO = [
    { id:"r-sashimis", nome:"Sashimis & Niguiris", itens:[
      { n:"Sashimi de salmão", un:"4 fatias", img:"if-202312162251_5WA5_i.jpg" },
      { n:"Sashimi de peixe branco", un:"4 fatias", img:"if-202312162251_5WA5_i.jpg" },
      { n:"Niguiri de salmão", un:"2 peças", img:"if-202312162252_WUK3_i.jpg" },
      { n:"Niguiri de salmão maçaricado", un:"2 peças", img:"if-202312162327_37RP_i.jpg" },
      { n:"Niguiri skin", un:"2 peças", img:"niguiri-skin.jpg" }
    ]},
    { id:"r-rolls", nome:"Rolls", itens:[
      { n:"Uramaki de salmão", un:"4 peças", img:"combo-26.jpg" },
      { n:"Uramaki Califórnia", un:"4 peças", img:"combo-17.jpg" },
      { n:"Hosomaki de salmão", un:"4 peças", img:"hoso-salmao.jpg" },
      { n:"Hosomaki Philadelphia", un:"4 peças", img:"hoso-phila.jpg" },
      { n:"Hot Philadelphia", un:"4 peças", img:"if-202312141426_68EL_i.jpg" },
      { n:"Hot Banana com Avelã", un:"4 peças", img:"if-202312141535_O34O_i.jpg" }
    ]},
    { id:"r-gunkan", nome:"Gunkan & Joe", itens:[
      { n:"Gunkan de salmão", un:"2 peças", img:"if-202312162318_D0A3_i.jpg" },
      { n:"Gunkan com geleia de maracujá", un:"2 peças", img:"gunkan-maracuja.jpg" },
      { n:"Joe de salmão com patê", un:"2 peças", img:"joe-pate.jpg" },
      { n:"Joe de salmão com shimeji", un:"2 peças", img:"joe-shimeji.jpg" }
    ]},
    { id:"r-temaki", nome:"Temakis (quarta-feira)", itens:[
      { n:"Temaki de salmão", un:"1 unidade", img:"if-202312141425_DCA3_i.jpg" },
      { n:"Temaki de kani", un:"1 unidade", img:"temaki-salmao.jpg" },
      { n:"Temaki de tilápia", un:"1 unidade", img:"temaki-salmao.jpg" }
    ]},
    { id:"r-quentes", nome:"Quentes & Entradas", itens:[
      { n:"Shimeji", un:"1 porção", img:"if-202312141431_D33Y_i.jpg" },
      { n:"Guioza", un:"2 unidades", img:"gyoza-bovina.jpg" },
      { n:"Camarão empanado", un:"1 porção", img:"harumaki.jpg" },
      { n:"Bolinho de tilápia", un:"2 unidades", img:"combo-50.jpg" },
      { n:"Sunomono", un:"1 porção", img:"sunomono.jpg" },
      { n:"Ceviche", un:"1 porção", img:"poke-salmao.jpg" }
    ]}
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = { MENU, RODIZIO };
  else { root.MENU = MENU; root.RODIZIO = RODIZIO; }
})(this);
