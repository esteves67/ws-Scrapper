const venom = require('venom-bot');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const fsPromises = fs.promises;
const scrap = require('./scrap');
const config = require('./config')


const bot = new Telegraf(config.TELEGRAM_TOKEN);
const helpCommands = '⚙Commands⚙ \n-------------------- \n/login {name}\n/scrap {name}\n/update\n/help\n --------------------';

bot.start( ctx => {
    ctx.reply('QR Ws scrapping bot.');
    ctx.reply(helpCommands);
});


bot.command('update', (ctx) => scrap.logs().toString() ? ctx.reply(String(scrap.logs)) : ctx.reply('[+] No hay acciones aún.') );
bot.command('help', (ctx) => ctx.reply(helpCommands));

bot.command('login', ctx => {
    let body = ctx.update.message.text;
    let texto = body.split(' ');
    let nombre = texto[1];

    if (nombre){
        loging(nombre,ctx);  
    }else{
      ctx.reply('[+] Error "/login {name}".')
    }
    
});
async function loging(nombre,ctx){
  login(nombre,ctx)
        .then( () => {
          setTimeout( () => {
            fsPromises.access('out.png', fs.constants.R_OK | fs.constants.W_OK)
              .then(() => {
                ctx.replyWithPhoto({source: 'out.png'});
                fs.unlinkSync('out.png');
              })
              .catch(() => {
                ctx.reply('[+] No existe la imagen QR');
              })
          }, 1,000);
        });

};

bot.command('scrap', (ctx) => {
    let body = ctx.update.message.text;
    let texto = body.split(' ');
    let nombre = texto[1];

    if(nombre){
      ctx.reply('[+] Iniciando...');
      scrap.start(nombre,ctx);
    }else{
      ctx.reply('[+] Error "/scrap {name}".')
    }
    
    ctx.reply(`[+]El proceso de clonación ha finalizado correctamente.`);
    logs.push(`[+]El proceso de clonación ha finalizado correctamente.`);
});

bot.launch();

async function login(sessionName,ctx) {
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
              if (err != null) console.log(err); 
            }
          );
        },
        undefined,
        { logQR: false }
      )
    .then(async client => {
      const state = await client.getConnectionState();
      if(state == 'CONNECTED') {
        console.log('[+] *Conectado*');
        ctx.reply('[+] EL enlace ha sido exitoso.');
      }
    }).catch(err => {
        console.log(err);
    })
}
