(function() {

// 前缀
const STORAGE_PREFIX = 'shared-session-';

const CURRENT_TAB_URL = window.location.host + window.location.pathname;

const CHANNEL_NAME = 'session-storage-broadcast-15447';
// 
const INIT_CHANNEL_NAME = 'session-storage-init-broadcast-324347';
const RECEIVE_CHANNEL_NAME = 'session-storage-receive-broadcast-324347';

// 进入页面
// 1、初始化sessionStorage，即：获取其他页面的sessionStorage
// 2、set和remove方法同步多个tab页
// 3、


// 接收广播
window.addEventListener("storage", function(event) {
	/* sessionStorage相关专用频道，这个一个父频道 */
	if (event.key == CHANNEL_NAME) {
		let params = JSON.parse(event.newValue);
		
		if(params.key == INIT_CHANNEL_NAME){
			/* 请求sessionStorage初始化专用频道，这是子频道 */
			
			// 1、获取当前tab页的sessionStorage
			let results = _getCurrentTabItems();
			// 2、广播所有的sessionStorage
			_broadcast({type: 'broadcast', key: RECEIVE_CHANNEL_NAME, data: results, url: params.url})
			
		}else if(params.key == RECEIVE_CHANNEL_NAME){
			/* 接收sessionStorage初始化专用频道，这是子频道 */
			
			// 初始化tab页的url==当前页
			if(params.url == CURRENT_TAB_URL){
				_receiveOtherTabItems(params.data);
			}
			// console.log(params.url == CURRENT_TAB_URL);
		}else{
			/* 同步sessionStorage item */
			
			// 广播到其他存在的tab页面：a页面间接调用_broadcast(message)，则b页面
			try{
					let valueParse = JSON.parse(event.newValue)
					// console.log(valueParse)
					if(valueParse.type == 'set'){
						setItem(valueParse.key, valueParse.data, false);
					}else if(valueParse.type == 'remove'){
						removeItem(valueParse.key, false);
					}
			}catch(e){
				console.error('同步sessionStorage转换错误：', event,e);
			}
			
			
		}
	}
});

/**
 * 向其他页面广播
 * @param {Object} message {type: String, key: String, data: Object | null}
 */
const _broadcast = function(message) {
	localStorage.setItem(CHANNEL_NAME, JSON.stringify(message));
};

// 存储到sessionStorage
const _storage = function(key) {
	var args = [];
	for (var i = 1; i < arguments.length; i += 1) {
		args.push(arguments[i])
	}
	if (window && window.sessionStorage) {
		return window.sessionStorage[key].apply(window.sessionStorage, args);
	}
}

/**
 * 获取当前tab页的所有sessionStorage
 */
const _getCurrentTabItems = function(){
	let sessionKeys = Object.keys(sessionStorage)
	let result = {}
	for(let index in sessionKeys){
		let key = sessionKeys[index]
		if(key.indexOf(STORAGE_PREFIX) == 0){
			result[key] = sessionStorage.getItem(key)
		}
	}
	return result
}

/**
 * @param {Object} items
 * @fix 如果其他标签sessionStorage冲突，请根据sessionStorage的插入时间判断（保留最近的数据）
 */
const _receiveOtherTabItems = function(items){
	// 设置到sessionStorage，但不广播
	for(let key in items){

		let sessionValue = sessionStorage.getItem(key)
		if(!sessionValue){
			// 当前tab没有sessionStorage item
			sessionStorage.setItem(key, items[key])
			continue
		}
		try{
			
			let sessionValueParse= JSON.parse(sessionValue)
			let itemParse = JSON.parse(items[key])
			if(!sessionValueParse.time || sessionValueParse.time <  itemParse.time){
				sessionStorage.setItem(key, items[key])
			}
		}catch(e){
			continue
		}// end try catch
		
	}// end for(...)
	
}


const _storageKey = function(key) {
	return STORAGE_PREFIX + key;
}

const getItem = function(key, isBroadcast) {
	let storeValue = _storage('getItem', _storageKey(key));
	let result = JSON.parse(storeValue || '""')
	
	
	if(isBroadcast){
		// 向其他tab广播
		_broadcast({
			type: 'get',
			key: key,
			data: null
		});
	}
	return result && result.data
};

/**
 * 添加到sessionStorage
 * @param {Object} key 
 * @param {Object} value
 * @param {Boolean} isBroadcast 默认为true
 */
const setItem = function(key, value, isBroadcast) {
	/* 
			存储后的数据结构
			{
				time: 存储时间戳,
				data: 存储数据,
				url: 当前存储url
			}
	 */
	let params = {
		time: Date.now(),
		data: value,
		url: CURRENT_TAB_URL
	}
	
	_storage('setItem', _storageKey(key), JSON.stringify(params));
	if(isBroadcast || isBroadcast == undefined){
		_broadcast({
			type: 'set',
			key: key,
			data: value
		});
	}
};

/**
 * 删除key
 * @param {Object} key
 * @param {Boolean} isBroadcast 默认为true
 */
const removeItem = function(key, isBroadcast) {
	_storage('removeItem', _storageKey(key));
	
	if(isBroadcast || isBroadcast == undefined){
		_broadcast({
			type: 'remove',
			key: key,
			data: null
		});
	}
}

const initItems = function(){
	// TODO 获取当前items，也参与
	_broadcast({
		type: 'init',
		key: INIT_CHANNEL_NAME,
		data: null,
		url: CURRENT_TAB_URL
	});
}

// 
let sessionPlus  = {
	'getItem': getItem,
	'setItem': setItem,
	'initItems': initItems,
	'removeItem': removeItem, 
}
window['sessionPlus'] = sessionPlus;
})()
