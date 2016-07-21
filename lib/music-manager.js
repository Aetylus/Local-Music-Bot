'use strict';

const fs = require('fs');
const youtubedl = require('youtube-dl');

class MusicManager {
    constructor(bot) {
        this.queue = [];
        this.current = null;
        this.bot = bot;
        this.voting = null;
        this.autoplay = false;
    }

    play(data, cm, funcs) {
        if (this.bot.voiceConnection) {
            if (!this.bot.voiceConnection.playing) {
                if (this.queue.length > 0) {
                    this.current = this.queue.shift();

                    if(this.current.filePath) {
                        //this.current.voiceConnection.playFile(this.current.filePath, this._playCallBack);
                        this.bot.voiceConnection.playFile(this.current.filePath, this._playCallBack);
                    }
                    else if (this.current.stream) {
                        //this.current.voiceConnection.playRawStream(this.current.stream, this._playCallBack);
                        this.bot.voiceConnection.playRawStream(this.current.stream, this._playCallBack);
                    }
                }
                // If the queue is empty and autoplay is set, add a new song to the queue
                else if (this.autoplay) {
                    cm.lib.searchLibraryRandom({}, song => {
                        song.duration = funcs.digitalTime(Math.round(song.duration));
                        song.channel = data.m.channel;
                        song.voiceConnection = data.m.client.voiceConnections.get('server', data.m.channel.server);
                        this.queue.push(song);
                        this.play(data, cm, funcs);
                    });
                }
                else {
                    this.current = null;
                }
            }
        }
    }

    getStream(url, cb) {
        youtubedl.getInfo(url, function(err, info) {
           if (err) console.log(err);
           var song = {}
           song.title = info.title;
           song.duration = formatTime(info.duration);
           song.stream = youtubedl(url, ['-x', '--audio-format', 'mp3']);
           cb(song);
        });
    }

    shuffle() {
        shuffleArray(this.queue);
    }

    startVote(channel) {
        const voters = new Set();
        for (const user of this.bot.voiceConnection.voiceChannel.members) {
            if (this.bot.user.equals(user)) continue;
            voters.add(user.id);
        }
        this.voting = {
            channel,
            timer: setTimeout(() => {
                this.endVote();
            }, 60000),
            start: Date.now(),
            req: Math.ceil(((voters.size + 0.5))),
            votes: new Set(),
            voters
        };
        channel.sendMessage(`Time Remaining: 60 seconds\nCurrent Votes: 1\nRequired Votes: ${this.voting.req}`);
    }

    endVote() {
        this.voting.channel.sendMessage('Voting failed.');
        this.voting = null;
    }

    _playCallBack(err, intent) {
        if (err) console.log(err);
        this.current.channel.sendMessage(`Now playing ${this.current.title ? this.current.title : this.current.fileName}`);
        intent.on('end', () => {
            if (this.voting) {
                clearTimeout(this.voting.timer);
                this.voting.channel.sendMessage('Voting cancelled.');
                this.voting = null;
            }
            if (this.current) {
                this.current.channel.sendMessage(`Finished playing ${this.current.title ? this.current.title : this.current.fileName}`, {}, () => {
                    this.play(data, cm, funcs);
                });
            } else {
                setTimeout(function() { this.play(data, cm, funcs); }, 2000);
            }
        });
    }
}

//  Durstenfeld shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];

        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function formatTime(time) {
    var elements = time.split(":");

    switch (elements.length) {
        case 3: return `${elements[0]}:${leftPad(elements[1])}:${leftPad(elements[2])}`;
        case 2: return `${elements[0]}:${leftPad(elements[1])}`;
        default: return elements[0];
    }

    return elements;
}

function leftPad(num) {
    return num.length < 2 ? '0' + num : num;
}

module.exports = MusicManager;
