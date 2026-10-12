// ZIP STORE writer/validator (CRC32, central directory, UTF-8 names), no dependency.
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function makeZip(files){
 const local=[],central=[];let offset=0;
 for(const [name,value] of Object.entries(files)){
  if(!/^[\w.-]+$/.test(name))throw Error('Unsafe ZIP entry name');
  const filename=Buffer.from(name),data=Buffer.from(value),crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(filename.length,26);
  local.push(h,filename,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);central.push(c,filename);offset+=h.length+filename.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(local.length/3,8);end.writeUInt16LE(local.length/3,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);
}
export function inspectZip(buffer){
 const b=Buffer.from(buffer),files=[];let i=0;
 while(i+30<=b.length&&b.readUInt32LE(i)===0x04034b50){const size=b.readUInt32LE(i+18),nameLength=b.readUInt16LE(i+26),extra=b.readUInt16LE(i+28),start=i+30+nameLength+extra,name=b.subarray(i+30,i+30+nameLength).toString(),data=b.subarray(start,start+size);if(data.length!==size||crc32(data)!==b.readUInt32LE(i+14))throw Error('ZIP CRC/length mismatch');files.push({name,size,data});i=start+size;}
 if(!files.length||b.readUInt32LE(b.length-22)!==0x06054b50||b.readUInt16LE(b.length-12)!==files.length)throw Error('Invalid ZIP directory');return files;
}
