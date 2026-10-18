const fs=require('fs'),path=require('path'),sharp=require('sharp');
async function main(){
 const root=path.resolve(__dirname,'../desktop/art/menu-clouds');fs.mkdirSync(root,{recursive:true});
 const texture=await sharp(path.join(root,'source.png')).resize(1024,256,{fit:'fill',kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});const initial=Buffer.from(texture.data);
 // Equal edge pixels avoid a visible seam when the scrolling strip wraps.
 for(let y=0;y<256;y++)for(let x=0;x<32;x++)for(let c=0;c<3;c++){const a=(y*1024+x)*4+c,b=(y*1024+1023-x)*4+c,average=(initial[a]+initial[b])/2,weight=(32-x)/32;texture.data[a]=Math.round(initial[a]*(1-weight)+average*weight);texture.data[b]=Math.round(initial[b]*(1-weight)+average*weight);}
 await sharp(texture.data,{raw:texture.info}).png().toFile(path.join(root,'clouds.png'));
 const {data,info}=await sharp(path.join(root,'foreground-extraction.png')).resize(1672,941,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const W=1304,H=941,out=Buffer.alloc(W*H*4);let skyPixels=0;for(let y=20;y<190;y++)for(let x=750;x<1250;x++){const alpha=data[(y*info.width+x)*4+3]<128?255:0;if(!alpha)continue;const i=(y*W+x)*4;out[i]=out[i+1]=out[i+2]=255;out[i+3]=alpha;skyPixels++;}
 if(skyPixels<10000)throw Error('Sky extraction mask is empty or incomplete');
 await sharp(out,{raw:{width:W,height:H,channels:4}}).png().toFile(path.join(root,'sky-mask.png'));
 fs.writeFileSync(path.join(root,'motion.json'),JSON.stringify({width:1304,height:941,speedPixelsPerSecond:5,skyBounds:{x:750,y:20,width:500,height:170},foregroundOcclusion:'Sky alpha extracted by image_gen; room, church, trees and window boards are excluded.',periodSeconds:148,edgeBlendPixels:32,rendering:'Continuous requestAnimationFrame, subpixel horizontal scroll'},null,2));console.log(JSON.stringify({skyPixels,cloudLayer:'ready',seam:'equal left/right edge pixels'}));
}
main().catch(e=>{console.error(e);process.exit(1)});
