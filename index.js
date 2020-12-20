const venom = require('venom-bot');
const { Telegraf } = require('telegraf');
const scrap = require('./scrap');

const TOKEN = "1453249084:AAElHIpyG9nbFHl-Ppqr68Tobue3u6XkDDo";

const bot = new Telegraf(TOKEN);

bot.start( ctx => {
    ctx.reply('Ws scrapping bot');
});
 
bot.command('login', ctx => {
    let body = ctx.update.message.text;
    let texto = body.split(' ');
    let nombre = texto[1];

    if (nombre) {
        login(nombre);
        ctx.reply('Cargando...(Espera 20 segundos)');
        setTimeout(() => {
            ctx.replyWithPhoto({source : 'out.png'});
        }, 9000);    
    } else {
        ctx.reply('Introduce el nombre de la session...');
    }  
});

bot.command('scrap', (ctx) => {
    let body = ctx.update.message.text;
    let texto = body.split(' ');
    let nombre = texto[1];

    ctx.reply('Iniciando...');
    scrap.start(nombre)
});

bot.launch();

async function login(sessionName) {
    venom
    .create(
        sessionName,
        (base64Qr, asciiQR) => {
          console.log(asciiQR); // Optional to log the QR in the terminal
          var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
            response = {};
    
          if (matches.length !== 3) {
            return new Error('Invalid input string');
          }
          response.type = matches[1];
          response.data = new Buffer.from(matches[2], 'base64');
    
          var imageBuffer = response;
          require('fs').writeFile(
            'out.png',
            imageBuffer['data'],
            'binary',
            function (err) {
              if (err != null) {
                console.log(err);
              }
            }
          );
        },
        undefined,
        { logQR: false }
      )
    .then(cliente => {
        client = cliente;
    })
    .catch(err => {
        console.log(err);
    })
}
