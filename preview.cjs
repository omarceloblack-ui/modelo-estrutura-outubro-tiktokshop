const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.ttf':'font/ttf','.svg':'image/svg+xml','.json':'application/json'};
const workerPromise=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,'_worker.js'))).toString('base64'));
http.createServer(async(req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 if(pathname.startsWith('/api/')){const w=await workerPromise;const response=await w.default.fetch(new Request('http://localhost:4173'+req.url,{method:req.method}),{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
 if(['/pagamento','/rastreio','/admin'].includes(pathname))pathname+='.html';
 if(pathname.split('/').some(x=>x.startsWith('_')||x.startsWith('.'))){res.writeHead(404);res.end();return;}
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);res.end('Arquivo não encontrado');return;}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};
  if(req.headers.range){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range);if(!m){res.writeHead(416);res.end();return;}const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416);res.end();return;}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`});fs.createReadStream(file,{start,end}).pipe(res);}
  else{res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res);}
 });
}).listen(Number(process.env.PORT||4175),'127.0.0.1',()=>console.log('Local: http://127.0.0.1:' + (process.env.PORT||4175) + ''));
