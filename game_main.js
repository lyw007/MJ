var mj_list = require('./mj_list');
var table = require("./table");
var Global = require("./Global");
var count = 0;
var GameMain = {
	getCount: function () {
		return count;
	},
	setCount: function (val) {
		count = val;
	},
	init: function (roomId,socketId) {
		this.roomId = roomId || null;
		this.socketId = socketId;
		this.players = [];
		this.card_list = [];
		this.game_state = 'NOT_BEGIN';
		this.player_nums = 2;
		this.curPlayerIndex=0;
		var self = this;
		console.log('new game main', this.roomId, this.socketId);
	},
	addPlayer: function (playername) {
		console.log('do here!');
		this.players.push({ name: playername, ready: false });
	},
	addPlayers: function (list) {
		var self = this;
		list.forEach(function (value, index) {
			self.addPlayer(value);
		})
	},
	delPlayer: function (player) {
		console.log('doo here!');
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].name == player) {
				this.players.splice(i, 1);
			}
		}
	},
	setPlayerReady: function (name) {
		console.log("setPlayerReady:", this.roomId, name);
		for (var i = 0; i < Global.roomPlayers[this.roomId].length; i++) {
			if (Global.roomPlayers[this.roomId][i].username == name) {
				Global.roomPlayers[this.roomId][i].ready = true;
			}
		}
	},
	setCurPlayerByData: function (data) {
		var self = this;
		var arr = Global.roomPlayer(self.roomId);
		var index = arr.indexOf(data.username);

	},
	setPlayerNotReady: function (name) {
		for (var i = 0; i < Global.roomPlayers[this.roomId].length; i++) {
			if (Global.roomPlayers[this.roomId][i].username == name) {
				Global.roomPlayers[this.roomId][i].ready = false;
			}
		}
	},
	getPlayerInfoByName: function (playerName) {
		var result = null;
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].name == playername) {
				result = this.players[i];
			}
		};
		return result;
	},
	getPlayerIndexByName:function(username){
		var _index=null;
		Global.roomPlayers[this.roomId].forEach(function(ele,index){
			if(ele.username==username){
				_index=index;
			}
		});
		return _index;
	},
	checkToStartGame: function () {
		var pass = true;
		var limit_num = this.player_nums;//debug:1;  build:4
		console.log("(Global.roomPlayers[this.roomId].length", Global.roomPlayers[this.roomId].length);
		if (Global.roomPlayers[this.roomId].length == limit_num) {
			for (var i = 0; i < Global.roomPlayers[this.roomId].length; i++) {
				if (Global.roomPlayers[this.roomId][i].ready == false) {
					pass = false;
				}
			}
		} else {
			pass = false;
		}
		console.log('all player in!!', pass);
		return pass;
	},
	countDown: function (callback,socket) {
		var self = this;
		console.log('count down', this.roomId);
		socket.emit('count down');
		setTimeout(function () {
			if (callback && typeof callback == "function") {
				callback();
			}
		}, 3000);
	},
	startGame: function (socket) {
		this.game_state = 'GAME_START';
		this.getCards();
		this.card_list.sort();
		//	this.socket.emit('count down');
		console.log(socket.username,'username');
		socket.emit('start game', { card_list: this.card_list });

		// this.turnFirstPlayer(socket);
	},
	endAnimated:function(username){
		var _index=this.getPlayerIndexByName(username);
		if(_index==this.curPlayerIndex){
			this.playerGetOneCard();
		}
	},
	playerGetOneCard:function(){
		var username=Global.roomPlayers[this.roomId][this.curPlayerIndex].username;
		var arr=Global.io.sockets.sockets;
		var _sk;
		arr.forEach(function(ele){
			if(ele.username==username){
				_sk=ele;
			}
		});
		if(_sk){
			var card=mj_list.dealOneCard(_sk.roomId);
			console.log('player get one card!');
			_sk.emit('player get one card',{name:_sk.username,card:card});
		}
	},
	
	getCards: function () {
		console.log(mj_list.list[this.roomId].length, 'gameMain getCards');
		this.card_list = mj_list.dealCards(this.roomId);
		console.log('card_list', this.card_list.length);
	},
	throwOneCard: function (name,socketId,username) {
		console.log('gameMain throwOneCard', this.socketId);
		var _index = this.card_list.indexOf(name);
		var _playerIndex=this.getPlayerIndexByName(username);
		console.log('_playerIndex' , _playerIndex,this.curPlayerIndex);
		if(_playerIndex!=this.curPlayerIndex){
			console.log('error : not cur action player!');
			return;
		}
		if (_index != -1) {
			this.card_list.splice(_index, 1);
			var $index=Global.io.sockets.sockets;
		}
		table.addCard(this.roomId, name);
		this.turnNextPlayer(username);
	},
	turnNextPlayer:function(username){
		var nextIndex=0;
		var self=this;
		var _index=this.getPlayerIndexByName(username);
		if(_index>=self.player_nums-1){
			nextIndex=0;
		}else{
			nextIndex=_index+1;
		}
		// Global.roomPlayers[this.roomId].forEach(function(ele,index){
		// 	if(ele.username==username){
		// 		if(index>=self.player_nums-1){
		// 			nextIndex=0;
		// 		}else{
		// 			nextIndex=index+1;
		// 		}
		// 	}
		// });
		this.curPlayerIndex=nextIndex;
		console.log('player turn ', nextIndex);
		this.playerGetOneCard();
		Global.io.to(this.roomId).emit('player turn',{name:Global.roomPlayers[this.roomId][nextIndex].username});
	},
	pauseGame: function () {
		this.game_state = "GAME_PAUSE";
	},
	endGame: function () {
		this.game_state = "GAME_END";
	},
	chi: function (card_one, card_two) {
		var match_card = table.lastCard();
		var match_arr = [match_card, card_one, card_two];
		var type_arr = this.getTypeByMatchArr(match_arr);
		var num_arr = this.getNumsByMatchArr(match_arr);

		var same_type = this.checkArrIsEqual(type_arr);

		var be_list = true;
		var item = null;
		num_arr.sort();
		for (var i = 0; i < num_arr.length; i++) {
			item = num_arr[i];
			if (i > 0) {
				num_arr[i - 1]++;
				if (num_arr[i - 1] != item) {
					be_list = false;
				}
			}
		}
		if (same_type && be_list) {
			//符合吃的条件
			//		Global.io_obj.to(this.roomId).emit('chi',{card:match_card});
		} else {
			this.socket.emit('not able chi', { error: '不满足条件' });
		}
	},
	peng: function (card_one, card_two,socket) {
		var match_card = table.lastCard();
		var match_arr = [match_card, card_one, card_two];
		var type_arr = this.getTypeByMatchArr(match_arr);
		var num_arr = this.getNumsByMatchArr(match_arr);

		var same_type = this.checkArrIsEqual(type_arr);
		var same_num = this.checkArrIsEqual(num_arr);

		if (same_num && same_type) {
			//满足碰的条件
		} else {
			socket.emit('not able peng', { error: '不满足条件' });
		}
	},
	 gang: function (card_one, card_two, card_three) {
		var match_card = table.lastCard();
		var match_arr = [match_card, card_one, card_two, card_three];
		var type_arr = this.getTypeByMatchArr(match_arr);
		var num_arr = this.getNumsByMatchArr(match_arr);

		var same_type = this.checkArrIsEqual(type_arr);
		var same_num = this.checkArrIsEqual(num_arr);



		if (same_num && same_type || this.check_gane()) {
			//
		} else {
			Global.io.to(this.roomId).emit('not able gane', { error: '不满足条件' });
		}
	},
	check_gang: function () {
		var _check = {};
		var _indexArr = [];
		this.card_list.forEach(function (val, index) {
			if (_check[val] == undefined) {
				_check[val] = new Array();
				_indexArr.push(_check[val]);
			} else {
				_check[val].push(index);
			}
		});
		_indexArr.forEach(function (val) {
			if (val.length == 4) {
				return true;
			}
		});
		return false;
	},
	hu: function () {

	},
	check_hu: function () {
		var wan_arr = this.getTypesByList('wan');
		var feng_arr = this.getTypesByList('f');
		var o_arr = this.getTypesByList('o');
		var tiao_arr = this.getTypesByList('tiao');
		var tong_arr = this.getTypesByList('tong');

		var wan_info = this.getInfoByList(wan_arr);
	},
	getTypesArrByList: function (type) {
		var arr = [];
		this.card_list.forEach(function (val, index) {
			var tp = val.split('_')[1];
			if (tp == type) {
				arr.push(val);
			}
		});
		return arr;
	},
	getInfoByList: function (list) {
		var obj = {};
		if (list.length) {
			obj['duizi'] = this.check_duizi(list);
			obj['juzi'] = this.check_juzi(list);

			if (list[0].split('_')[1] != 'o' || list[0].split('_')[1] != 'f') {
				obj['shunzi'] = this.check_shunzi(list);
			}
		}
		return obj;
	},
	check_duizi: function (array) {
		var dui_arr = [];

		if (array.length >= 2) {
			array.sort();
			for (var i = 0; i < array.length - 1; i++) {
				var ele = array[i];
				var ele1 = array[i + 1];
				if (ele == ele1) {
					dui_arr.push([ele, ele]);
					i++;
				}
			}
		}

		return dui_arr;
	},
	check_juzi: function (array) {
		var juzi_arr = [];
		if (array.length >= 3) {
			array.sort();
			for (var index = 0; index < array.length - 2; index++) {
				var element = array[index];
				var element1 = array[index + 1];
				var element2 = array[index + 2];
				if (element == element1 == element2) {
					juzi_arr.push([element, element, element]);
					index += 2;
				}
			}
		}

		return juzi_arr;
	},
	check_shunzi: function (array) {
		var shunzi_arr = [];
		var nums_arr = [];
		if (array.length >= 3) {
			array.sort();
			array.forEach(function (val, index) {
				nums_arr.push(val.split('_')[0]);
			});
			for (var index = 0; index < nums_arr.length; index++) {
				var element = nums_arr[index];
				var element1 = nums_arr[index + 1];
				var element2 = nums_arr[index + 2];
				if (element1 == (element + 1) && element2 == (element1 + 1)) {
					index += 2;
					shunzi_arr.push([element, element1, element2]);
				}
			}
		}
		return shunzi_arr;
	},
	checkArrIsEqual: function (array) {
		var same = true;
		for (var index = 0; index < array.length; index++) {
			var element = array[index];
			if (element != array[0]) {
				same = false;
			}
		}
		return same;
	},
	getTypeByMatchArr: function (array) {
		var arr = [];
		if (Object.prototype.toString.call(array) === "[object Array]") {
			array.forEach(function (val) {
				arr.push(val.split('_')[1]);
			})
		}
	},
	getNumsByMatchArr: function (array) {
		var arr = [];
		if (Object.prototype.toString.call(array) === "[object Array]") {
			array.forEach(function (val) {
				arr.push(val.split('_')[0]);
			})
		}
	}
}
module.exports = GameMain;