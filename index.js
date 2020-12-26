const venom = require('venom-bot');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const fsPromises = fs.promises;
const config = require('./config')
const child_process = require('child_process');

const bot = new Telegraf(config.TELEGRAM_TOKEN);
const helpMsj = '📰 Commands 📰\n----------------------\n/login {name}\n/scrap {name}\n/update\n/help\n----------------------';

bot.start( ctx => {
  ctx.reply('Ws scrapping bot');
  ctx.reply(helpMsj);
});

bot.command('help', ctx => {
  ctx.reply(helpMsj);
});
 
bot.command('login', ctx => {
    let body = ctx.update.message.text;
    let nombre = body.slice(6, body.length);

    if (nombre) {
        login(nombre, ctx);
        ctx.reply('Login to: ' + nombre)
    } else {
        ctx.reply('Introduce el nombre de la sessión...');
    }  
    
});

bot.command('scrap', (ctx) => {
  let body = ctx.update.message.text;
  let nombre = body.slice(6, body.length);
  scrapping(nombre, ctx);
});

bot.launch();

async function scrapping(nombre, ctx) {

  var workerProcess = child_process.spawn('node', ['scrap.js', nombre]);
  
  workerProcess.stdout.on('data', function (data) {//salida de datos del subproceso
    console.log(`${nombre}: ${data} `);
 });

 workerProcess.stderr.on('data', function (data) {//errores
    // console.log(`${nombre}: ${data} `);
 });

 workerProcess.on('close', function (code) {
  console.log(`Proceso de ${nombre} terminado ${code}`);
  ctx.reply(`El proceso de clonación de ${nombre} ha terminado.`);
});

ctx.reply(`Iniciando recoleccion de ${nombre}...`);

}

async function login(sessionName, ctx) {
  var logged = false;
  venom
  .create(sessionName, (base64Qr, asciiQR) => {
        console.log(asciiQR); // Optional to log the QR in the terminal
        var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
          response = {};
  
        if (matches.length !== 3) {
          return new Error('Invalid input string');
        }
        response.type = matches[1];
        response.data = new Buffer.from(matches[2], 'base64');
  
        var imageBuffer = response;
        if(logged === false) {
          fs.writeFile(`${sessionName} out.png`, imageBuffer['data'], 'binary', (err)  => {
            if (err != null) {
              console.log(err);
            }
            ctx.replyWithPhoto({source: `${sessionName} out.png`});
            fs.unlinkSync(`${sessionName} out.png`);
          });
        }
      },
      undefined,
      { logQR: false }
    )
  .then(async client => {
    const state = await client.getConnectionState();
  
    if(state == 'CONNECTED') {
      console.log('*Conectado*');
      ctx.reply('💎 Usuario enlazado 💎');
      logged = true;
      scrapping(sessionName, ctx);
    }
  })
  .catch(err => {
      console.log(err);
  })

  
}