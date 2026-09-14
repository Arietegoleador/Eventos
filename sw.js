const CACHE="apuntes-v3";

const ASSETS=[
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE).then(async cache=>{
      for(const url of ASSETS){
        const response=await fetch(url,{cache:"no-store"});
        if(response.ok) await cache.put(url,response);
      }
    }).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;

  const url=new URL(event.request.url);
  const isAppAsset =
    url.origin===self.location.origin &&
    ["index.html","styles.css","app.js","manifest.json","icon-192.png","icon-512.png"].some(name=>url.pathname.endsWith("/"+name));

  if(!isAppAsset) return;

  event.respondWith(
    fetch(event.request,{cache:"no-store"})
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
