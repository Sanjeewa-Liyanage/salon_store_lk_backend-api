import { Controller, Get, Header, Query } from '@nestjs/common';
import { PlaygroundService, RouteInfo } from './playground.service';

@Controller('playground')
export class PlaygroundController {
  constructor(private readonly playgroundService: PlaygroundService) {}

  @Get('socket')
  @Header('Content-Type', 'text/html')
  getSocketPlayground(): string {
    return this.generateSocketHtml();
  }

  private generateSocketHtml(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSocket Notification Tester</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: #0f0f1a;
            color: #e0e0e0;
            min-height: 100vh;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        h1 {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #a78bfa, #60a5fa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        .subtitle {
            color: #888;
            font-size: 14px;
            margin-bottom: 30px;
        }
        .card {
            background: #1a1a2e;
            border: 1px solid #2a2a4a;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
        }
        .card h3 {
            font-size: 16px;
            font-weight: 600;
            color: #c4b5fd;
            margin-bottom: 16px;
        }
        .form-row {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            align-items: flex-end;
        }
        .form-group {
            flex: 1;
        }
        .form-group label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #9ca3af;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        input, select {
            width: 100%;
            padding: 10px 14px;
            background: #0f0f1a;
            border: 1px solid #3a3a5a;
            border-radius: 8px;
            color: #e0e0e0;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #a78bfa;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-connect {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        .btn-connect:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .btn-disconnect {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }
        .btn-disconnect:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
        .btn-clear {
            background: #2a2a4a;
            color: #9ca3af;
        }
        .btn-clear:hover { background: #3a3a5a; }

        .status-bar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        .status-bar.disconnected { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
        .status-bar.connected { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #6ee7b7; }
        .status-dot {
            width: 10px; height: 10px;
            border-radius: 50%;
        }
        .status-dot.disconnected { background: #ef4444; }
        .status-dot.connected { background: #10b981; animation: pulse 2s infinite; }
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        }

        .log-area {
            background: #0a0a14;
            border: 1px solid #2a2a4a;
            border-radius: 8px;
            padding: 16px;
            min-height: 300px;
            max-height: 500px;
            overflow-y: auto;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 13px;
            line-height: 1.8;
        }
        .log-entry {
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 6px;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .log-entry.info { background: rgba(96, 165, 250, 0.1); border-left: 3px solid #60a5fa; }
        .log-entry.event { background: rgba(167, 139, 250, 0.1); border-left: 3px solid #a78bfa; }
        .log-entry.notification { background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; }
        .log-entry.error { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; }
        .log-time { color: #6b7280; font-size: 11px; margin-right: 8px; }
        .log-type { font-weight: 600; margin-right: 6px; }

        .actions-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .help-text {
            color: #6b7280;
            font-size: 12px;
            margin-top: 12px;
            line-height: 1.6;
        }
        .help-text code {
            background: #2a2a4a;
            padding: 2px 6px;
            border-radius: 4px;
            color: #a78bfa;
            font-size: 12px;
        }
        .events-list {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 8px;
        }
        .event-tag {
            background: rgba(167, 139, 250, 0.15);
            color: #c4b5fd;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 WebSocket Notification Tester</h1>
        <p class="subtitle">Connect as an Admin to receive real-time notifications from the server</p>

        <div id="statusBar" class="status-bar disconnected">
            <div id="statusDot" class="status-dot disconnected"></div>
            <span id="statusText">Disconnected</span>
        </div>

        <div class="card">
            <h3>Connection Settings</h3>
            <div class="form-row">
                <div class="form-group" style="flex: 2;">
                    <label>Server URL</label>
                    <input type="text" id="serverUrl" value="" placeholder="http://localhost:5000">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group" style="flex: 1;">
                    <label>JWT Access Token <span style="color:#6b7280; font-size:10px; text-transform:none;">(from /auth/login)</span></label>
                    <input type="text" id="token" placeholder="Paste your JWT access token here..." style="font-family: monospace; font-size: 12px;">
                </div>
            </div>
            <div class="actions-row">
                <button class="btn btn-connect" id="connectBtn" onclick="connectSocket()">Connect</button>
                <button class="btn btn-disconnect" id="disconnectBtn" onclick="disconnectSocket()" style="display:none;">Disconnect</button>
                <button class="btn btn-clear" onclick="window.open('/playground','_blank')" style="margin-left:auto;">Open API Playground</button>
            </div>
            <div class="help-text">
                <strong>How to test:</strong> Login via <code>POST /auth/login</code> in the API Playground, copy the <code>access_token</code>, paste it above, and click Connect.
                <br><br>
                <strong>Listening for events:</strong>
                <div class="events-list">
                    <span class="event-tag">salon-created</span>
                    <span class="event-tag">ad-created</span>
                    <span class="event-tag">user-registered</span>
                    <span class="event-tag">authenticated</span>
                    <span class="event-tag">error</span>
                    <span class="event-tag">All custom events</span>
                </div>
            </div>
        </div>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin-bottom: 0;">Event Log</h3>
                <button class="btn btn-clear" onclick="clearLog()">Clear Log</button>
            </div>
            <div class="log-area" id="logArea">
                <div class="log-entry info">
                    <span class="log-time">--:--:--</span>
                    <span class="log-type" style="color: #60a5fa;">SYSTEM</span>
                    Ready to connect. Set your server URL and click Connect.
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
    <script>
        let socket = null;

        // Auto-detect server URL
        (function() {
            const urlInput = document.getElementById('serverUrl');
            urlInput.value = window.location.origin;
        })();

        function getTimestamp() {
            return new Date().toLocaleTimeString('en-US', { hour12: false });
        }

        function addLog(type, label, message, data) {
            const logArea = document.getElementById('logArea');
            const entry = document.createElement('div');
            entry.className = 'log-entry ' + type;

            const colors = {
                info: '#60a5fa',
                event: '#c4b5fd',
                notification: '#6ee7b7',
                error: '#fca5a5'
            };

            let content = '<span class="log-time">' + getTimestamp() + '</span>';
            content += '<span class="log-type" style="color:' + (colors[type] || '#e0e0e0') + ';">' + label + '</span> ';
            content += message;

            if (data) {
                content += '<pre style="margin-top:6px; color:#9ca3af; font-size:12px; white-space:pre-wrap;">' + JSON.stringify(data, null, 2) + '</pre>';
            }

            entry.innerHTML = content;
            logArea.appendChild(entry);
            logArea.scrollTop = logArea.scrollHeight;
        }

        function setStatus(connected) {
            const bar = document.getElementById('statusBar');
            const dot = document.getElementById('statusDot');
            const text = document.getElementById('statusText');
            const connectBtn = document.getElementById('connectBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');

            if (connected) {
                bar.className = 'status-bar connected';
                dot.className = 'status-dot connected';
                text.textContent = 'Connected to ' + document.getElementById('serverUrl').value;
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'inline-block';
            } else {
                bar.className = 'status-bar disconnected';
                dot.className = 'status-dot disconnected';
                text.textContent = 'Disconnected';
                connectBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'none';
            }
        }

        function connectSocket() {
            const serverUrl = document.getElementById('serverUrl').value;
            const token = document.getElementById('token').value.trim();

            if (!serverUrl) { alert('Please enter a server URL'); return; }
            if (!token) { alert('Please enter a JWT access token. Login via /auth/login first.'); return; }

            addLog('info', 'CONNECTING', 'Connecting to ' + serverUrl + ' with JWT token...');

            try {
                socket = io(serverUrl, {
                    auth: { token: token },
                    transports: ['websocket', 'polling']
                });

                socket.on('connect', function() {
                    setStatus(true);
                    addLog('info', 'CONNECTED', 'Socket connected with ID: <strong>' + socket.id + '</strong>');
                });

                // Server confirms authentication with user details
                socket.on('authenticated', function(data) {
                    addLog('notification', '🔐 AUTHENTICATED', 'Verified as <strong>' + data.role + '</strong> (userId: ' + data.userId + ')', data);
                });

                socket.on('disconnect', function(reason) {
                    setStatus(false);
                    addLog('error', 'DISCONNECTED', 'Socket disconnected. Reason: ' + reason);
                });

                socket.on('connect_error', function(err) {
                    addLog('error', 'ERROR', 'Connection error: ' + err.message);
                });

                // Server sends auth error before disconnecting
                socket.on('error', function(data) {
                    addLog('error', '🚫 AUTH ERROR', data.message || 'Authentication failed', data);
                });

                // Listen for salon-created notifications
                socket.on('salon-created', function(data) {
                    addLog('notification', '🏪 SALON CREATED', data.message || 'New salon created!', data);
                });

                // Listen for generic events - catch-all
                socket.onAny(function(eventName, data) {
                    if (['salon-created', 'authenticated', 'error'].includes(eventName)) return;
                    addLog('event', '📡 ' + eventName.toUpperCase(), 'Received event', data);
                });

            } catch (err) {
                addLog('error', 'ERROR', 'Failed to connect: ' + err.message);
            }
        }

        function disconnectSocket() {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            setStatus(false);
        }

        function clearLog() {
            document.getElementById('logArea').innerHTML = '';
            addLog('info', 'SYSTEM', 'Log cleared.');
        }
    </script>
</body>
</html>
    `;
  }

  @Get()
  getPlayground(
    @Query('url') url?: string,
    @Query('method') method?: string,
    @Query('data') data?: string,
    @Query('headers') headers?: string,
  ): string {
    const routes = this.playgroundService.getRoutes();
    // Sort routes for better UI
    routes.sort((a, b) => a.path.localeCompare(b.path));
    
    return this.generateHtml(routes, url, method, data, headers);
  }

  private generateHtml(routes: RouteInfo[], initialUrl?: string, initialMethod?: string, initialData?: string, initialHeaders?: string): string {
    // We inject the discovered routes into a JavaScript variable inside the HTML
    const routesJson = JSON.stringify(routes);
    const safeInitialUrl = JSON.stringify(initialUrl || '');
    const safeInitialMethod = JSON.stringify(initialMethod || '');
    // If data comes in as a query param, it might look like a string. Ideally we keep it as string.
    const safeInitialData = JSON.stringify(initialData || '');
    const safeInitialHeaders = JSON.stringify(initialHeaders || '');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebWizards API Tester</title>
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .api-tester { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .response { margin-top: 40px; }
        .response pre { background-color: #fff; padding: 20px; border-radius: 5px; font-size: 14px; max-height: 500px; overflow-y: auto; }
        .endpoint-meta { font-size: 11px; color: #666; margin-left: 10px; }
        .method-badge { width: 60px; display: inline-block; text-align: center; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container mt-5 api-tester">
        <h2>WebWizards API Tester</h2>
        <div class="row">
            <div class="col-md-6">
                <div class="api-tester">
                    <h4>Request</h4>
                    <div class="form-group">
                        <label for="endpointSelect">Select Endpoint:</label>
                        <select class="form-control" id="endpointSelect" onchange="loadEndpoint()">
                            <option value="">-- Select an Endpoint --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="url">URL: <small class="text-muted">(Edit to replace :id with actual values)</small></label>
                        <input type="text" class="form-control" id="url" oninput="generateAxiosCode()">
                    </div>

                    <div class="form-group">
                        <label for="method">Method:</label>
                        <input type="text" class="form-control" id="method" readonly style="font-weight:bold; width: 100px;">
                    </div>

                    <div class="form-group">
                        <label for="data">Body (JSON):</label>
                        <textarea class="form-control" id="data" rows="6" placeholder='{"key": "value"}' oninput="generateAxiosCode()"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="headers">Headers (JSON):</label>
                        <textarea class="form-control" id="headers" rows="6" oninput="generateAxiosCode()">{
    "Authorization": "Bearer YOUR_DEFAULT_TOKEN"
}</textarea>
                    </div>

                    <div class="form-group">
                        <button type="button" class="btn btn-primary" onclick="sendRequest()">Send Request</button>
                        <button type="button" class="btn btn-success" onclick="generateOpenAPISpecs()">Download OpenAPI Spec</button>
                        <button type="button" class="btn btn-info" onclick="shareRequest()">Share Request</button>
                    </div>

                    <hr>
                    <div class="axios-code">
                        <h6>Axios Code Snippet:</h6>
                        <pre id="axiosCode" style="font-size: 10px;"></pre>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="response">
                    <h4>Response <span id="statusBadge" class="badge"></span></h4>
                    <pre id="response">Waiting for request...</pre>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.2/axios.min.js"></script>
    <script>
        // INJECTED FROM SERVER
        const endpoints = ${routesJson};
        const initialUrl = ${safeInitialUrl};
        const initialMethod = ${safeInitialMethod};
        const initialData = ${safeInitialData};
        const initialHeaders = ${safeInitialHeaders};

        $(document).ready(function() {
            const select = $('#endpointSelect');
            endpoints.forEach((ep, index) => {
                const label = '[' + ep.method + '] ' + ep.path;
                select.append(new Option(label, index));
            });

            // Pre-fill from query params if present
            if(initialUrl) $('#url').val(initialUrl);
            if(initialMethod) $('#method').val(initialMethod);
            if(initialData) $('#data').val(initialData);
            if(initialHeaders) $('#headers').val(initialHeaders);

            // Also try to select the dropdown if it matches
            if(initialUrl && initialMethod) {
                const foundIndex = endpoints.findIndex(ep => ep.path === initialUrl && ep.method === initialMethod);
                if(foundIndex >= 0) {
                    $('#endpointSelect').val(foundIndex);
                }
            }
            
            if(initialUrl) generateAxiosCode();
        });

        function loadEndpoint() {
            const index = $('#endpointSelect').val();
            if(index === "") {
                $('#url').val('');
                $('#method').val('');
                return;
            }
            const ep = endpoints[index];
            $('#url').val(ep.path);
            $('#method').val(ep.method);
            generateAxiosCode();
        }

        async function sendRequest() {
            const url = $('#url').val();
            const method = $('#method').val();
            let data = $('#data').val();
            let headers = $('#headers').val();

            try { headers = headers ? JSON.parse(headers) : {}; } catch(e) { alert('Invalid Headers JSON'); return; }
            try { data = data ? JSON.parse(data) : {}; } catch(e) { alert('Invalid Body JSON'); return; }

            $('#response').text('Loading...');
            $('#statusBadge').attr('class', 'badge badge-secondary').text('...');

            try {
                const res = await axios({
                    url: url,
                    method: method.toLowerCase(),
                    headers: headers,
                    data: (method === 'GET' || method === 'HEAD') ? undefined : data,
                    params: (method === 'GET') ? data : undefined
                });

                const contentType = (res.headers && res.headers['content-type']) || '';
                if (typeof res.data === 'string') {
                    if (contentType.includes('application/json')) {
                        try {
                            $('#response').text(JSON.stringify(JSON.parse(res.data), null, 2));
                        } catch {
                            $('#response').text(res.data);
                        }
                    } else {
                        $('#response').text(res.data);
                    }
                } else {
                    $('#response').text(JSON.stringify(res.data, null, 2));
                }

                $('#statusBadge').attr('class', 'badge badge-success').text(res.status + ' ' + res.statusText);
            } catch (err) {
                console.error(err);
                const resData = err.response ? err.response.data : err.message;
                if (typeof resData === 'string') {
                    $('#response').text(resData);
                } else {
                    $('#response').text(JSON.stringify(resData, null, 2));
                }
                 $('#statusBadge').attr('class', 'badge badge-danger').text(err.response ? err.response.status : 'Error');
            }
            generateAxiosCode();
        }

        function generateAxiosCode() {
            const url = $('#url').val();
            const method = $('#method').val();
            let dataStr = $('#data').val() || '{}';
            let headersStr = $('#headers').val() || '{}';
            
            let code = \`
try {
  const response = await axios({
    url: '\${url}',
    method: '\${method}',
    headers: \${headersStr},
    data: \${dataStr}
  });
  console.log(response.data);
} catch (error) {
  console.error(error);
}\`;
            $('#axiosCode').text(code);
        }

        function shareRequest() {
            const url = $('#url').val();
            const method = $('#method').val();
            const data = $('#data').val();
            const headers = $('#headers').val();
            
            const currentUrl = new URL(window.location.href.split('?')[0]); 
            
            if(url) currentUrl.searchParams.set('url', url);
            if(method) currentUrl.searchParams.set('method', method);
            if(data) currentUrl.searchParams.set('data', data);
            if(headers) currentUrl.searchParams.set('headers', headers);
            
            const shareableLink = currentUrl.toString();
            
            // Copy to clipboard
            navigator.clipboard.writeText(shareableLink).then(function() {
                alert('Shareable link copied to clipboard:\\n' + shareableLink);
            }, function(err) {
                console.error('Async: Could not copy text: ', err);
                prompt("Copy this link:", shareableLink);
            });
        }

        function generateOpenAPISpecs() {
            const specs = {
                openapi: '3.0.0',
                info: { title: 'SalonStore API', version: '1.0.0' },
                paths: {}
            };

            endpoints.forEach(ep => {
                if (!specs.paths[ep.path]) specs.paths[ep.path] = {};
                
                specs.paths[ep.path][ep.method.toLowerCase()] = {
                    summary: 'Handler: ' + ep.controller + '.' + ep.handler,
                    responses: {
                        '200': { description: 'Successful response' }
                    }
                };
            });

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(specs, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", "openapi.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
    </script>
</body>
</html>
    `;
  }
}