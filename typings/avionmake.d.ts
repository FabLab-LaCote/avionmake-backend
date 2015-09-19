/*

This file is part of avionmake.

Copyright (C) 2015  Boris Fritscher

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, see http://www.gnu.org/licenses/.

*/

interface PlaneTemplateMap{
	[index: string]: Part[];
}

interface IPlane{
	_id:string;
	type:string;
	parts:Part[];
	printState:number;
	lastModified:Date;
	name:string;
	disabled:boolean;
    info:{
      email:string,
      pcode:string,
      newsletter:boolean,
      emailSent:Date
    }
}

interface Part{
	name: string;
	path: string;
	width: number;
	height: number;
	position2D?: {
	    x: number,
	    y: number
	};
	position3D?: {
	    x: number,
	    y: number,
	    z: number
	};
	rotation3D?: {
	    x: number,
	    y: number,
	    z: number
	};
	textureBitmap?:string
	textureTop?:boolean;
	textureBottom?:boolean;
	textureFlipY?:boolean;
	decals?:Decal[];
	drawTexture?:boolean;
}
interface Decal{
	x:number;
	y:number;
	angle:number;
	text?:string;
	size?:number;
	path?:string;
	locked?:string;
}
