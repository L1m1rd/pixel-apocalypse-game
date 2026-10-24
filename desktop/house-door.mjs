import {project} from './item-lab-movement.mjs';
import {villageDoor} from './village-world.mjs';

// The sprite and the collision opening share the same threshold in world space.
export function houseDoorGeometry(h,artWidth,artHeight,rect={x:.435,y:.65,w:.13,h:.23}){
 const threshold=project(villageDoor(h).x,villageDoor(h).y),center=project(h.x,h.y),width=h.visualW??240,height=width*artHeight/artWidth;
 return {x:center.x-width/2+rect.x*width,y:threshold.y+4-height+rect.y*height,w:rect.w*width,h:rect.h*height,depth:threshold.y+1,threshold};
}
