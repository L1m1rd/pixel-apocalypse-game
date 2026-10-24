import {project} from './item-lab-movement.mjs';
import {villageDoor} from './village-world.mjs';

// The sprite and the collision opening share the same threshold in world space.
export function housePlacement(h,artWidth,artHeight,rect){
 const threshold=project(villageDoor(h).x,villageDoor(h).y),width=h.visualW??240,height=width*artHeight/artWidth;
 return {x:threshold.x+width/2-(rect.x+rect.w/2)*width,y:threshold.y+height*(1-rect.y-rect.h),width,height,threshold};
}
export function houseDoorGeometry(h,artWidth,artHeight,rect={x:.435,y:.65,w:.13,h:.23},groundLevel=false){
 const threshold=project(villageDoor(h).x,villageDoor(h).y),center=project(h.x,h.y),width=h.visualW??240,height=width*artHeight/artWidth;
 const anchor=groundLevel?housePlacement(h,artWidth,artHeight,rect):{x:center.x,y:threshold.y+4};
 return {x:anchor.x-width/2+rect.x*width,y:anchor.y-height+rect.y*height,w:rect.w*width,h:rect.h*height,depth:threshold.y+1,threshold};
}
