const venom = require('venom-bot');
const fetch = require('node-fetch');
const low = require('lowdb');
const fs = require('fs');
const FileSync = require('lowdb/adapters/FileSync');
const { rejects } = require('assert');


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

    const main = async (client) => {
        fs.mkdirSync('data', 0o777, err => {
            if(err) throw err;
            console.log('[+] Carpeta Principal creada');
        });
    
        const chats = await client.getAllChats();
        
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