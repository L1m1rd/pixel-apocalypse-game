// Input and animation directions use screen axes. Positions use isometric world axes.
let mode='isometric';export function setProjectionMode(value){mode=value==='orthographic'?'orthographic':'isometric';}export const project=(x,y)=>mode==='orthographic'?{x,y}:({x:(x-y)*.9,y:(x+y)*.55});
export const unproject=(x,y)=>mode==='orthographic'?{x,y}:({x:x/1.8+y/1.1,y:y/1.1-x/1.8});
export function moveOnLab(p,screenDx,screenDy){const d=unproject(screenDx,screenDy);return {x:p.x+d.x,y:p.y+d.y};}
