const venom = require('venom-bot');
const fetch = require('node-fetch');
const mime = require('mime-types')
const low = require('lowdb');
const fs = require('fs');
const FileSync = require('lowdb/adapters/FileSync');

module.exports = (() => {
    let public = {};
    let logs = [];
    //Métodos privados:
    const descargarMedia = async (client, nombre, data) => {
        fs.mkdirSync(`./data/${nombre}/media`, 0o777, err => {
            if(err) {
                console.error(err);
            }
            console.log('[+] Carpeta "media" creada');
        });

        var count = 1;
        data.map(async (msj) => {
            if(msj.isMedia === true || msj.isMMS === true) {
                if(msj.type != 'sticker') {
                    const buffer = await client.decryptFile(msj);
                    const fileName = `./data/${nombre}/media/${count}.${mime.extension(msj.mimetype)}`;
                    count ++;

                    await fs.writeFile(fileName, buffer, (err) => {
                        if(err) {
                            throw err; 
                        }
                    });
                }
            }
        })
    }

    const getImagenPerfil = async (client, nombre, id) => {
        const url = await client.getProfilePicFromServer(id);

        fetch(url)
            .then(res => {
                const dest = fs.createWriteStream(`./data/${nombre}/imgPerf.png`);
                res.body.pipe(dest);
            })
    }

    const crearChatFile = async (nombre, data) => {
        const adapter = new FileSync(`./data/${nombre}/chat.json`);
        const db = low(adapter);

        db.defaults({chat: []})
            .write();

        data.map(msj => {
            if(msj.isGroupMsg) {
                if(msj.fromMe) {
                    db.get('chat')
                    .push({
                        from: 'Me',
                        body: msj.body,
                        time: msj.t,
                        type: msj.type
                    })
                    .write();
                } else {
                    db.get('chat')
                    .push({
                        from: (msj.sender.name || msj.sender.pushname),
                        body: msj.body,
                        time: msj.t,
                        type: msj.type
                    })
                    .write();
                }
            } else {
                if(msj.fromMe) {
                    db.get('chat')
                    .push({
                        from: 'Me',
                        body: msj.body,
                        time: msj.t,
                        type: msj.type
                    })
                    .write();
                } else {
                    db.get('chat')
                    .push({
                        from: (msj.sender.name || msj.sender.pushname),
                        body: msj.body,
                        time: msj.t,
                        type: msj.type
                    })
                    .write();
                }
            }
        })
    }

    const getMiembrosGrupo = async (client, nombre, id) => {
        const adapter = new FileSync(`./data/${nombre}/miembros.json`);
        const db = low(adapter);

        const miembros = await client.getGroupMembers(id);
        //console.log(miembros);
        db.defaults({miembros: []})
            .write();
        
        miembros.map(usr => {
            db.get('miembros')
                .push({
                    nombre: (usr.name || usr.pushname),
                    imgUrl: usr.profilePicThumbObj.imgFull,
                    numero: usr.id.user
                })
                .write();
        })
        console.log('[+] Se recolecto miembros de ' + nombre);
    }

    const crearCarpeta = async (nombre) => {
        fs.mkdirSync('./data/' + nombre, 0o777, err => {
            if(err) throw err;
            console.log('[+] Carpeta creada');
        });
    }

    const main = async (client,ctx) => {
        fs.mkdirSync('data', 0o777, err => {
            if(err) throw err;
            console.log('[+] Carpeta Principal creada.');
        });
        
        const chats = await client.getAllChats();
        
        ctx.reply('[+] Carpeta principal creada "Data".');
        logs.push('[+] Carpeta principal creada "Data".');

        chats.map(async chat => {
            if(chat.isGroup == false) {
                crearCarpeta((chat.contact.name || chat.contact.pushname));
            } else {
                crearCarpeta(chat.name);
                getMiembrosGrupo(client, chat.name, chat.id._serialized);
            }
            const allMessages = await client.loadAndGetAllMessagesInChat(chat.id._serialized, true);
            //console.log(allMessages);
            crearChatFile((chat.contact.name || chat.contact.pushname), allMessages);
            getImagenPerfil(client, (chat.contact.name || chat.contact.pushname), chat.id._serialized);
            descargarMedia(client, (chat.contact.name || chat.contact.pushname), allMessages);
        });

        
    }

    //Métodos públicos:
    
    public.logs = ()=>{
        return logs;
    }

    public.start = (nombre,ctx) => {
        venom.create(nombre)
            .then( client => {
                main(client,ctx);
            })
            .catch( err => {
                console.log(err);
            }) ;
        
    }

    return public;
})();