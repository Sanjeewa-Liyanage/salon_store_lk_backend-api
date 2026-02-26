import { Controller, Get, Query } from '@nestjs/common';
import { PlaygroundService, RouteInfo } from './playground.service';

@Controller('playground')
export class PlaygroundController {
  constructor(private readonly playgroundService: PlaygroundService) {}

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
                
                $('#response').text(JSON.stringify(res.data, null, 2));
                $('#statusBadge').attr('class', 'badge badge-success').text(res.status + ' ' + res.statusText);
            } catch (err) {
                console.error(err);
                const resData = err.response ? err.response.data : err.message;
                $('#response').text(JSON.stringify(resData, null, 2));
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