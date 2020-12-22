const venom = require('venom-bot');
const fetch = require('node-fetch');
const mime = require('mime-types')
const low = require('lowdb');
const fs = require('fs');
const FileSync = require('lowdb/adapters/FileSync');

module.exports = (() => {
    let public = {};

    //Métodos privados:
    const descargarMedia = async (client, nombre, data) => {
        fs.mkdirSync(`./data/${nombre}/media`, 0o777, err => {
            if(err) {
                throw err;
            }
            console.log('[+] Carpeta "media" creada');
        })

        data.map(async (msj) => {
            if(msj.isMedia === true || msj.isMMS === true) {
                if(msj.type != "sticker") {
                    client.decryptFile(msj)
                    .then(async buffer => {
                        const fileName = `./data/${nombre}/media/${msj.t}.${mime.extension(msj.mimetype)}`;
                        
                        await fs.writeFile(fileName, buffer, err => {
                            if(err) {
                                console.error("[-] Error al descargar archivo media de " + nombre);
                            } else {
                                console.log("[+] Se recolecto archivo media de " + nombre);
                            }
                        })
                    })
                    .catch(() => console.log("[-] Error al desencriptar archivo de " + nombre));
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
                console.log("[+] Se recolecto img de perfil de " + nombre);
            })
            .catch(err => {
                console.log("[-] No se encontro img de perfil de " + nombre);
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

    const main = async (client) => {
        fs.mkdirSync('data', 0o777, err => {
            if(err) throw err;
            console.log('[+] Carpeta Principal creada');
        });
    
        const chats = await client.getAllChats();
        
        chats.map(async chat => {
            const nombre = (chat.contact.name || chat.contact.pushname);

            if(chat.isGroup == false) {
                crearCarpeta(nombre);
            } else {
                crearCarpeta(nombre);
                getMiembrosGrupo(nombre);
            }
            const allMessages = await client.loadAndGetAllMessagesInChat(chat.id._serialized, true);

            //console.log(allMessages);

            crearChatFile(nombre, allMessages);
            getImagenPerfil(client, nombre, chat.id._serialized);
            descargarMedia(client, nombre, allMessages);
        });
    }

    //Métodos públicos:
    
    public.start = (sessionName) => {
        venom.create(sessionName)
            .then( client => {
                main(client)
            })
            .catch( err => {
                console.log(err);
            }) ;
    }

    return public;
})();