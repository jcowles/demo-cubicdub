
Lab.Geom = Lab.Geom || {};

Lab.Geom.makeQuad2D = function(gl) {
    var verts = new Float32Array([  // first tri:
                                    -1., -1., // bottom left
                                     1., -1., // bottom right
                                    -1.,  1., // top left
                                    // second tri:
                                     1., -1., // bottom right
                                     1.,  1., // top right
                                    -1.,  1.  // top left
                                    ]);
    var buff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buff);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    buff.itemSize = 2;
    buff.length = verts.length / 2;
    return buff;
};

Lab.Geom.Cubes = function() {
    this.points  = new Array();
    this.normals = new Array();
    this.colors  = new Array();
    this.uvs     = new Array();
    this.all     = new Array();
    this.buff    = null;
    this.primCount = 0;

    this._uvs = [
        // two triangles worth of UVs
        // lower left
        0.0, 0.0,

        // lower right
        1.0, 0.0,

        // upper left
        0.0, 1.0,

        // lower right
        1.0, 0.0,

        // upper right
        1.0, 1.0,

        // upper left
        0.0, 1.0,
    ];

    this._norms = [
        // front
         0.0,  0.0,  1.0,

        // back
         0.0,  0.0, -1.0,
        
        // top
         0.0,  1.0,  0.0,

        // bottom
         0.0, -1.0,  0.0,

        // left
        -1.0,  0.0,  0.0,

        // right
         1.0,  0.0,  0.0,

    ];

    this._faces = [
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        
        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,
        
        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,
        
        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        
        // Right face
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,
        
        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0
      ];

    this._faceIdx = [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23    // left
    ];

    this.init = function(gl) {
	if (this.buff) gl.deleteBuffer(this.buff);
        this.buff = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.buff);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.all), gl.STATIC_DRAW); 
	//gl.bufferData(gl.ARRAY_BUFFER,
        //              new Float32Array(this.points.concat(this.normals, 
        //                                                  this.colors,
        //                                                  this.uvs)), 
        //                               gl.STATIC_DRAW);
        this.buff.itemSize = 3;
	this.buff.length = this.points.length/3;
        this.buff.normStart = this.points.length;
        this.buff.colorStart = this.points.length+this.normals.length;
        this.buff.uvStart = this.buff.colorStart + this.colors.length;
	//delete this.points;
    };

    this.draw = function(gl, prog) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buff);
        //                     id           elem size           type      norm   stride offset

        var size = (3+3+4+2) * 4;
        if ('vertex' in prog) {
            gl.vertexAttribPointer(prog.vertex, this.buff.itemSize, gl.FLOAT, false, size, 0);
            //gl.vertexAttribPointer(prog.vertex, this.buff.itemSize, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(prog.vertex);
        }
        
        if ('normal' in prog){
            gl.vertexAttribPointer(prog.normal, this.buff.itemSize, gl.FLOAT, false, size, 3*4);
            //gl.vertexAttribPointer(prog.normal, this.buff.itemSize, gl.FLOAT, false, 0, 4*this.buff.normStart);
            gl.enableVertexAttribArray(prog.normal);
        }

        if ('color' in prog) {
            gl.vertexAttribPointer(prog.color, this.buff.itemSize+1, gl.FLOAT, false, size, (3+3)*4);
            //gl.vertexAttribPointer(prog.color, this.buff.itemSize+1, gl.FLOAT, false, 0, 4*this.buff.colorStart);
            gl.enableVertexAttribArray(prog.color);
        }

        if ('uv' in prog){
            gl.vertexAttribPointer(prog.uv, this.buff.itemSize-1, gl.FLOAT, false, size, (3+3+4)*4);
            //gl.vertexAttribPointer(prog.uv, this.buff.itemSize-1, gl.FLOAT, false, 0, 4*this.buff.uvStart);
            gl.enableVertexAttribArray(prog.uv);
        }

        gl.drawArrays(gl.TRIANGLES, 0, this.primCount);
        //gl.drawArrays(gl.TRIANGLES, 0, this.buff.length);
    };

    this.push = function(x, y, z, size, maxX, maxY) {
        // the x,y coords dictate the pseudo screen space location
                //console.log(""+x+","+y+","+maxX+","+maxY+","+(x/maxX)+","+(y/maxY));

        // loop over each face
        for (var face = 0; face < 6; face++) {
            // for each face, build up two triangles
            // all points on each triangle have the same normal
            for (var i = 0; i < 6; i++) {
                this.primCount++;
                // points: 3 floats
                this.all.push((this._faces[this._faceIdx[face*6+i]*3])*size+x);
                //this.points.push((this._faces[this._faceIdx[face*6+i]*3])*size+x);
                this.all.push((this._faces[this._faceIdx[face*6+i]*3+1])*size+y);
                //this.points.push((this._faces[this._faceIdx[face*6+i]*3+1])*size+y);
                this.all.push((this._faces[this._faceIdx[face*6+i]*3+2])*size+z);
                //this.points.push((this._faces[this._faceIdx[face*6+i]*3+2])*size+z);
                
                // normals: 3 floats
                this.all.push(this._norms[face*3]);
                //this.normals.push(this._norms[face*3]);
                this.all.push(this._norms[face*3+1]);
                //this.normals.push(this._norms[face*3+1]);
                this.all.push(this._norms[face*3+2]);
                //this.normals.push(this._norms[face*3+2]);

                // colors: 4 floats
                this.all.push(0);
                //this.colors.push(0);
                this.all.push(0.45);
                //this.colors.push(0.45);
                this.all.push(1);
                //this.colors.push(1);
                this.all.push(1);
                //this.colors.push(1);
    
                // UVs: 2 floats
                // for now, use pseudo-screen UV's only
                // but for generalized animation, we need something better(?)
                this.all.push(x / (maxX-1));
                //this.uvs.push(x / (maxX-1));
                this.all.push(y / (maxY-1));
                //this.uvs.push(y / (maxY-1));
                
                // straight uv mapping per face
                //this.uvs.push(this._uvs[i*2]);
                //this.uvs.push(this._uvs[i*2+1]);
            }
        }
    };
};



Lab.Geom.Lines = function() {
    this.points = new Array();
    this.buff = null;

    this.init = function(gl) {
	if (this.buff) gl.deleteBuffer(this.buff);
        this.buff = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.buff);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.points), gl.STATIC_DRAW);
        this.buff.itemSize = 3;
	this.buff.length = this.points.length / 3 ;
	//delete this.points;
    };

    this.draw = function(gl, prog) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buff);
	gl.vertexAttribPointer(prog.vertex, this.buff.itemSize, gl.FLOAT, false, 0, 0);
        gl.vertexAttribPointer(prog.normal, this.buff.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, this.buff.length);
    };

    this.push = function(x1, z1, x2, z2, y) {
        this.points.push(x1);
        this.points.push(y);
        this.points.push(z1);

        this.points.push(x2);
        this.points.push(y);
        this.points.push(z2);
    };
};



