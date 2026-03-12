const {
    contextBridge,
    ipcRenderer
} = require("electron");

let reqId = 1;
let reqInfo = {};
let fileChangedListeners = {};

function requestPromise(msg)
{
	return new Promise((resolve, reject) =>
	{
		msg.reqId = reqId++;
		reqInfo[msg.reqId] = {
			callback: resolve,
			error: function(msg, e)
			{
				reject(new Error(msg || (e && e.message) || 'IPC request failed'));
			}
		};

		if (msg.action == 'watchFile')
		{
			fileChangedListeners[msg.path] = msg.listener;
			delete msg.listener;
		}

		ipcRenderer.send('rendererReq', msg);
	});
};


ipcRenderer.on('mainResp', (event, resp) => 
{
	var callbacks = reqInfo[resp.reqId];
	
	if (resp.error)
	{
		callbacks.error(resp.msg, resp.e);
	}
	else
	{
		callbacks.callback(resp.data);
	}
	
	delete reqInfo[resp.reqId];
});

ipcRenderer.on('fileChanged', (event, resp) => 
{
	var listener = fileChangedListeners[resp.path];
	
	if (listener)
	{
		listener(resp.curr, resp.prev);
	}
});

contextBridge.exposeInMainWorld(
    'electron', {
        request: (msg, callback, error) => 
		{
			msg.reqId = reqId++;
			reqInfo[msg.reqId] = {callback: callback, error: error};

			//TODO Maybe a special function for this better than this hack?
			//File watch special case where the callback is called multiple times
			if (msg.action == 'watchFile')
			{
				fileChangedListeners[msg.path] = msg.listener;
				delete msg.listener;
			}

			ipcRenderer.send('rendererReq', msg);
        },
		registerMsgListener: function(action, callback)
		{
			ipcRenderer.on(action, function(event, args)
			{
				callback(args);
			});
		},
		sendMessage: function(action, args)
		{
			ipcRenderer.send(action, args);
		},
		listenOnce: function(action, callback)
		{
			ipcRenderer.once(action, function(event, args)
			{
				callback(args);
			});
		},
		requestPromise: function(msg)
		{
			return requestPromise(msg);
		}
    }
);

contextBridge.exposeInMainWorld(
    'tclBridge', {
		exec: function(cmd, timeoutMs)
		{
			return requestPromise({
				action: 'tclExec',
				cmd: cmd,
				timeoutMs: timeoutMs
			});
		},
		reset: function()
		{
			return requestPromise({action: 'tclReset'});
		},
		stop: function()
		{
			return requestPromise({action: 'tclStop'});
		}
	}
);

contextBridge.exposeInMainWorld(
    'hdlBridge', {
		parse: function(payload)
		{
			return requestPromise({
				action: 'hdlParse',
				payload: payload || {}
			});
		}
	}
);

contextBridge.exposeInMainWorld(
    'process', {
		type: process.type,
		versions: process.versions
	}
);

// ---- Sidebar 文字一行一个：样式注入 ----
const SIDEBAR_CSS = `
/* 每个条目占满一行，去掉多余外边距与固定高度 */
.geSidebar .geItem,
.geSidebarContainer .geItem {
  float: none !important;
  display: block !important;
  width: 100% !important;
  margin: 0 !important;          /* 关键：清零外边距 */
  padding: 0 !important;         /* 关键：清零内边距（容器） */
  height: auto !important;       /* 关键：不固定高度 */
}

/* 文字项本身做轻量留白（可按需再减） */
.geSidebar .geTextItem {
  display: block !important;
  width: 100% !important;
  padding-left: 17px !important; /* 想完全贴边就改成 0 */
  line-height: 22px;             /* 原32px -> 22px，更紧凑 */
  padding: 2px 8px;              /* 原6/12 -> 2/8 */
  color: #000 !important;       /* 更深的文字颜色 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 如果还有缩略图类残留，一并隐藏 */
.geSidebar .geThumb,
.geSidebar .geIcon,
.geSidebar .geSprite,
.geSidebar .geItem img {
  display: none !important;
}

/* 条目之间的最小间距（想完全贴合就设为0） */
.geSidebar .geItem + .geItem .geTextItem {
  margin-top: 2px;
}
`;

// window.addEventListener('DOMContentLoaded', () => {
//     try {
//         const s = document.createElement('style');
//         s.id = 'sidebar-text-list';
//         s.textContent = SIDEBAR_CSS;
//         document.head.appendChild(s);

//         // 保险：一些布局逻辑会按列渲染，强制每行一个
//         if (window.Sidebar) {
//             try { Sidebar.prototype.thumbsPerRow = 1; } catch (e) { }
//         }
//     } catch (e) {
//         // 记录但不影响页面
//         console.warn('Inject sidebar CSS failed:', e);
//     }
// });
