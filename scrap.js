const venom = require('venom-bot');
const fetch = require('node-fetch');
const low = require('lowdb');
const fs = require('fs');
const FileSync = require('lowdb/adapters/FileSync');
const { type } = require('os');

module.exports = (() => {
    let public = {};

    //Métodos privados:
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

    const crearCarpetaMultimedia = async (nombre) => {
        fs.mkdirSync(`./data/${nombre}/Multimedia/`, 0o777, err => {
            if(err) throw err;
            console.log(`[+] Carpeta ${nombre} Multimedia creada`);
        });
    }
    
    
    const downloadMMedia = async (data,name,client) => {
        data.map(async message => {
            
            if (message.isMedia === true || message.isMMS === true) {
                const buffer = await client.downloadMedia(message.id);
                var metaDatos = String(buffer).substring(String(buffer).indexOf(':')+1,String(buffer).indexOf(';'));
                var typeFile =  String(buffer).substring(String(buffer).indexOf('/')+1,String(buffer).indexOf(';'));
                const fileName = `./data/${name}/Multimedia/${message.id}.${typeFile}`;
                /*
                console.log(metaDatos);
                console.log(fileName);
                console.log(typeFile);    
                console.log(buffer.replace(`data:${metaDatos};base64,`, ''));
                */
               
                await fs.writeFile(fileName, buffer.replace(`data:${metaDatos};base64,`, ''),'base64',  (err) => {
                    if (err) return console.log(err);
                    console.log('Archivo multimedia guardado');
                });
              }
        });
    }
    const main = async (client) => {
        fs.mkdirSync('data', 0o777, err => {
            if(err) throw err;
            console.log('[+] Carpeta Principal creada');
        });
    
        const chats = await client.getAllChats();
        
        chats.map(async chat => {
            

            if(chat.isGroup == false) {
                crearCarpeta((chat.contact.name || chat.contact.pushname));
                crearCarpetaMultimedia((chat.contact.name || chat.contact.pushname));
            } else {
                crearCarpeta(chat.name);
                getMiembrosGrupo(client, chat.name, chat.id._serialized);
                crearCarpetaMultimedia((chat.contact.name || chat.contact.pushname));
            }
            const allMessages = await client.loadAndGetAllMessagesInChat(chat.id._serialized, true);
            //console.log(allMessages);
            //client.imgFull
            //crearChatFile((chat.contact.name || chat.contact.pushname), allMessages);
            //getImagenPerfil(client, (chat.contact.name || chat.contact.pushname), chat.id._serialized);
            
            downloadMMedia(allMessages,(chat.contact.name || chat.contact.pushname),client);
        });
    }

    //Métodos públicos:
    
    public.start = (nombre) => {
        venom.create(nombre)
            .then( client => {
                main(client)
            })
            .catch( err => {
                console.log(err);
            }) ;
    }

    return public;
})();