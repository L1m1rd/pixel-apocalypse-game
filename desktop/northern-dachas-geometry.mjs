export function fencePlane(f,project,height=f.asset==='fence-plane-mesh'?30:f.asset==='gate-plane'?36:33){
 const dx=f.axis==='x'?f.length/2:0,dy=f.axis==='y'?f.length/2:0;
 const a=project(f.x-dx,f.y-dy),b=project(f.x+dx,f.y+dy);
 return {a,b,height,depth:Math.max(a.y,b.y)};
}

// Static world bins avoid scanning the full, densely dressed district each frame.
export function createSpatialIndex(rows,size=256){
 const bins=new Map();
 for(const row of rows){const key=Math.floor(row.x/size)+','+Math.floor(row.y/size);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(row);}
 return {query(x0,y0,x1,y1){
  const result=[];for(let y=Math.floor(y0/size);y<=Math.floor(y1/size);y++)for(let x=Math.floor(x0/size);x<=Math.floor(x1/size);x++)for(const row of bins.get(x+','+y)??[])if(row.x>=x0&&row.x<=x1&&row.y>=y0&&row.y<=y1)result.push(row);
  return result;
 }};
}
