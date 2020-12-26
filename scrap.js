const venom = require('venom-bot');
const fetch = require('node-fetch');
const mime = require('mime-types')
const low = require('lowdb');
const fs = require('fs');
const FileSync = require('lowdb/adapters/FileSync');
const { session } = require('telegraf');


var sessionName = process.argv[2];

venom.create(sessionName)
    .then( client => {
        main(client,String(sessionName).trim())
    }).catch( err => {
        console.log(err);
    }) ;


    //Métodos privados:
    const descargarMedia = async (client, nombre, data,sessionName) => {
        try {
            fs.statSync(`./data/${sessionName}/${nombre}/media`);
            // console.log(`[+] La carpeta Media de ${nombre} ya existe.`);
        }
        catch (err) {
          if (err.code === 'ENOENT') {
            fs.mkdirSync(`./data/${sessionName}/${nombre}/media`, 0o777, err => {
                if(err) {
                    throw err;
                }
                console.log('[+] Carpeta "media" creada');
            })
          }
        }

        data.map(async (msj) => {
            var count = msj.t;
            if(msj.isMedia === true || msj.isMMS === true) {
                if(msj.type != "sticker") {
                    const buffer = await client.decryptFile(msj);
                    const fileName = `./data/${sessionName}/${nombre}/media/${count}.${mime.extension(msj.mimetype)}`;
                    // count ++;
                    
                    await fs.writeFile(fileName, buffer, err => {
                        if(err) {
                            console.error("[-] Error al descargar archivo media de " + nombre);
                        } else {
                            console.log("[+] Se recolecto archivo media de " + nombre);
                        }
                    })
                }
            }
        })
    }

    const getImagenPerfil = async (client, nombre, id,sessionName) => {
        const url = await client.getProfilePicFromServer(id);

        fetch(url)
            .then(res => {
                const dest = fs.createWriteStream(`./data/${sessionName}/${nombre}/imgPerf.png`);
                res.body.pipe(dest);
                console.log("[+] Se recolecto img de perfil de " + nombre);
            })
            .catch(err => {
                console.log("[-] No se encontro img de perfil de " + nombre);
            })
    }

    const crearChatFile = async (nombre, data,sessionName) => {
        const adapter = new FileSync(`./data/${sessionName}/${nombre}/chat.json`);
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

    const getMiembrosGrupo = async (client, nombre, id,sessionName) => {
        const adapter = new FileSync(`./data/${sessionName}/${nombre}/miembros.json`);
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

    const crearCarpeta = async (nombre,sessionName) => {

        try {
            fs.statSync(`./data/${sessionName}/${nombre}`);
        }
        catch (err) {
          if (err.code === 'ENOENT') {
            fs.mkdirSync(`./data/${sessionName}/${nombre}`, 0o777, err => {
                if(err) throw err;
                console.log(`[+] Carpeta creada ${nombre}`);
            })
          }
        }

    }

    //metodos publicos
    const main = async (client,sessionName) => {
  
        try {
            fs.statSync('data');
            console.log(`[+] La carpeta <<data>> ya existe.`);
        }
        catch (err) {
          if (err.code === 'ENOENT') {
            fs.mkdirSync('data', 0o777, err => {
                if(err) {
                    throw err;
                }
                console.log('[+] Carpeta <<data>> creada.');
            })
          }
        }

        var date = new Date();
        var path = sessionName + ' ' + Date.parse(date);
                
        fs.mkdirSync(`./data/${path}`, 0o777, err => {
            if(err) throw err;
            console.log(`[+] Carpeta <<${path} ${date2}>> creada.`);
        });
            
            

        const chats = await client.getAllChats();
        
        chats.map(async chat => {
            const name = String((chat.contact.name || chat.contact.pushname)).trim();

            if(chat.isGroup == false) {
                crearCarpeta(name,path);
            } else {
                crearCarpeta(chat.name,path);
                getMiembrosGrupo(client, chat.name, chat.id._serialized,path);
            }
            const allMessages = await client.loadAndGetAllMessagesInChat(chat.id._serialized, true);

            //console.log(allMessages);

            crearChatFile(name, allMessages,path);
            getImagenPerfil(client, name, chat.id._serialized,path);
            descargarMedia(client, name, allMessages,path);
        });
    }
