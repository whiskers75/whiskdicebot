// CoinChat bot

String.prototype.chunk = function(size) {
    return [].concat.apply([],
                           this.split('').map(function(x,i){ return i%size ? [] : this.slice(i,i+size) }, this)
                          )
}
var io = require("socket.io-client");
var started = false;
var random = require("secure_random");
var youtube = require('youtube-feeds');
var users = [];
var chatBuffer = [];
var chance = 60;
var edge = 0.97; // EV + 2% tip fee
var payout = 1.4;
var qlist = "";
var qgame = false;
var qboss = 'Game not in progress';
var tippedProfit = true;
var toproom = 'botgames';
var shutdown = false;
var lastWinner = null;
var socket = io.connect("http://192.155.86.153:8888/");
console.log('Connecting');
socket.on("connect", function() {
    console.log('Connected');
    socket.on("message", function(msg) {
	console.log('SERVER MESSAGE: ' + msg.message);
	if (msg === "You have been banned.") {
	    console.log('Error: Banned!');
	    process.exit(1);
	}
    });
    function chat(room, msg, color) {
	chatBuffer.push({room: room, message: msg, color: color});
    }
    function pm(user, msg, color) {
        chatBuffer.push({room: 'WhiskDiceBot:' + user.toLowerCase(), message: msg, color: color});
    }
    function tip(obj) {
	chatBuffer.push({tipobj: obj});
    }
    setInterval(function() {	
	if (chatBuffer[0]) {
	    if (chatBuffer[0].tipobj) {
		socket.emit("tip", chatBuffer[0].tipobj);
	    }
	    else {
		socket.emit("chat", chatBuffer[0]);
	    }
	    chatBuffer.splice(0, 1);
	}
	else {
	    if (shutdown) {
		console.log('Shutting down...');
		process.exit(0);
	    }
	}
    }, 800);
    var oldchance = chance;
    var oldpayout = payout;
    setTimeout(function() {
	socket.on("chat", function(data) {
	    console.log(data.room + ' | ' + data.user + ' | ' +  data.message + ' (' + data.winbtc + ' mBTC)');
            if ((data.message.substring(0, 57) === "<span class='label label-success'>has tipped WhiskDiceBot" || data.message.substring(0, 57) === "<span class='label label-success'>has tipped whiskdicebot") && data.room === 'botgames') {
                var message = Number(data.message.substring(data.message.indexOf('message: BOT ') + 12, data.message.indexOf('%) !')));
		if (message > 0 && message < 76) {
		    // yay
		    chance = message;
		    payout = Number((edge / (message / 100)).toFixed(2));
                    chat('botgames', data.user + ': You selected a ' + chance + '% chance, with a ' + payout + 'x payout.', "090");
		}
		else {
		    chance = 60;
                    payout = Number((edge / (chance / 100)).toFixed(2));
                    chat('botgames', data.user + ': Using default: ' + chance + '% chance, with a ' + payout + 'x payout.', "090");
                }
                if (started === true && (balance > (data.message.substring(58, data.message.indexOf('mBTC') - 1)) * payout)) {
		    random.getRandomInt(1, 100, function(err, rand) {
			if (rand < (chance + 1)) {
			    var totip = String(Number(data.message.substring(58, data.message.indexOf('mBTC') - 1) * payout).toFixed(2));
                            var won = String(Number((data.message.substring(58, data.message.indexOf('mBTC') - 1) * payout) - Number(data.message.substring(58, data.message.indexOf('mBTC') - 1))).toFixed(2));
			    chat('botgames', data.user + ': You won ' + won + ' mBTC! (rolled ' + rand + ", required > " + (chance + 1) + ')', "090");
                            chat('botgames', '!; win ' + data.user + ' ' + won, "000");
			    lastWinner = data.user;
                            tip({user: data.user, room: 'botgames', tip: totip, message: 'You win!'});
			}
			else {
chat('botgames', data.user + ': Not a winner, sorry! (rolled ' + rand + ', required over ' + (chance + 1) + ')', "505");
                            chat('botgames', '!; loss ' + data.user + ' ' + data.message.substring(58, data.message.indexOf('mBTC') - 1), "000");
			    /* if ((rand < Math.floor(chance * 1.5)) && lastWinner && (data.message.substring(58, data.message.indexOf('mBTC') - 1) > 0.25)) {
			       chat('botgames', lastWinner + ': You won this payment!', "090");
			       totip = String(data.message.substring(58, data.message.indexOf('mBTC') - 1));
			       tip({user: lastWinner, room: 'botgames', tip: totip});
			       
			       
			       } */
			}
                        chance = oldchance;
                        payout = oldpayout;
		    });
		    
                    socket.emit("getbalance", {});
		    
		}
		else {
                    if ((balance < (data.message.substring(58, data.message.indexOf('mBTC') - 1)) * payout)) {
                        chat('botgames', '/bold Bet exceeds what the bot can pay!', "505");
                        tip({user: data.user, room: 'botgames', tip: String(data.message.substring(58, data.message.indexOf('mBTC') - 1)), message: 'Exceeds balance!'});
		    }
                    else {
			chat('botgames', '/bold Game not enabled!', "505");
		    }
		}
            }
            if (data.message === "!start" && data.room === "botgames" && (data.user === "whiskers75" || data.user === "admin")) {
		chat('botgames', '/bold Initializing WhiskDice game (!help for info)', "505");
		socket.emit("getbalance", {});
		started = true;
		
            }
            if (data.message === "!stop" && data.room === "botgames" && (data.user === "whiskers75" || data.user === "admin")) {
		chat('botgames', '/bold Stopping WhiskDice game (!help for info)', "505");
		socket.emit("getbalance", {});
		started = false;
		
            }
            if (data.message === "!topic" && data.room === "botgames" && (data.user === "whiskers75" || data.user === "admin")) {
                chat('botgames', '/topic The first & best SatoshiDice for CoinChat - refilled! | ' + ((1 - edge) * 100).toFixed(2) + '% house edge | 1% to 75% - many chances of winning - you choose! | !help for info', "000");
            }
            if (data.message === "!shutdown" && data.room === "botgames" && (data.user === "whiskers75" || data.user === "admin")) {
                chat('botgames', '/bold Shutting down bot, no more bets please!', "505");
		shutdown = true;
            }
            if (data.message.substring(0, 4) === "!set" && data.room === "botgames" && (data.user === "whiskers75" || data.user === "admin")) {
		var newOpts = data.message.split(' ');
		if (newOpts[1] > 0 && newOpts[2] > 0) {
		    oldchance = newOpts[1];
		    oldpayout = newOpts[2];
		    chance = newOpts[1];
		    payout = newOpts[2];
                    chat('botgames', '/bold CHANGING PAYOUT/CHANCE! New chance: ' + chance + '% | New payout: ' + payout + 'x' , "505");
		}
	    }
            if (data.message.substring(0, 5) === "!kick" && data.room === "botgames" && (data.user === "whiskers75" || data.user === "admin")) {
                var newOpts = data.message.split(' ');
		if (newOpts[1]) {
                    socket.emit("kick", {action: "kick", room: 'botgames', user: newOpts[1]});
		    chat('botgames', '/bold Kicked ' + newOpts[1], "505");
		}
            }
            if (data.message.substring(0, 7) === "!unkick" && data.room === "botgames" && (data.user === "whiskers75" || data.user === "admin")) {
                var newOpts = data.message.split(' ');
                if (newOpts[1]) {
                    socket.emit("kick", {action: "unkick", room: 'botgames', user: newOpts[1]});
                    chat('botgames', '/bold Unkicked ' + newOpts[1], "090");
                }
            }
            if (data.message.substring(0, 4) === "!get" && data.room === "botgames" && (data.user === "whiskers75")) {
		tip({user: data.user, room: 'botgames', tip: data.message.split(' ')[1]});
            }
            if ((data.message === "!fixbugs" || data.message === "!getcolors") && data.room === "botgames") {
		socket.emit('getcolors', {});
		chat('botgames', 'Called \'getcolors\'.', "090");
            }
            if (data.message === "!lastwinner" && data.room === "botgames") {
		chat('botgames', 'Last winner: ' + lastWinner, "090");
            }
            if (data.message.substr(0, 6) === "!users" && data.room === "botgames") {
		var toproom = data.message.substr(7, data.message.length);
		socket.emit('toprooms', {});
            }
            if (data.message === "!bots" && data.room === "botgames") {
		chat('botgames', 'Bots: | WhiskDiceBot (#botgames): A clone of SatoshiDice, with more advanced bet options. !help for info. Creator: whiskers75', "090");
                chat('botgames', 'Tifa (#seventhheaven - moved here): A bot which spins a Lucky 7 spinner. *help for info. Creator: Box', "090");
            }
            if (data.message.split(' ')[0] === "!newgame" && data.room === "20questions" && !qgame) {
		qlist = '';
		alist = '';
                chat('20questions', '/bold New game of 20 Questions starting! Join #20questions to play!', "090");
		chat('20questions', '/bold ' + data.user + ': choose a word! You have 30 seconds until the game starts.', '090');
		qboss = data.user;
		setTimeout(function() {
                    chat('20questions', '/bold Game started! Begin guessing!', '090');
		    qgame = true;
		}, 30000);
            }
            if (data.message === "!hints" && data.room === "20questions" && qgame) {
                var tmp = ("Hints: " + qlist).chunk(200);
		tmp.forEach(function(chunk) {
		    chat('20questions', chunk, '090');
		});
	    }
            if (data.message === "!ahints" && data.room === "20questions" && qgame) {
                var tmp = ("Antihints: " + alist).chunk(200);
                tmp.forEach(function(chunk) {
                    chat('20questions', chunk, '505');
                });
            }
            if (data.message === "!help" && data.room === "20questions") {
                chat('20questions', 'Commands: !newgame (start new game) | !(a)hints (get (anti)hints) | !(a)hint <hint> (add (anti)hint) | !winner <winner> (finish game, and announce winner) | !state (check state)', '090');
            }
            if (data.message === "!state" && data.room === "20questions") {
                chat('20questions', 'Game on: ' + qgame + ' | Word master: ' + qboss, '090');
            }
            if (data.message.split(' ')[0] === "!winner" && data.room === "20questions" && qgame) {
                qlist = '';
		qgame = false;
		qboss = 'Game not in progress';
                chat('20questions', '/bold The game of 20 Questions has ended! Winner: ' + data.message.split(' ')[1], "505");
            }
            if (data.message.split(' ')[0] === "!reboot" && data.room === "20questions") {
		socket.emit('quitroom', {room: '20questions'});
		socket.emit('joinroom', {room: '20questions'});
                chat('20questions', '/bold ✔ Relogged.', "505");
            }
            if (data.message.split(' ')[0] === "!hint" && data.room === "20questions" && qgame && data.user === qboss) {
                var tmp = data.message.split(' ');
		tmp.shift();
		var tmp = tmp.join(' ');
		qlist += ' ' + tmp + ' | ';
                chat('20questions', '✔ ' + tmp, "090");
            }
            if (data.message.split(' ')[0] === "!ahint" && data.room === "20questions" && qgame && data.user === qboss) {
                var tmp = data.message.split(' ');
                tmp.shift();
                var tmp = tmp.join(' ');
                alist += ' ✗ ' + tmp + ' | ';
                chat('20questions', '✗ ' + tmp, "505");
            }
            if (data.message.split(' ')[0] === "!youtube") {
                youtube.feeds.videos(
                    {q: data.message.split(' ').splice(0, 1).join(' '), key: process.env.YT_KEY},
                    function(err, res) {
			chat('botgames', 'YouTube: ' + res.items[0].uploader + ': ' + res.items[0].title + ' - ' + res.items[0].player['default'], '090');
		    }
                );
            }
            if (data.message === "!help" && data.room === "botgames") {
		chat('botgames', data.user + ': This is a SatoshiDice clone, for CoinChat!', "090");
		chat('botgames', data.user + ': Commands: !state, !users, !bots, !lastwinner', "090");
                chat('botgames', data.user + ': To use: /tip WhiskDiceBot (amount) BOT (win percentage)%', "090");
                chat('botgames', data.user + ': Percentage can be anything from 1% to 75%', "090");
                chat('botgames', data.user + ': Or go to go.cur.lv/whiskchat and use the /bet command. (/bet (amount) percentage%)', "090");
		socket.emit("getbalance", {});
		
            }
            if (data.message === "!state" && data.room === "botgames") {
                socket.emit("getbalance", {});
		if (started) {
		    setTimeout(function() {
                        chat('botgames', data.user + ': Game enabled! Balance: ' + balance.toFixed(2) + ' | House edge: ' + ((1 - edge) * 100).toFixed(2) + '%', "090");
		    }, 2000); // Wait for getbalance
		}
		else {
                    chat('botgames', data.user + ': Game disabled. Don\'t bet!', "505");
		}
		
            }
	    
	});
    }, 3000); // Make sure we don't answer any previous stuff!
    var balance = 0;
    
    
    socket.on("balance", function(data) {
        if (data.change) {
            balance = balance + data.change;
        }
        else {
            balance = data.balance;
        }
        console.log('NEW BALANCE: ' + balance);
        //chat('botgames', '/topic Bot Games - !help for help. | Bot balance: ' + balance + '| Game enabled state: ' + started, "000");
        //chat('botgames', 'Current balance: ' + balance + ' | Max bet: ' + (balance - 1.5), "505");
	if (balance >= 15.1) {
	    tippedProfit = false;
	    setTimeout(function() {
		if (!tippedProfit && balance >= 15.1) {
		    socket.emit('tip', {user: 'whiskers75', room: 'botgames', tip: balance - 15, message: 'Tipping profit!'});
		    tippedProfit = true;
		}
	    }, 30000);
	}
    });
    socket.emit("accounts", {action: "login", username: 'WhiskDiceBot', password: process.env.whiskbotpass});
    socket.on("loggedin", function(data) {
	var username = data.username;
	socket.on("joinroom", function(data) {
	    if (data.room === "botgames") {
		users = data.users;
	    }
	});
	// socket.emit('joinroom', {join: 'botgames'});
	// socket.emit('joinroom', {join: '20questions'});
	socket.on("newuser", function(data) {
	    users.push(data.username);
	});
	setTimeout(function() {
            chat('botgames', '/bold ✔ WhiskDiceBot initialized! (!help for info)', "090");
	    chat('botgames', 'Betting is now enabled! Tip this bot to play.', "090");
	    socket.emit("getbalance", {});
            socket.emit('getcolors', {});
            chat('20questions', '/bold ✔ 20 Questions bot initialized! (!help for info)', "090");
            started = true;
	}, 3000); // Match the setTimeout for the chat engine
    });
    socket.on('disconnect', function() {
	chat('botgames', 'CONNECTION FAILURE. REBOOTING!', "505");
	process.exit(1);
    });
    socket.on('toprooms', function(data) {
	var foundOwnRoom = false;
	data.list.forEach(function(room) {
	    if (room.room === toproom) {
                chat('botgames', '/bold #' + toproom + ': ' + room.users + ' people online!', '090');
		foundOwnRoom = true;
	    }
	});
	if (!foundOwnRoom) {
            chat('botgames', 'Not on the top rooms list! :(', '505');
	}
    });
    
    process.on('SIGTERM', function() {
        chat('botgames', '/bold Shutting down/rebooting. No more bets please.', "505");
	shutdown = true;
    });
});
socket.on('error', function(err) {
    console.log('Failed to start');
    console.log(err);
    process.exit(1);
});

